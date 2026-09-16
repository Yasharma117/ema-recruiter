import type { Candidate, CellOverride, Criterion, CriterionScore } from './types';

export type Band = 'good' | 'potential' | 'no-match';

/** Required criteria count double. Recruiter weight (1–5) multiplies on top. */
const TYPE_MULT = { required: 2, preferred: 1 } as const;

/** A required criterion scoring at or below this caps the composite. */
export const GATE_THRESHOLD = 2;
/** The cap itself — top of the "Not a match" band, so a gated candidate always reads as one. */
export const GATE_CAP = 2.9;
/** Below this share of criteria scored, the composite renders with a tilde. */
export const LOW_COVERAGE = 0.6;

export function effectiveScore(cs: CriterionScore): number | null {
  return cs.override ? cs.override.score : cs.score;
}

/**
 * Lay the human-judgement layer over machine scores. Kept separate from the
 * candidate so a re-run re-applies it rather than losing it — correcting the
 * same fact twice is worse than not being able to correct it at all.
 */
export function applyOverrides(candidates: Candidate[], overrides: CellOverride[]): Candidate[] {
  if (!overrides.length) return candidates;
  const byCandidate = new Map<string, CellOverride[]>();
  for (const o of overrides) {
    byCandidate.set(o.candidateId, [...(byCandidate.get(o.candidateId) ?? []), o]);
  }
  return candidates.map((c) => {
    const mine = byCandidate.get(c.id);
    if (!mine) return c;
    return {
      ...c,
      scores: c.scores.map((cs) => {
        const o = mine.find((x) => x.criterionId === cs.criterionId);
        if (!o || o.score === null) return cs;
        return {
          ...cs,
          override: { score: o.score, by: o.by, at: o.at, original: o.originalScore, via: o.via },
          confidence: 'high' as const,
          summary: o.quote ? `“${o.quote}”` : cs.summary,
          evidence: o.via === 'reply' && o.quote
            ? [{ kind: 'work' as const, source: `Answered by ${o.by}`, when: o.at, quote: o.quote }, ...cs.evidence]
            : cs.evidence,
        };
      }),
    };
  });
}

export function bandOf(value: number): Band {
  if (value >= 4) return 'good';
  if (value >= 3) return 'potential';
  return 'no-match';
}

/** 1–5 per-criterion chips use the same colour vocabulary as the composite. */
export function bandOfCriterion(score: number | null): Band | null {
  if (score === null) return null;
  if (score >= 4) return 'good';
  if (score === 3) return 'potential';
  return 'no-match';
}

export const BAND_LABEL: Record<Band, string> = {
  good: 'Good match',
  potential: 'Potential fit',
  'no-match': 'Not a match',
};

export interface Ranking {
  /** Displayed composite, after any required-gate cap. */
  value: number;
  /** Composite before the cap — what the candidate would score on merit alone. */
  raw: number;
  band: Band;
  /** Criteria with a score, over total criteria. */
  scored: number;
  total: number;
  coverage: number;
  lowCoverage: boolean;
  /** A required criterion scored at or below the gate threshold. */
  gateFailed: boolean;
  gateReason?: string;
  /** Gate tripped but the recruiter lifted the cap. */
  gateOverridden: boolean;
  lowConfidenceCount: number;
  overriddenCount: number;
}

export function rank(candidate: Candidate, criteria: Criterion[]): Ranking {
  let weighted = 0;
  let weightSum = 0;
  let scored = 0;
  let lowConfidenceCount = 0;
  let overriddenCount = 0;
  let gateFailed = false;
  let gateReason: string | undefined;

  for (const criterion of criteria) {
    const cs = candidate.scores.find((s) => s.criterionId === criterion.id);
    if (!cs) continue;

    if (cs.override) overriddenCount++;
    const score = effectiveScore(cs);

    // A missing signal is not a negative signal: unscored criteria leave the
    // denominator alone and are paid for in coverage instead.
    if (score === null) continue;

    if (cs.confidence === 'low') lowConfidenceCount++;
    scored++;

    const w = criterion.weight * TYPE_MULT[criterion.type];
    weighted += w * score;
    weightSum += w;

    if (criterion.type === 'required' && score <= GATE_THRESHOLD && !gateFailed) {
      gateFailed = true;
      gateReason = `Fails required: ${criterion.name} (${score})`;
    }
  }

  const raw = weightSum > 0 ? weighted / weightSum : 0;
  const gateOverridden = gateFailed && !!candidate.gateOverridden;
  // Cap rather than exclude: a filtered-out candidate hides Ema's extraction
  // errors, and leaves nowhere to hang the override.
  const value = gateFailed && !gateOverridden ? Math.min(raw, GATE_CAP) : raw;

  const total = criteria.length;
  const coverage = total > 0 ? scored / total : 0;

  return {
    value,
    raw,
    band: bandOf(value),
    scored,
    total,
    coverage,
    lowCoverage: coverage < LOW_COVERAGE,
    gateFailed,
    gateReason,
    gateOverridden,
    lowConfidenceCount,
    overriddenCount,
  };
}

