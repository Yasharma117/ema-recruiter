import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookmarkSimple, PaperPlaneTilt, PencilSimple, Question, X } from '@phosphor-icons/react';
import type { Candidate, Criterion } from '../lib/types';
import { rankAll, applyOverrides, effectiveScore, matchesQuery } from '../lib/scoring';
import { SEARCH } from '../data/search';
import { Avatar, Button, Tabs, ToastStack, cx } from '../components/ui';
import { EvidenceCard } from '../components/Score';
import { AppShell } from '../components/AppShell';
import { PreflightSheet } from '../screens/Preflight';
import { useStore } from '../store';
import { CandidateSearch, NoQueryMatch } from '../components/CandidateSearch';
import { UsageOverlay } from './LayoutPicker';

/**
 * Candidates · C — Criteria grid.
 *
 * Candidates as rows, criteria as columns, cells as a three-state verdict plus
 * unknown. This is the shape the field converged on: Juicebox ships
 * Good match / Potential fit / Not a match with a separate insufficient-evidence
 * state, and Hebbia's Matrix is rows = subjects, columns = questions, cells =
 * cited answers. Comparison stops being a separate feature because the list
 * *is* the comparison.
 *
 * Known weakness, and the thing this test should settle: three states produce
 * very few distinct ranks, and the brief asks for a *ranked* list.
 */

type Verdict = 'good' | 'potential' | 'no' | 'unknown';

function verdictOf(score: number | null): Verdict {
  if (score === null) return 'unknown';
  if (score >= 4) return 'good';
  if (score === 3) return 'potential';
  return 'no';
}

const CELL: Record<Verdict, { glyph: string; cls: string; label: string }> = {
  good: { glyph: '●', cls: 'text-[var(--success-text)] bg-[var(--success-bg-subtle)]', label: 'Good match' },
  potential: { glyph: '◐', cls: 'text-[var(--pending)] bg-[var(--warning-bg-subtle)]', label: 'Potential fit' },
  no: { glyph: '✕', cls: 'text-[var(--gray-900)] bg-[var(--gray-50)]', label: 'Not a match' },
  unknown: { glyph: '—', cls: 'text-[var(--fg3)] bg-[var(--beige-50)]', label: 'No evidence' },
};

