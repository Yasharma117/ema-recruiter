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
                rows={5}
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
                  <div key={f.id} className="flex items-center gap-2 px-1 py-1">
                    <span className={cx('size-2 rounded-full shrink-0', MODE_DOT[f.mode])} />
                    <span className="text-sm text-[var(--fg1)] truncate flex-1">{f.value}</span>
                    <ModePicker compact value={f.mode} name={f.value} onChange={(m) => setMode(f.id, m)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Scorecard collapses — that is this layout's stated sacrifice. */}
            <div data-usage="scorecard" className="flex flex-wrap items-center gap-y-1">
              <button
                onClick={() => setScorecardOpen((o) => !o)}
                className="w-full flex items-center gap-1.5 text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)] hover:text-[var(--fg1)] cursor-pointer"
              >
                <CaretDown size={11} weight="bold" className={cx('transition-transform', !scorecardOpen && '-rotate-90')} />
                Scorecard · {store.criteria.length} criteria
              </button>
              <span className="ml-1.5 inline-flex align-middle"><ScorecardInfo /></span>
              <div className="w-full mt-1"><DerivedFrom stale={!parsed} onReparse={() => setParsed(true)} /></div>
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
        <div className="flex-1 min-w-0 overflow-y-auto" data-usage="preview">
          <div className="p-5">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold text-[var(--fg1)] tabular-nums">≈ {reach.toLocaleString()}</span>
              <span className="text-sm text-[var(--fg2)]">profiles match · previewing the top 8</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[var(--fg2)] mb-4">
              <Sparkle size={11} weight="fill" className="text-[var(--ai-magic-text)]" />
              Updates as you change a filter — so a wrong filter shows up as the wrong people, not a wrong number.
            </div>

            <Card className="overflow-hidden">
              {preview.map(({ candidate, ranking }, i) => (
                <div
                  key={candidate.id}
                  className={cx('flex items-center gap-3 px-3.5 py-2.5', i > 0 && 'border-t border-[var(--beige-200)]')}
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
            </Card>

            <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-md bg-[var(--warning-bg-subtle)] border border-[var(--warning-border)] text-xs text-[var(--warning-text)]" data-usage="reach">
              <Warning size={13} className="mt-px shrink-0" />
              <span>
                Adding <span className="font-medium">“PhD required”</span> as a must-have would cut this to
                {' '}<span className="font-medium tabular-nums">64</span>. Preview it before committing.
              </span>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Button size="lg" icon={<MagnifyingGlass size={16} weight="bold" />} disabled={!musts.length} onClick={begin}>
                Begin full search
              </Button>
              <span className="text-xs text-[var(--fg3)]">
                {musts.length ? 'Scores all 8,412 profiles · about 2 minutes' : 'Add at least one must-have filter'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <UsageOverlay screen="search" />
    </AppShell>
  );
}
