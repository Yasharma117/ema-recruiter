import React from 'react';
import { Sparkle, Warning, GithubLogo, Article, Briefcase, Lock, User, Question, Check } from '@phosphor-icons/react';
import type { Candidate, Criterion, CriterionScore, Evidence } from '../lib/types';
import { bandOfCriterion, effectiveScore, formatScore, rank, type Band, type Ranking } from '../lib/scoring';
import { Tooltip, cx } from './ui';

export const BAND_TEXT: Record<Band, string> = {
  good: 'text-[var(--success-text)]',
  potential: 'text-[var(--pending-text)]',
  'no-match': 'text-[var(--muted-text)]',
};

const BAND_PILL: Record<Band, string> = {
  good: 'bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success-text)]',
  potential: 'bg-[var(--pending-bg)] border-[var(--pending-border)] text-[var(--pending-text)]',
  'no-match': 'bg-[var(--muted-bg)] border-[var(--muted-border)] text-[var(--muted-text)]',
};

const BAND_BAR: Record<Band, string> = {
  good: 'bg-[var(--success)]',
  potential: 'bg-[var(--yellow-600)]',
  'no-match': 'bg-[var(--gray-500)]',
};

/** The composite, band-coloured. Tilde marks low coverage. */
export function ScorePill({ ranking, size = 'md' }: { ranking: Ranking; size?: 'sm' | 'md' }) {
  return (
    <span className={cx(
      'inline-flex items-center justify-center border rounded-sm font-bold tabular-nums',
      size === 'sm' ? 'h-5 px-1.5 text-xs' : 'h-6 px-2 text-sm',
      BAND_PILL[ranking.band],
    )}>
      {formatScore(ranking)}
    </span>
  );
}

/**
 * One segment per criterion, required first, band-coloured; unscored renders as
 * a hairline. A ~32px glyph you can scan forty rows of.
 */
export function Sparkbar({ candidate, criteria }: { candidate: Candidate; criteria: Criterion[] }) {
  const ordered = [...criteria].sort((a, b) => (a.type === b.type ? 0 : a.type === 'required' ? -1 : 1));
  return (
    <span className="inline-flex items-end gap-[2px] h-3.5" aria-hidden>
      {ordered.map((c) => {
        const cs = candidate.scores.find((s) => s.criterionId === c.id);
        const v = cs ? effectiveScore(cs) : null;
        const band = bandOfCriterion(v);
        if (v === null || band === null) {
          return <span key={c.id} className="w-1 h-px bg-[var(--beige-500)] self-center" />;
        }
        return (
          <span
            key={c.id}
            className={cx('w-1 rounded-[1px]', BAND_BAR[band], cs?.confidence === 'low' && 'opacity-50')}
            style={{ height: `${(v / 5) * 14}px` }}
          />
        );
      })}
    </span>
  );
}

function Dots({ score }: { score: number }) {
  return (
    <span className="inline-flex gap-[3px]" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cx('size-[5px] rounded-full', i <= score ? 'bg-[var(--fg2)]' : 'bg-[var(--beige-500)]')} />
      ))}
    </span>
  );
}

/** Tier 2: the hover breakdown. One line per criterion, no links. */
export function ScoreBreakdown({ candidate, criteria }: { candidate: Candidate; criteria: Criterion[] }) {
  const r = rank(candidate, criteria);
  const ordered = [...criteria].sort((a, b) => (a.type === b.type ? 0 : a.type === 'required' ? -1 : 1));
  return (
    <div className="w-[320px]">
      {ordered.map((c) => {
        const cs = candidate.scores.find((s) => s.criterionId === c.id);
        const v = cs ? effectiveScore(cs) : null;
        return (
          <div key={c.id} className="flex items-baseline gap-2 py-[3px]">
            <span className="w-[112px] shrink-0 truncate text-[var(--fg2)]">{c.name}</span>
            <span className="w-[34px] shrink-0">{v !== null ? <Dots score={v} /> : <span className="text-[var(--beige-700)]">——</span>}</span>
            <span className={cx('w-3 shrink-0 tabular-nums font-bold', v !== null ? BAND_TEXT[bandOfCriterion(v)!] : 'text-[var(--fg3)]')}>
              {v ?? '—'}
            </span>
            <span className="flex-1 min-w-0 truncate text-[var(--fg3)]">{cs?.summary ?? 'Not enough evidence'}</span>
            {c.type === 'required' && <span className="text-[10px] uppercase tracking-wide text-[var(--fg3)] shrink-0">Req</span>}
          </div>
        );
      })}
      <div className="mt-2 pt-2 border-t border-[var(--beige-300)] text-[var(--fg3)]">
        Scored on {r.scored} of {r.total} criteria
        {r.lowConfidenceCount > 0 && ` · ${r.lowConfidenceCount} low confidence`}
      </div>
    </div>
  );
}

