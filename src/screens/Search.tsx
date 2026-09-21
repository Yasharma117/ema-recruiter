import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkle, MagnifyingGlass, Plus, X, Warning, Info, Lock, ArrowRight,
  DotsSixVertical, FileText, Check, CaretDown,
} from '@phosphor-icons/react';
import { SEARCH, FILTERS, FILTER_CATEGORIES, CRITERIA, type FilterChip, type FilterMode } from '../data/search';
import type { Criterion } from '../lib/types';
import {
  Badge, Banner, Button, Card, IconButton, Input, StatusDot, Textarea, ToastStack, cx,
} from '../components/ui';
import { AppShell } from '../components/AppShell';
import { weightShares } from '../lib/scoring';
import { useStore } from '../store';
import {
  ModePicker, FilterLegend, ScorecardRow, AddFilter, AddCriterion, ScorecardInfo, DerivedFrom, MODE_CHIP, MODES, MODE_COPY, MODE_DOT,
} from '../components/SearchControls';
import { UsageOverlay } from '../layouts/LayoutPicker';

export function SearchScreen() {
  const navigate = useNavigate();
  const store = useStore();
  const { toasts, dismissToast, toast } = store;

  const [brief, setBrief] = React.useState(SEARCH.brief);
  const [parsed, setParsed] = React.useState(true);
  const [parsing, setParsing] = React.useState(false);
  const [filters, setFilters] = React.useState<FilterChip[]>(FILTERS);
  const [criteria, setCriteria] = React.useState<Criterion[]>(CRITERIA);
  const [sources, setSources] = React.useState({ public: true, internal: true });
  const [name, setName] = React.useState(SEARCH.name);

  // What each criterion actually controls, using rank()'s own weighting:
  // required counts double, so "3" means different things by type.
  const shares = React.useMemo(() => weightShares(criteria), [criteria]);

  const suggested = filters.filter((f) => f.suggested).length;
  const musts = filters.filter((f) => f.mode === 'must');

  const runParse = () => {
    setParsing(true);
    setTimeout(() => { setParsing(false); setParsed(true); }, 900);
  };

  const setMode = (id: string, mode: FilterMode) =>
    setFilters((prev) => prev.map((f) => (f.id === id ? { ...f, mode, suggested: false } : f)));

  const removeFilter = (id: string) => setFilters((prev) => prev.filter((f) => f.id !== id));

  const beginSearch = () => {
    // Commit the edited scorecard so the candidate list ranks against what is
    // actually on screen. A criterion added here has no scores yet, so it
    // shows as unknown and lowers coverage — which is the honest reading.
    store.setCriteria(criteria);
    store.runSearch();
    navigate('/candidates');
  };

  const acceptAll = () => {
    setFilters((prev) => prev.map((f) => ({ ...f, suggested: false })));
    toast('All suggestions confirmed.');
  };

  /* Estimated reach — recomputed from the must-have funnel. */
  const funnel = musts.filter((f) => f.poolAfter !== undefined);
  const reach = funnel.length ? funnel[funnel.length - 1].poolAfter! : 8412;
  const internalReach = sources.internal ? 38 : 0;
  const tooNarrow = reach < 400;

  // One primary per screen. The rail's Begin search is the real one — it sits
  // under Estimated reach, which is what you read to decide. This header copy
  // only appears below lg, where the rail stacks to the bottom of a long page.
  const headerActions = (
    <span className="lg:hidden">
      <Button
        size="sm"
        icon={<MagnifyingGlass size={14} weight="bold" />}
        disabled={musts.length === 0}
        onClick={beginSearch}
      >
        Begin search
      </Button>
    </span>
  );

  return (
    <AppShell screen="search" breadcrumbs={['Searches', name]} actions={headerActions}>
      <div className="h-full overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-5 py-5">
          {/* Title + status: the chip says where the search is, the line says what that means. */}
          <div className="mb-5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label="Search name"
              className="w-full text-2xl font-medium text-[var(--fg1)] bg-transparent border border-transparent rounded-md px-2 -ml-2 py-0.5 outline-none hover:border-[var(--beige-400)] focus:border-[var(--focus-border)] focus:bg-white min-w-0"
            />
            <div className="flex items-center gap-2.5 mt-1.5 flex-wrap" aria-live="polite">
              <span className={cx(
                'inline-flex items-center gap-1.5 h-6 pl-2 pr-2.5 rounded-pill border text-xs font-medium',
                store.searchPhase === 'complete' && 'bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success-text)]',
                store.searchPhase === 'running' && 'bg-[var(--info-bg)] border-[var(--info-border)] text-[var(--info-text)]',
                store.searchPhase === 'draft' && 'bg-[var(--beige-100)] border-[var(--beige-400)] text-[var(--fg2)]',
              )}>
                {store.searchPhase === 'complete'
                  ? <Check size={11} weight="bold" />
                  : <StatusDot tone={store.searchPhase === 'running' ? 'info' : 'idle'}
                      className={store.searchPhase === 'running' ? 'animate-pulse' : undefined} />}
                {store.searchPhase === 'complete' ? 'Search complete'
                  : store.searchPhase === 'running' ? 'Searching' : 'Draft'}
              </span>
              <span className="text-sm text-[var(--fg2)] tabular-nums">
                {store.searchPhase === 'complete' && <>
                  <span className="font-medium text-[var(--fg1)]">{SEARCH.matched}</span> matched of{' '}
                  {SEARCH.profilesScored.toLocaleString()} scored · {store.shortlist.size} shortlisted
                </>}
                {store.searchPhase === 'running' && <>
                  Scored {store.scanProgress.toLocaleString()} of {SEARCH.profilesScored.toLocaleString()} profiles…
                </>}
                {store.searchPhase === 'draft' && 'Not run yet. Confirm your filters, then begin the search.'}
              </span>
              {store.searchPhase === 'complete' && (
                <Button size="sm" variant="ghost" color="altBrand" iconRight={<ArrowRight size={12} />}
                  onClick={() => navigate('/candidates')}>
                  View candidates
                </Button>
              )}
            </div>
          </div>

          <div className="flex gap-5 items-start flex-col lg:flex-row">
            {/* ------------------------- left column ------------------------- */}
            <div className="flex-1 min-w-0 w-full space-y-4">
              {/* 1 — Role */}
              <Card className="p-4" data-usage="role">
                <div className="flex items-baseline gap-2 mb-1">
                  <h2 className="text-base font-medium text-[var(--fg1)]">Role</h2>
                  <span className="text-xs text-[var(--fg3)]">Describe it, or paste the job description.</span>
                </div>
                <Textarea
                  value={brief}
                  onChange={(e) => { setBrief(e.target.value); setParsed(false); }}
                  rows={5}
                  placeholder="Staff ML engineer for payments risk. Needs production model serving at real scale, 7+ years, fintech preferred…"
                  className="mt-2"
                />
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Button size="sm" variant="secondary" color="altBrand" icon={<FileText size={13} />}
                    onClick={() => toast('Job description upload — max 20,000 characters.')}>
                    Upload job description
                  </Button>
                  {!parsed && (
                    <Button size="sm" color="aiMagic" icon={<Sparkle size={13} weight="fill" />} onClick={runParse} disabled={parsing}>
                      {parsing ? 'Reading…' : 'Ask Ema to read this'}
                    </Button>
                  )}
                  <span className="text-xs text-[var(--fg3)] ml-auto">{brief.length} / 20,000</span>
                </div>

                {parsed && (
                  <div className="mt-3 rounded-lg border border-[var(--ai-magic-border)] bg-[var(--ai-magic-bg-subtle)] p-3">
                    {/* items-stretch so the action spans the full height of the copy */}
                    <div className="flex items-stretch gap-3">
                      <Sparkle size={14} weight="fill" className="text-[var(--ai-magic-text)] shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 self-center">
                        <div className="text-sm text-[var(--fg1)]">
                          Ema read this and suggested{' '}
                          <span className="font-medium">{filters.length} filters</span> and{' '}
                          <span className="font-medium">{criteria.length} scorecard criteria</span>.
                        </div>
                        <div className="text-xs text-[var(--purple-960)] opacity-80 mt-0.5">
                          Review before you begin — nothing runs until you say so.
                        </div>
                      </div>
                      {suggested > 0 ? (
                        <Button
                          color="aiMagic"
                          icon={<Check size={14} weight="bold" />}
                          onClick={acceptAll}
                          className="shrink-0 self-stretch h-auto px-5"
                        >
                          Confirm all ({suggested})
                        </Button>
                      ) : (
                        <span className="shrink-0 self-center inline-flex items-center gap-1.5 text-sm font-medium text-[var(--success-text)]">
                          <Check size={14} weight="bold" /> Confirmed
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </Card>

              {/* 2 — Filters */}
              <Card className={cx('p-4 transition-colors duration-150',
                !parsed && 'border-[var(--warning-border)] bg-[var(--warning-bg-subtle)]')} data-usage="filters">
                <div className="mb-1">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-base font-medium text-[var(--fg1)]">Filters</h2>
                    <span className="text-xs text-[var(--fg3)]">Who is eligible for this search.</span>
                  </div>
                  <FilterLegend className="mt-2" />
                  <div className="mt-2">
                    <DerivedFrom stale={!parsed} onReparse={runParse} />
                  </div>
                  <div className="text-xs text-[var(--fg3)] mt-1.5">
                    Filters decide who comes back. The scorecard below decides what order they come back in.
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  {FILTER_CATEGORIES.filter((cat) => filters.some((f) => f.category === cat)).map((cat) => (
                    <div key={cat}>
                      <div className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)] mb-1.5">{cat}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {filters.filter((f) => f.category === cat).map((f) => (
                          <span key={f.id}
                            className={cx('inline-flex items-center gap-1.5 h-8 pl-2.5 pr-1 rounded-md border text-sm', MODE_CHIP[f.mode])}>
                            {f.suggested && <Sparkle size={11} weight="fill" className="text-[var(--ai-magic-text)] shrink-0" />}
                            <span className="truncate max-w-[220px]">{f.value}</span>
                            <ModePicker
                              value={f.mode}
                              name={f.value}
                              onChange={(m) => setMode(f.id, m)}
                            />
                            <IconButton icon={<X size={11} />} onClick={() => removeFilter(f.id)}
                              title={`Remove ${f.value}`} className="size-6 shrink-0 hover:bg-black/5" />
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <AddFilter
                  className="mt-3"
                  categories={FILTER_CATEGORIES}
                  onAdd={(category, value) => {
                    setFilters((prev) => [...prev, { id: `f_custom_${Date.now()}`, category, value, mode: 'preferred' }]);
                    toast(`Added “${value}” to ${category.toLowerCase()}.`);
                  }}
                />
              </Card>

              {/* 3 — Scorecard */}
              <Card className={cx('p-4 transition-colors duration-150',
                !parsed && 'border-[var(--warning-border)] bg-[var(--warning-bg-subtle)]')} data-usage="scorecard">
                <div className="flex items-baseline gap-2 mb-1">
                  <h2 className="text-base font-medium text-[var(--fg1)]">Scorecard</h2>
                  <ScorecardInfo />
                  <span className="text-xs text-[var(--fg3)]">
                    Ranks everyone who passed your filters.
                  </span>
                  <span className="ml-auto"><DerivedFrom stale={!parsed} onReparse={runParse} /></span>
                </div>

                <div className="mt-3 space-y-2">
                  {criteria.map((c) => (
                    <ScorecardRow
                      key={c.id}
                      criterion={c}
                      weightControl="scale"
                      share={shares[c.id]}
                      onChange={(next) => setCriteria((prev) => prev.map((x) => (x.id === c.id ? next : x)))}
                      onRemove={() => setCriteria((prev) => prev.filter((x) => x.id !== c.id))}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <AddCriterion
                    criteria={criteria}
                    className="flex-1"
                    onAdd={(c) => {
                      setCriteria((prev) => [...prev, { ...c, id: `c_custom_${Date.now()}` }]);
                      toast(`Added “${c.name}” to the scorecard.`);
                    }}
                  />
                  <span className="text-xs text-[var(--fg3)] ml-auto">
                    Shares add up to 100%. Raising one lowers the rest.
                  </span>
                </div>
              </Card>
            </div>

            {/* ------------------------- right rail ------------------------- */}
            <aside className="w-full lg:w-[320px] shrink-0 lg:sticky lg:top-0 space-y-3">
              <Card className="p-4" data-usage="reach">
                <div className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)] mb-2">Estimated reach</div>
                <div className="flex items-baseline gap-1.5">
                  {/* Keyed on the number: moving one filter to must-have redraws
                      this and the funnel under it, and the number is the whole
                      reason the rail is there. A silent swap in a sticky rail
                      you were not looking at is a change nobody sees happen. */}
                  <span
                    key={reach}
                    className="text-2xl font-bold text-[var(--fg1)] tabular-nums animate-[emaIn_220ms_var(--ease-out-quint)_backwards]"
                  >
                    ≈ {reach.toLocaleString()}
                  </span>
                  <span className="text-sm text-[var(--fg2)]">public profiles</span>
                </div>
                <div className="text-sm text-[var(--fg2)] mt-0.5">
                  + {internalReach} internal candidates (Greenhouse)
                </div>

                {/* Funnel — the drop per must-have */}
                <div className="mt-3 pt-3 border-t border-[var(--beige-300)] space-y-1.5">
                  {funnel.map((f, i) => {
                    const prev = i === 0 ? 8412 : funnel[i - 1].poolAfter!;
                    const pct = Math.round((f.poolAfter! / prev) * 100);
                    return (
                      <div key={f.id} className="text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[var(--fg2)] truncate">{f.value}</span>
                          <span className="text-[var(--fg3)] tabular-nums shrink-0">
                            {prev.toLocaleString()} → {f.poolAfter!.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-[var(--beige-300)] mt-1 overflow-hidden">
                          <div className="h-full rounded-full bg-[var(--success)]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {tooNarrow && (
                  <div className="mt-3 flex items-start gap-2 text-xs px-2.5 py-2 rounded-md bg-[var(--warning-bg-subtle)] border border-[var(--warning-border)] text-[var(--warning-text)]">
                    <Warning size={13} className="mt-px shrink-0" />
                    <span>These must-haves cut the pool by over 95%. Consider moving one to preferred.</span>
                  </div>
                )}
              </Card>

              <Card className="p-4">
                <div className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)] mb-2">Sources</div>
                {[
                  { key: 'public' as const, label: 'Public profiles', note: "Ema's external index" },
                  { key: 'internal' as const, label: 'Internal talent', note: 'Greenhouse', beta: true },
                ].map((src) => (
                  <label key={src.key} className="flex items-start gap-2.5 py-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sources[src.key]}
                      onChange={(e) => setSources((s) => ({ ...s, [src.key]: e.target.checked }))}
                      className="accent-[var(--brand-primary)] size-3.5 mt-0.5 cursor-pointer"
                    />
                    <span className="min-w-0">
                      <span className="text-sm text-[var(--fg1)] flex items-center gap-1.5">
                        {src.label}
                        {src.beta && <Badge variant="info" size="sm">Beta</Badge>}
                      </span>
                      <span className="text-xs text-[var(--fg3)] flex items-center gap-1">
                        {src.beta && <Lock size={9} />}
                        {src.note}{src.beta && ' · read-only'}
                      </span>
                    </span>
                  </label>
                ))}
                <div className="mt-2 pt-2 border-t border-[var(--beige-300)] text-xs text-[var(--fg2)]">
                  Applicants and sourced profiles are deduplicated into one ranked list.
                </div>
              </Card>

              <Card className="p-4">
                <div className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)] mb-2">Outreach</div>
                <div className="text-sm text-[var(--fg2)] leading-[20px]">
                  A 4-step sequence is ready. Ema drafts each message for you to approve before anything sends.
                </div>
                <Button size="sm" variant="secondary" color="altBrand" block className="mt-2.5"
                  iconRight={<ArrowRight size={13} />} onClick={() => navigate('/outreach')}>
                  Configure sequence
                </Button>
              </Card>

              <div className="sticky bottom-0 pt-1 pb-2 bg-[var(--app-background)]">
                <Button
                  size="lg"
                  block
                  icon={<MagnifyingGlass size={16} weight="bold" />}
                  disabled={musts.length === 0}
                  onClick={beginSearch}
                >
                  {store.searchPhase === 'complete' ? 'Re-run search' : 'Begin search'}
                </Button>
                <div className="text-xs text-[var(--fg3)] text-center mt-1.5">
                  {musts.length === 0
                    ? 'Add at least one must-have filter'
                    : store.searchPhase === 'complete'
                      ? 'Re-running keeps your shortlist and corrections'
                      : 'Takes about 2 minutes'}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <UsageOverlay screen="search" />
    </AppShell>
  );
}