export function CandidatesGrid() {
  const navigate = useNavigate();
  const store = useStore();
  const { criteria, shortlist, passed, searchPhase, toasts, dismissToast, toast } = store;

  const candidates = React.useMemo(
    () => applyOverrides(store.candidates, store.overrides),
    [store.candidates, store.overrides],
  );

  const [view, setView] = React.useState<'all' | 'shortlist' | 'passed'>('all');
  const [cell, setCell] = React.useState<{ candidate: Candidate; criterion: Criterion } | null>(null);
  const [preflightOpen, setPreflightOpen] = React.useState(false);

  const basePool = React.useMemo(() => {
    if (searchPhase !== 'complete') return [];
    if (view === 'shortlist') return candidates.filter((c) => shortlist.has(c.id));
    if (view === 'passed') return candidates.filter((c) => passed.has(c.id));
    return candidates.filter((c) => !passed.has(c.id));
  }, [candidates, view, shortlist, passed, searchPhase]);

  const pool = React.useMemo(
    () => (store.query.trim() ? basePool.filter((c) => matchesQuery(c, store.query)) : basePool),
    [basePool, store.query],
  );

  const ranked = React.useMemo(() => rankAll(pool, criteria).slice(0, 40), [pool, criteria]);
  const ordered = React.useMemo(
    () => [...criteria].sort((a, b) => (a.type === b.type ? 0 : a.type === 'required' ? -1 : 1)),
    [criteria],
  );

  const headerActions = (
    <>
      <Button size="sm" variant="secondary" color="altBrand" icon={<PencilSimple size={14} />} onClick={() => navigate('/search')}>
        Edit search
      </Button>
      <Button size="sm" icon={<PaperPlaneTilt size={14} />} disabled={!shortlist.size} onClick={() => setPreflightOpen(true)}>
        Start outreach{shortlist.size > 0 && ` (${shortlist.size})`}
      </Button>
    </>
  );

  return (
    <AppShell breadcrumbs={['Searches', SEARCH.name]} actions={headerActions} screen="candidates">
      <div className="h-full flex flex-col">
        <div className="shrink-0 px-5 pt-3.5 pb-2.5 flex items-center gap-4 flex-wrap border-b border-[var(--beige-300)]">
          <Tabs
            variant="segmented"
            value={view}
            onChange={setView}
            items={[
              { id: 'all', label: 'All', count: candidates.filter((c) => !passed.has(c.id)).length },
              { id: 'shortlist', label: 'Shortlist', count: shortlist.size },
              { id: 'passed', label: 'Not a fit', count: passed.size },
            ]}
          />
          <div className="flex items-center gap-3 text-xs text-[var(--fg2)]">
            {(['good', 'potential', 'no', 'unknown'] as Verdict[]).map((v) => (
              <span key={v} className="inline-flex items-center gap-1">
                <span className={cx('inline-flex items-center justify-center size-4 rounded-xs text-[11px]', CELL[v].cls)}>
                  {CELL[v].glyph}
                </span>
                {CELL[v].label}
              </span>
            ))}
          </div>
          <CandidateSearch resultCount={ranked.length} className="ml-auto" />
          <span className="text-xs text-[var(--fg3)]">Top 40 · click any cell for evidence</span>
        </div>

        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0 overflow-auto" data-usage="score">
            <table className="border-collapse">
              <thead className="sticky top-0 z-20">
                <tr>
                  <th className="sticky left-0 z-30 bg-[var(--beige-50)] border-b border-r border-[var(--beige-400)] text-left px-4 py-2.5 w-[260px] min-w-[260px]">
                    <span className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)]">Candidate</span>
                  </th>
                  {ordered.map((c) => (
                    <th key={c.id} className="bg-[var(--beige-50)] border-b border-l border-[var(--beige-300)] px-2 py-2.5 w-[112px] min-w-[112px] align-bottom">
                      <div className="text-xs font-medium text-[var(--fg1)] leading-[15px]">{c.name}</div>
                      <div className="text-[10px] uppercase tracking-wide text-[var(--fg3)] mt-1">
                        {c.type === 'required' ? 'Required' : 'Preferred'}
                      </div>
                    </th>
                  ))}
                  <th className="bg-[var(--beige-50)] border-b border-l border-[var(--beige-400)] px-3 py-2.5 w-[88px] min-w-[88px]">
                    <span className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)]">Coverage</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map(({ candidate, ranking }) => (
                  <tr key={candidate.id} className="border-b border-[var(--beige-200)] hover:bg-[var(--beige-100)] group">
                    <th scope="row" className="sticky left-0 z-10 bg-white group-hover:bg-[var(--beige-100)] border-r border-[var(--beige-300)] text-left px-4 py-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={candidate.name} size={26} tone={candidate.avatarTone} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-[var(--fg1)] truncate">{candidate.name}</div>
                          <div className="text-xs text-[var(--fg3)] truncate font-normal">{candidate.company}</div>
                        </div>
                        <button
                          onClick={() => store.toggleShortlist(candidate.id)}
                          title={shortlist.has(candidate.id) ? 'Remove from shortlist' : 'Shortlist'}
                          className={cx('shrink-0 cursor-pointer',
                            shortlist.has(candidate.id)
                              ? 'text-[var(--success-text)]'
                              : 'text-[var(--fg3)] opacity-0 group-hover:opacity-100')}
                        >
                          <BookmarkSimple size={15} weight={shortlist.has(candidate.id) ? 'fill' : 'regular'} />
                        </button>
                      </div>
                    </th>

                    {ordered.map((c) => {
                      const cs = candidate.scores.find((s) => s.criterionId === c.id);
                      const v = verdictOf(cs ? effectiveScore(cs) : null);
                      return (
                        <td key={c.id} className="border-l border-[var(--beige-200)] p-1 text-center">
                          <button
                            onClick={() => setCell({ candidate, criterion: c })}
                            title={`${c.name}: ${CELL[v].label}`}
                            className={cx(
                              'w-full h-9 rounded-sm text-base cursor-pointer transition-transform duration-150 hover:scale-[1.06]',
                              CELL[v].cls,
                              cs?.confidence === 'low' && v !== 'unknown' && 'border border-dashed border-current/40',
                            )}
                          >
                            {CELL[v].glyph}
                          </button>
                        </td>
                      );
                    })}

                    <td className="border-l border-[var(--beige-300)] px-3 text-center">
                      <span className={cx('text-xs font-medium tabular-nums',
                        ranking.lowCoverage ? 'text-[var(--warning-text)]' : 'text-[var(--fg2)]')}>
                        {ranking.scored} of {ranking.total}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!ranked.length && (
              store.query.trim()
                ? <NoQueryMatch query={store.query} onClear={() => store.setQuery('')} compact={false} />
                : <div className="p-8 text-center text-sm text-[var(--fg2)]">Nothing to compare yet.</div>
            )}
          </div>

          {/* Evidence for one cell — Hebbia's drill-in, kept as a panel not a hover. */}
          {cell && (
            <aside aria-label="Evidence" className="w-[360px] shrink-0 border-l border-[var(--beige-300)] bg-[var(--beige-50)] overflow-y-auto" data-usage="evidence">
              <CellEvidence
                candidate={cell.candidate}
                criterion={cell.criterion}
                onClose={() => setCell(null)}
                onAsk={() => {
                  store.askInOutreach(cell.candidate.id, cell.criterion.id);
                  toast(`Ema will ask about ${cell.criterion.name.toLowerCase()} in the next message.`);
                }}
              />
            </aside>
          )}
        </div>
      </div>

      <PreflightSheet
        open={preflightOpen}
        onClose={() => setPreflightOpen(false)}
        candidateIds={[...shortlist]}
        onConfirm={(ids) => { store.addToOutreach(ids); setPreflightOpen(false); navigate('/outreach'); }}
      />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <UsageOverlay screen="candidates" />
    </AppShell>
  );
}