/** Tier 1: what sits in the table cell. Pill + sparkbar + coverage + reason. */
/**
 * The score, as a table cell: band pill, per-criterion sparkbar, coverage.
 *
 * The "why" clause used to live here too, and truncated mid-word every time.
 * It now has its own column, so this cell keeps the two lines a recruiter
 * actually scans down: the number, and how much of it is evidence-backed.
 */
export function ScoreCell({
  candidate, criteria,
}: { candidate: Candidate; criteria: Criterion[] }) {
  const r = rank(candidate, criteria);
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <Tooltip content={<ScoreBreakdown candidate={candidate} criteria={criteria} />} width={344} side="bottom">
          <ScorePill ranking={r} />
        </Tooltip>
        <Sparkbar candidate={candidate} criteria={criteria} />
      </div>
      <div className={cx(
        'text-xs tabular-nums mt-1 leading-4',
        r.lowCoverage ? 'text-[var(--warning-text)]' : 'text-[var(--fg3)]',
      )}>
        {r.scored} of {r.total} scored
      </div>
    </div>
  );
}

/* ------------------------------- Evidence --------------------------------- */

const EV_ICON = {
  work: Briefcase, repo: GithubLogo, publication: Article, internal: Lock, inferred: Warning,
} as const;

export function EvidenceCard({ e }: { e: Evidence }) {
  const Icon = EV_ICON[e.kind];
  // Amber means Ema guessed. Purple means Ema wrote. Never the same colour.
  const inferred = e.kind === 'inferred';
  return (
    <div className={cx(
      'flex gap-2.5 p-2.5 rounded-md border text-xs',
      inferred
        ? 'bg-[var(--warning-bg-subtle)] border-[var(--warning-border)] text-[var(--warning-text)]'
        : 'bg-[var(--beige-50)] border-[var(--beige-400)]',
    )}>
      <Icon size={14} className={cx('shrink-0 mt-0.5', inferred ? 'text-[var(--warning-text)]' : 'text-[var(--fg3)]')} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={cx('font-medium', inferred ? 'text-[var(--warning-text)]' : 'text-[var(--fg1)]')}>{e.source}</span>
          {e.when && <span className="text-[var(--fg3)]">{e.when}</span>}
          {e.kind === 'internal' && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-[var(--fg3)]">
              <Lock size={9} /> Read-only
            </span>
          )}
        </div>
        {e.quote && <div className="text-[var(--fg2)] mt-1 leading-[17px]">“{e.quote}”</div>}
        {e.meta && <div className="text-[var(--fg3)] mt-1 font-mono text-[11px]">{e.meta}</div>}
        {e.href && !inferred && (
          <a href={e.href} onClick={(ev) => ev.preventDefault()}
            className="inline-block mt-1.5 text-[var(--success-text)] hover:underline font-medium">
            View source ↗
          </a>
        )}
      </div>
    </div>
  );
}

