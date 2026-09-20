import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlass, Warning, CaretDown, Sparkle } from '@phosphor-icons/react';
import { SEARCH, FILTERS, CRITERIA, type FilterChip, type FilterMode } from '../data/search';
import { rankAll, applyOverrides } from '../lib/scoring';
import { Avatar, Badge, Button, Card, Textarea, ToastStack, cx } from '../components/ui';
import { ModePicker, FiltersInfo, DerivedFrom, ScorecardRow, ScorecardInfo, MODE_DOT } from '../components/SearchControls';
import { ScorePill, Sparkbar } from '../components/Score';
import { AppShell } from '../components/AppShell';
import { useStore } from '../store';
import { UsageOverlay } from './LayoutPicker';

/**
 * Search · C — Query and live preview.
 *
 * Bets that filters fail invisibly: a slightly wrong one does not raise an
 * error, it produces a list missing people nobody ever sees. The cure is to
 * replace the abstract count with actual faces that update as you tune — the
 * tightest available feedback loop, and how SeekOut and Juicebox work.
 *
 * Sacrifices vertical room for the scorecard, which collapses to a summary.
 */

export function SearchLivePreview() {
  const navigate = useNavigate();
  const store = useStore();
  const { toasts, dismissToast } = store;

  const [brief, setBrief] = React.useState(SEARCH.brief);
  const [filters, setFilters] = React.useState<FilterChip[]>(FILTERS);
  const [scorecardOpen, setScorecardOpen] = React.useState(true);
  const [parsed, setParsed] = React.useState(true);

  const candidates = React.useMemo(
    () => applyOverrides(store.candidates, store.overrides),
    [store.candidates, store.overrides],
  );

  const musts = filters.filter((f) => f.mode === 'must');
  const funnel = musts.filter((f) => f.poolAfter !== undefined);
  const reach = funnel.length ? funnel[funnel.length - 1].poolAfter! : 8412;

  // The preview is real: the same ranking the results screen will use.
  const preview = React.useMemo(
    () => rankAll(candidates, store.criteria).slice(0, 8),
    [candidates, store.criteria],
  );

  const setMode = (id: string, mode: FilterMode) =>
    setFilters((prev) => prev.map((f) => (f.id === id ? { ...f, mode, suggested: false } : f)));

  const begin = () => { store.runSearch(); navigate('/candidates'); };

  return (
    <AppShell breadcrumbs={['Searches', SEARCH.name]} screen="search">
      <div className="h-full flex">
        {/* Query */}
        <div className="w-[360px] shrink-0 border-r border-[var(--beige-300)] overflow-y-auto">
          <div className="p-4 space-y-4">
            <div data-usage="role">
              <div className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)] mb-2">Role</div>
              <Textarea
                value={brief}
                onChange={(e) => { setBrief(e.target.value); setParsed(false); }}
                rows={3}
                // Grows to fit the brief: a role description clipped mid-sentence
                // reads as broken, and it is the first thing on the screen.
                className="field-sizing-content min-h-[76px] max-h-[260px] overflow-y-auto"
                placeholder="Describe the role, or paste the job description…"
              />
              {!parsed && (
                <Button size="sm" color="aiMagic" icon={<Sparkle size={13} weight="fill" />}
                  className="mt-2" onClick={() => setParsed(true)}>
                  Re-read and update filters
                </Button>
              )}
            </div>

            <div data-usage="filters">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)]">Filters</span>
                <FiltersInfo />
              </div>
              <div className="mb-2.5">
                <DerivedFrom stale={!parsed} onReparse={() => setParsed(true)} />
              </div>
              <div className="space-y-1">
                {filters.map((f) => (
                  <div key={f.id} className={cx(
                    'flex items-center gap-2 px-1.5 py-1 rounded-sm transition-colors duration-150',
                    'hover:bg-[var(--beige-100)] focus-within:bg-[var(--beige-100)]',
                  )}>
                    <span className={cx('size-2 rounded-full shrink-0', MODE_DOT[f.mode])} />
                    <span className="text-sm text-[var(--fg1)] truncate flex-1">{f.value}</span>
                    {/* Fixed width: the three mode labels differ in length, and a
                        ragged right edge makes the rail read as unaligned. The menu
                        hangs from the right so the 360px rail does not clip it. */}
                    <span className={cx(
                      'w-[92px] shrink-0 [&>span]:block [&>span>button]:w-full [&>span>button]:justify-between',
                      '[&_[role=menu]]:left-auto [&_[role=menu]]:right-0',
                    )}>
                      <ModePicker compact value={f.mode} name={f.value} onChange={(m) => setMode(f.id, m)} />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scorecard collapses — that is this layout's stated sacrifice. */}
            <div data-usage="scorecard">
              {/* The toggle sizes to its label so the info icon sits on the
                  heading line rather than orphaned below it. */}
              <div className="flex items-center gap-1.5 -mx-1.5">
                <button
                  onClick={() => setScorecardOpen((o) => !o)}
                  aria-expanded={scorecardOpen}
                  className={cx(
                    'flex items-center gap-1.5 px-1.5 py-1 rounded-sm cursor-pointer',
                    'text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)] transition-colors duration-150',
                    'hover:text-[var(--fg1)] hover:bg-[var(--beige-100)] active:bg-[var(--beige-200)]',
                  )}
                >
                  <CaretDown size={11} weight="bold" className={cx('transition-transform', !scorecardOpen && '-rotate-90')} />
                  Scorecard · {store.criteria.length} criteria
                </button>
                <ScorecardInfo />
              </div>
              <div className="mt-1"><DerivedFrom stale={!parsed} onReparse={() => setParsed(true)} /></div>
              {scorecardOpen && (
                <div className="mt-2 space-y-1.5">
                  {store.criteria.map((c) => (
                    <ScorecardRow
                      key={c.id}
                      compact
                      criterion={c}
                      onChange={(next) => store.setCriteria(store.criteria.map((x) => (x.id === c.id ? next : x)))}
                      onRemove={() => store.setCriteria(store.criteria.filter((x) => x.id !== c.id))}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live preview */}
        {/* Column, not a scroll box: the preview owns the height it is given and
            the action bar sits at the bottom edge instead of floating mid-pane. */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0" data-usage="preview">
          <div className="flex-1 min-h-0 flex flex-col p-5">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold text-[var(--fg1)] tabular-nums">≈ {reach.toLocaleString()}</span>
              <span className="text-sm text-[var(--fg2)]">profiles match · previewing the top 8</span>
            </div>

            <Card className="flex-1 min-h-0 mt-4 flex flex-col overflow-hidden">
              <div className="min-h-0 overflow-y-auto">
                {preview.map(({ candidate, ranking }, i) => (
                  <div
                    key={candidate.id}
                    className={cx(
                      'flex items-center gap-3 px-3.5 py-2.5 transition-colors duration-150 hover:bg-[var(--beige-50)]',
                      i > 0 && 'border-t border-[var(--beige-200)]',
                    )}
                  >
                    <Avatar name={candidate.name} size={28} tone={candidate.avatarTone} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-[var(--fg1)] truncate">{candidate.name}</div>
                      <div className="text-xs text-[var(--fg3)] truncate">
                        {candidate.title} · {candidate.company} · {candidate.yearsExperience} yrs
                      </div>
                    </div>
                    <Sparkbar candidate={candidate} criteria={store.criteria} />
                    <ScorePill ranking={ranking} size="sm" />
                  </div>
                ))}
              </div>
              {/* Footer sits at the card's base so the preview reads as a panel
                  rather than a short list floating in an empty pane. */}
              <div className="mt-auto flex items-center gap-1.5 border-t border-[var(--beige-200)] bg-[var(--beige-50)] px-3.5 py-2.5 text-xs text-[var(--fg2)]">
                <Sparkle size={11} weight="fill" className="text-[var(--ai-magic-text)] shrink-0" />
                Updates as you change a filter — so a wrong filter shows up as the wrong people, not a wrong number.
              </div>
            </Card>

            <div className="mt-4 shrink-0 flex items-start gap-2 px-3 py-2.5 rounded-md bg-[var(--warning-bg-subtle)] border border-[var(--warning-border)] text-xs text-[var(--warning-text)]" data-usage="reach">
              <Warning size={13} className="mt-px shrink-0" />
              <span>
                Adding <span className="font-medium">“PhD required”</span> as a must-have would cut this to
                {' '}<span className="font-medium tabular-nums">64</span>. Preview it before committing.
              </span>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-t border-[var(--beige-300)]">
            <Button
              size="lg"
              icon={<MagnifyingGlass size={16} weight="bold" />}
              disabled={!musts.length}
              loading={store.searchPhase === 'running'}
              onClick={begin}
            >
              {store.searchPhase === 'running' ? 'Searching…' : 'Begin full search'}
            </Button>
            <span className="text-xs text-[var(--fg3)]" aria-live="polite">
              {store.searchPhase === 'running'
                ? `Scored ${store.scanProgress.toLocaleString()} of ${SEARCH.profilesScored.toLocaleString()} profiles`
                : musts.length
                  ? 'Scores all 8,412 profiles · about 2 minutes'
                  : 'Add at least one must-have filter'}
            </span>
          </div>
        </div>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <UsageOverlay screen="search" />
    </AppShell>
  );
}