function CellEvidence({
  candidate, criterion, onClose, onAsk,
}: { candidate: Candidate; criterion: Criterion; onClose: () => void; onAsk: () => void }) {
  const cs = candidate.scores.find((s) => s.criterionId === criterion.id);
  const v = verdictOf(cs ? effectiveScore(cs) : null);

  return (
    <div className="p-4">
      <div className="flex items-start gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[var(--fg1)]">{candidate.name}</div>
          <div className="text-xs text-[var(--fg3)]">{criterion.name}</div>
        </div>
        <button onClick={onClose} className="text-[var(--fg3)] hover:text-[var(--fg1)] cursor-pointer shrink-0">
          <X size={15} />
        </button>
      </div>

      <div className={cx('inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-sm font-medium mb-3', CELL[v].cls)}>
        <span>{CELL[v].glyph}</span> {CELL[v].label}
      </div>

      <div className="text-xs text-[var(--fg3)] mb-3">Bar for a good match: {criterion.bar}</div>

      {v === 'unknown' ? (
        <div className="rounded-md border border-[var(--beige-500)] bg-white p-3">
          <div className="text-xs text-[var(--fg2)] leading-[17px]">
            No signal found. This lowers coverage rather than counting against them.
          </div>
          <button
            onClick={onAsk}
            className="mt-2 inline-flex items-center gap-1 h-6 px-2 rounded-xs border border-[var(--beige-500)] bg-white text-xs font-medium text-[var(--fg1)] hover:border-[var(--focus-border)] cursor-pointer"
          >
            <Question size={11} weight="bold" /> Ask in outreach
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {cs?.whyNotFive && (
            <div className="text-xs text-[var(--fg1)] bg-white border border-[var(--beige-400)] rounded-sm px-2.5 py-2">
              {cs.whyNotFive}
            </div>
          )}
          {(cs?.evidence ?? []).map((e, i) => <EvidenceCard key={i} e={e} />)}
        </div>
      )}
    </div>
  );
}