/** Tier 3: the audit view, one block per criterion. */
export function CriterionAudit({
  criterion, cs, onOverride, onAsk, asked,
}: {
  criterion: Criterion;
  cs: CriterionScore | undefined;
  onOverride?: (score: number) => void;
  /** Carry a question about this unknown cell into the next outreach message. */
  onAsk?: () => void;
  asked?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const v = cs ? effectiveScore(cs) : null;
  const band = bandOfCriterion(v);

  return (
    <div className="border border-[var(--beige-400)] rounded-lg overflow-hidden bg-white">
      <div className="flex items-start gap-3 p-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[var(--fg1)]">{criterion.name}</span>
            <span className={cx(
              'text-[10px] uppercase tracking-[1px] font-bold px-1.5 py-0.5 rounded-xs',
              criterion.type === 'required'
                ? 'bg-[var(--beige-200)] text-[var(--fg2)]'
                : 'bg-[var(--beige-100)] text-[var(--fg3)]',
            )}>
              {criterion.type}
            </span>
            <span className="text-xs text-[var(--fg3)] tabular-nums">×{criterion.weight}</span>
          </div>
          <div className="text-xs text-[var(--fg3)] mt-1">Bar for a 5: {criterion.bar}</div>
        </div>
        <span className={cx(
          'inline-flex items-center justify-center size-7 rounded-sm border font-bold text-sm tabular-nums shrink-0',
          v === null ? 'bg-[var(--beige-50)] border-dashed border-[var(--beige-600)] text-[var(--fg3)]'
            : cs?.confidence === 'low' ? cx(BAND_PILL[band!], 'border-dashed')
            : BAND_PILL[band!],
        )}>
          {v ?? '—'}
        </span>
      </div>

      {/* An unknown cell is not a soft no. It gets its own repair path. */}
      {cs && effectiveScore(cs) === null && (
        <div className="px-3 pb-3">
          <div className="rounded-md border border-[var(--beige-500)] bg-[var(--beige-50)] p-2.5">
            <div className="text-xs text-[var(--fg2)] leading-[17px]">
              No signal found. This is not counted against {'them'} — it lowers coverage, not the score.
            </div>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {onAsk && (
                asked ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--success-text)]">
                    <Check size={11} weight="bold" /> Asked in outreach
                  </span>
                ) : (
                  <button
                    onClick={onAsk}
                    className="inline-flex items-center gap-1 h-6 px-2 rounded-xs border border-[var(--beige-500)] bg-white text-xs font-medium text-[var(--fg1)] hover:border-[var(--focus-border)] cursor-pointer"
                  >
                    <Question size={11} weight="bold" /> Ask in outreach
                  </button>
                )
              )}
              {onOverride && (
                <button
                  onClick={() => onOverride(4)}
                  className="h-6 px-2 rounded-xs border border-[var(--beige-500)] bg-white text-xs font-medium text-[var(--fg1)] hover:border-[var(--focus-border)] cursor-pointer"
                >
                  Mark as met
                </button>
              )}
              <span className="text-xs text-[var(--fg3)]">or leave unknown</span>
            </div>
          </div>
        </div>
      )}

      {cs && effectiveScore(cs) !== null && (
        <div className="px-3 pb-3 space-y-2">
          {cs.override && (
            <div className="flex items-start gap-1.5 text-xs text-[var(--success-text)] bg-[var(--success-bg-subtle)] border border-[var(--green-500)] rounded-sm px-2 py-1.5">
              {cs.override.via === 'reply'
                ? <Question size={12} weight="bold" className="mt-px shrink-0" />
                : <User size={12} weight="bold" className="mt-px shrink-0" />}
              <span>
                {cs.override.via === 'reply'
                  ? <>Answered by {cs.override.by} in their reply · recorded {cs.override.at}</>
                  : cs.override.original === null
                    ? <>No signal found · you set {cs.override.score} · {cs.override.at}, {cs.override.by}</>
                    : <>Ema scored {cs.override.original} · you set {cs.override.score} · {cs.override.at}, {cs.override.by}</>}
              </span>
            </div>
          )}

          {cs.whyNotFive && !cs.override && (
            <div className="text-xs text-[var(--fg1)] bg-[var(--beige-100)] border border-[var(--beige-400)] rounded-sm px-2.5 py-2">
              {cs.whyNotFive}
            </div>
          )}

          {cs.confidence === 'low' && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--warning-text)]">
              <Warning size={12} weight="bold" /> Low confidence — inferred, not quoted
            </div>
          )}

          <button onClick={() => setOpen((o) => !o)}
            className="text-xs text-[var(--fg2)] hover:text-[var(--fg1)] cursor-pointer inline-flex items-center gap-1">
            <Sparkle size={11} weight="fill" className="text-[var(--ai-magic-text)]" />
            {open ? 'Hide evidence' : `Evidence (${cs.evidence.length})`}
          </button>

          {open && (
            <div className="space-y-1.5 pt-0.5">
              {cs.evidence.map((e, i) => <EvidenceCard key={i} e={e} />)}
              {onOverride && (
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-xs text-[var(--fg3)]">Set score:</span>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => onOverride(n)}
                      className={cx(
                        'size-6 rounded-xs border text-xs font-bold cursor-pointer transition-colors',
                        n === v
                          ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-[var(--brand-primary-foreground)]'
                          : 'bg-white border-[var(--beige-500)] text-[var(--fg2)] hover:border-[var(--focus-border)]',
                      )}>
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