export function formatScore(r: Ranking): string {
  // The tilde is the honest marker for "this number rests on very little".
  return `${r.lowCoverage ? '~' : ''}${r.value.toFixed(1)}`;
}

/**
 * The ≤72-char clause under every score. Names the best and worst scored
 * criterion so each row says *why*, not just *how much*.
 */
export function reasonClause(candidate: Candidate, criteria: Criterion[]): string {
  const r = rank(candidate, criteria);
  // A failed gate is the only thing worth saying about a row until it's lifted.
  if (r.gateFailed && !r.gateOverridden) return r.gateReason!;

  const scored = criteria
    .map((c) => ({ c, cs: candidate.scores.find((s) => s.criterionId === c.id) }))
    .filter((x): x is { c: Criterion; cs: CriterionScore } => !!x.cs && effectiveScore(x.cs) !== null)
    .map((x) => ({ ...x, v: effectiveScore(x.cs)! }));

  if (!scored.length) return 'Not enough evidence to score';

  const best = scored.reduce((a, b) => (b.v > a.v ? b : a));
  const worst = scored.reduce((a, b) => (b.v < a.v ? b : a));

  const strong = `Strong: ${best.cs.summary}`;
  if (worst.v >= 4 || worst.c.id === best.c.id) return truncate(strong, 72);
  return truncate(`${strong} · Gap: ${worst.cs.summary}`, 72);
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…';
}

export interface Ranked {
  candidate: Candidate;
  ranking: Ranking;
}

export function rankAll(candidates: Candidate[], criteria: Criterion[]): Ranked[] {
  return candidates
    .map((candidate) => ({ candidate, ranking: rank(candidate, criteria) }))
    .sort((a, b) => {
      if (b.ranking.value !== a.ranking.value) return b.ranking.value - a.ranking.value;
      // Ties: better-evidenced first, then fresher. Neither costs points —
      // they only decide who wins a tie.
      if (b.ranking.coverage !== a.ranking.coverage) return b.ranking.coverage - a.ranking.coverage;
      return a.candidate.profileAgeMonths - b.candidate.profileAgeMonths;
    });
}

/**
 * Each criterion's share of the composite, as whole percentages that sum to
 * exactly 100. Uses largest-remainder apportionment — naive rounding gives
 * 32+32+11+11+5+11 = 102, and a readout that claims to total 100 must.
 */
export function weightShares(criteria: Criterion[]): Record<string, number> {
  const weighted = criteria.map((c) => ({
    id: c.id,
    w: c.weight * TYPE_MULT[c.type],
  }));
  const total = weighted.reduce((n, x) => n + x.w, 0);
  if (!total) return Object.fromEntries(criteria.map((c) => [c.id, 0]));

  const exact = weighted.map((x) => ({ id: x.id, v: (x.w / total) * 100 }));
  const out: Record<string, number> = {};
  let assigned = 0;
  for (const e of exact) {
    out[e.id] = Math.floor(e.v);
    assigned += out[e.id];
  }
  // Hand the leftover points to the largest fractional parts.
  const order = [...exact]
    .map((e) => ({ id: e.id, frac: e.v - Math.floor(e.v) }))
    .sort((a, b) => b.frac - a.frac);
  let leftover = 100 - assigned;
  for (let i = 0; leftover > 0; i = (i + 1) % order.length, leftover--) {
    out[order[i].id] += 1;
  }
  return out;
}

/** How many candidates change band under a proposed scorecard — the live re-weight preview. */
export function bandChangeCount(
  candidates: Candidate[],
  before: Criterion[],
  after: Criterion[],
): number {
  let n = 0;
  for (const c of candidates) {
    if (rank(c, before).band !== rank(c, after).band) n++;
  }
  return n;
}

/**
 * Free-text candidate lookup.
 *
 * Filters narrow structurally; they cannot answer "where is Kavya?". This is
 * the name-shaped question, so it matches the fields someone actually recalls:
 * who they are, where they work, what they do, where they live. Every term must
 * match something, so "kavya stripe" narrows rather than widens.
 */
export function matchesQuery(c: Candidate, q: string): boolean {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const hay = `${c.name} ${c.company} ${c.title} ${c.location}`.toLowerCase();
  return terms.every((t) => hay.includes(t));
}
