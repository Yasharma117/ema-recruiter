import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BookmarkSimple, Clock, ShieldWarning, ArrowsMerge, Buildings, EnvelopeSimple,
  Lock, PaperPlaneTilt, PencilSimple, Ranking, ArrowCounterClockwise, Sparkle,
  UsersThree, MagnifyingGlass, CaretUpDown, ArrowUp, ArrowDown, Users, X, Plus, Minus,
} from '@phosphor-icons/react';
import type { Candidate, Criterion, OutreachState } from '../lib/types';
import { rankAll, reasonClause, rank, bandChangeCount, applyOverrides, matchesQuery, weightShares } from '../lib/scoring';
import { SEARCH } from '../data/search';
import { STATES } from '../lib/outreach';
import {
  Avatar, Badge, Banner, Button, Card, Checkbox, EmptyState, IconButton,
  Tabs, ToastStack, Tooltip, cx,
} from '../components/ui';
import { AppShell } from '../components/AppShell';
import { ScoreCell } from '../components/Score';
import { CandidateDrawer } from './CandidateDrawer';
import { CompareModal } from './Compare';
import { PreflightSheet } from './Preflight';
import { useStore } from '../store';
import { CandidateSearch, NoQueryMatch, type ListFilter } from '../components/CandidateSearch';
import { WeightScale } from '../components/SearchControls';

const LIST_FILTERS: ListFilter[] = [
  { id: 'stale', label: 'Stale profiles', hint: 'Last updated over 18 months ago.' },
  { id: 'gate', label: 'Fails required', hint: 'Missing at least one required criterion.' },
  { id: 'email', label: 'Has email', hint: 'Reachable by email, not just LinkedIn.' },
  { id: 'low-coverage', label: 'Low coverage', hint: 'Under 60% of criteria have evidence.' },
];
import { UsageOverlay } from '../layouts/LayoutPicker';

type View = 'all' | 'shortlist' | 'passed';
type SourceTab = 'all' | 'public' | 'internal';
type Sort = 'score' | 'recent' | 'coverage';

const SIGNAL_ICON = {
  stale: Clock,
  'gate-failed': ShieldWarning,
  'recently-moved': ArrowUp,
  'previously-rejected': ArrowDown,
  duplicate: ArrowsMerge,
  'current-employee': Buildings,
  'no-email': EnvelopeSimple,
  'do-not-contact': X,
} as const;

export function CandidatesScreen() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const store = useStore();
  const { criteria, shortlist, passed, outreach, forced, searchPhase, query, setQuery, toasts, dismissToast, toast } = store;
  // Human corrections are re-applied over the machine scores on every read.
  const candidates = React.useMemo(
    () => applyOverrides(store.candidates, store.overrides),
    [store.candidates, store.overrides],
  );

  const [view, setView] = React.useState<View>('all');
  const [sourceTab, setSourceTab] = React.useState<SourceTab>('all');
  const [sort, setSort] = React.useState<Sort>('score');
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [chips, setChips] = React.useState<Set<string>>(new Set());
  const [railOpen, setRailOpen] = React.useState(true);
  const [compareOpen, setCompareOpen] = React.useState(false);
  const [preflightOpen, setPreflightOpen] = React.useState(false);
  const [atsBanner, setAtsBanner] = React.useState(true);

  // Draft criteria drive the live re-weight preview; committed on release.
  const [draftCriteria, setDraftCriteria] = React.useState<Criterion[] | null>(null);
  const activeCriteria = draftCriteria ?? criteria;

  const openId = params.get('c');

  // Arms the demo's inbound event: something only "happens while you work" once
  // there is work on screen.
  const { noteCandidatesSeen } = store;
  React.useEffect(() => { noteCandidatesSeen(); }, [noteCandidatesSeen]);

  /* ----------------------------- filtering ----------------------------- */

  const pool = React.useMemo(() => {
    if (forced === 'zero-results' || forced === 'no-search') return [];
    if (searchPhase === 'draft') return [];
    let list = candidates;
    if (forced === 'gate-wipeout') {
      list = list.filter((c) => rank(c, activeCriteria).gateFailed);
    }
    if (view === 'shortlist') list = list.filter((c) => shortlist.has(c.id));
    else if (view === 'passed') list = list.filter((c) => passed.has(c.id));
    else list = list.filter((c) => !passed.has(c.id));

    if (sourceTab !== 'all') list = list.filter((c) => c.source === sourceTab);
    if (forced === 'ats-disconnected') list = list.filter((c) => c.source !== 'internal');

    if (chips.has('stale')) list = list.filter((c) => c.profileAgeMonths > 18);
    if (chips.has('gate')) list = list.filter((c) => rank(c, activeCriteria).gateFailed);
    if (chips.has('email')) list = list.filter((c) => !!c.email);
    if (chips.has('low-coverage')) list = list.filter((c) => rank(c, activeCriteria).lowCoverage);
    if (query.trim()) list = list.filter((c) => matchesQuery(c, query));
    return list;
  }, [candidates, view, sourceTab, chips, shortlist, passed, activeCriteria, forced, searchPhase, query]);

  const ranked = React.useMemo(() => {
    const r = rankAll(pool, activeCriteria);
    if (sort === 'recent') return [...r].sort((a, b) => a.candidate.profileAgeMonths - b.candidate.profileAgeMonths);
    if (sort === 'coverage') return [...r].sort((a, b) => b.ranking.coverage - a.ranking.coverage);
    return r;
  }, [pool, activeCriteria, sort]);

  // Previous ranking order, so a re-weight can show movement.
  const prevOrder = React.useRef<Map<string, number>>(new Map());
  const [deltas, setDeltas] = React.useState<Map<string, number>>(new Map());

  const counts = React.useMemo(() => {
    // A blanked search must read as empty everywhere, not just in the table.
    const blank = forced === 'zero-results' || forced === 'no-search' || searchPhase === 'draft';
    if (blank) return { all: 0, shortlist: 0, passed: 0, public: 0, internal: 0 };
    if (searchPhase === 'running') {
      const matched = Math.round((store.scanProgress / Math.max(1, SEARCH.profilesScored)) * SEARCH.matched);
      return { all: matched, shortlist: shortlist.size, passed: 0, public: matched, internal: 0 };
    }
    return {
      all: candidates.filter((c) => !passed.has(c.id)).length,
      shortlist: shortlist.size,
      passed: passed.size,
      public: candidates.filter((c) => c.source === 'public' && !passed.has(c.id)).length,
      internal: forced === 'ats-disconnected'
        ? 0
        : candidates.filter((c) => c.source === 'internal' && !passed.has(c.id)).length,
    };
  }, [candidates, shortlist, passed, forced, searchPhase, store.scanProgress]);

  const blankSearch = forced === 'zero-results' || forced === 'no-search';

  const openCandidate = candidates.find((c) => c.id === openId) ?? null;
  const openIndex = ranked.findIndex((r) => r.candidate.id === openId);

  const selectedList = ranked.filter((r) => selected.has(r.candidate.id)).map((r) => r.candidate);
  const allSelected = ranked.length > 0 && selected.size === ranked.length;

  const setOpen = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('c', id); else next.delete('c');
    setParams(next, { replace: true });
  };

  /* -------------------------- re-weight controls ------------------------- */

  const previewChange = draftCriteria ? bandChangeCount(pool, criteria, draftCriteria) : 0;
  // Shares follow the draft, so the percentages move with the scale you are dragging.
  const railShares = React.useMemo(() => weightShares(activeCriteria), [activeCriteria]);

  const commitCriteria = (next: Criterion[]) => {
    // Capture movement before the list re-sorts.
    prevOrder.current = new Map(ranked.map((r, i) => [r.candidate.id, i]));
    store.setCriteria(next);
    setDraftCriteria(null);

    const after = rankAll(pool, next);
    const d = new Map<string, number>();
    after.forEach((r, i) => {
      const before = prevOrder.current.get(r.candidate.id);
      if (before !== undefined && before !== i) d.set(r.candidate.id, before - i);
    });
    setDeltas(d);
    setTimeout(() => setDeltas(new Map()), 6000);

    const changed = bandChangeCount(pool, criteria, next);
    toast(`Rankings updated · ${changed} candidate${changed === 1 ? '' : 's'} changed band`, {
      label: 'Undo',
      onClick: () => { store.setCriteria(criteria); setDeltas(new Map()); },
    });
  };

  const setWeight = (id: string, weight: number) => {
    const base = draftCriteria ?? criteria;
    setDraftCriteria(base.map((c) => (c.id === id ? { ...c, weight } : c)));
  };

  const toggleType = (id: string) => {
    const base = draftCriteria ?? criteria;
    const next = base.map((c) =>
      c.id === id ? { ...c, type: c.type === 'required' ? ('preferred' as const) : ('required' as const) } : c);
    commitCriteria(next);
  };

  /* -------------------------------- render ------------------------------- */

  // Outreach acts on the shortlist, so it lives with the shortlist — not in the
  // header, where it was permanently present and usually not the next thing to do.
  // It is docked to the foot of the list column rather than floating over it,
  // and it yields that slot to the bulk bar the moment rows are selected.
  //
  // It shows on All as well as Shortlist: shortlisting happens on All, via the
  // bookmark at the end of each row, so this is where the shortlist gets built
  // and where it should be actionable. It cannot nag — it does not exist until
  // something is in the shortlist. Passed is a different frame; not there.
  const shortlisted = React.useMemo(
    () => candidates.filter((c) => shortlist.has(c.id)),
    [candidates, shortlist],
  );
  const showOutreach = view !== 'passed' && shortlisted.length > 0 && selected.size === 0;
  /* The tray used to vanish mid-frame — the list snapped up under the cursor,
     and the handover to the bulk bar read as two unrelated things. Leaving is
     now a state it passes through. */
  const tray = useExit(showOutreach);
  /* While it leaves, the shortlist behind it may already be empty — the tray
     names people, so it keeps the last list it had rather than reading one
     that no longer exists. */
  const trayPeople = React.useRef(shortlisted);
  if (shortlisted.length) trayPeople.current = shortlisted;
  // Only overlay while the bulk bar is claiming the same slot; leaving because
  // the shortlist emptied should hold its place so the list settles after it.
  const trayOverlays = tray.leaving && selected.size > 0;

  const headerActions = (
    <Button size="sm" variant="secondary" color="altBrand" icon={<PencilSimple size={14} />} onClick={() => navigate('/search')}>
      Edit search
    </Button>
  );

  return (
    <AppShell screen="candidates" breadcrumbs={['Searches', SEARCH.name]} actions={headerActions}>
      <div className="h-full flex flex-col">
        {/* Counts + view switch */}
        <div className="shrink-0 px-5 pt-3.5 pb-2 flex items-center gap-4 flex-wrap">
          <Tabs
            variant="segmented"
            value={view}
            onChange={(v) => { setView(v); setSelected(new Set()); }}
            items={[
              { id: 'all', label: 'All', count: counts.all },
              { id: 'shortlist', label: 'Shortlist', count: counts.shortlist },
              { id: 'passed', label: 'Passed', count: counts.passed },
            ]}
          />
          <div className="text-xs text-[var(--fg3)] flex items-center gap-1.5 min-w-0 truncate">
            <Sparkle size={12} weight="fill" className="text-[var(--ai-magic-text)] shrink-0" />
            {store.searchPhase === 'draft'
              ? 'No search has been run yet'
              : store.searchPhase === 'running'
                ? `Ema is scoring · ${store.scanProgress.toLocaleString()} of ${SEARCH.profilesScored.toLocaleString()} profiles`
                : blankSearch
              ? `Ema scored ${SEARCH.profilesScored.toLocaleString()} of ${SEARCH.profilesScanned.toLocaleString()} profiles · 0 matched`
              : `Ema scored ${SEARCH.profilesScored.toLocaleString()} of ${SEARCH.profilesScanned.toLocaleString()} profiles · ${SEARCH.matched} matched`}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {selectedList.length >= 2 && selectedList.length <= 4 && (
              <Button size="sm" variant="secondary" color="altBrand" icon={<Users size={14} />} onClick={() => setCompareOpen(true)}>
                Compare ({selectedList.length})
              </Button>
            )}
            {selectedList.length > 4 && (
              <Tooltip content="Compare up to 4 candidates">
                <Button size="sm" variant="secondary" color="altBrand" icon={<Users size={14} />} disabled>
                  Compare ({selectedList.length})
                </Button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Source tabs + filter chips */}
        <div className="shrink-0 px-5 pb-2 flex items-center gap-3 flex-wrap border-b border-[var(--beige-300)]">
          <Tabs
            value={sourceTab}
            onChange={setSourceTab}
            className="border-b-0"
            items={[
              { id: 'all', label: 'All sources' },
              { id: 'public', label: 'Public profiles', count: counts.public },
              { id: 'internal', label: 'Internal talent', count: counts.internal },
            ]}
          />
          <div className="ml-auto flex items-center gap-2 py-1.5">
            <CandidateSearch
              resultCount={ranked.length}
              filters={LIST_FILTERS}
              active={chips}
              onToggleFilter={(id) => setChips((prev) => {
                const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
              })}
              onClearFilters={() => setChips(new Set())}
            />
            <div className="w-px h-5 bg-[var(--beige-400)]" />
            <label className={cx(
              'flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-transparent text-xs text-[var(--fg2)]',
              'transition-colors duration-150 hover:border-[var(--beige-500)] hover:bg-white',
              'focus-within:border-[var(--focus-border)] focus-within:bg-white focus-within:shadow-focus',
            )}>
              <CaretUpDown size={13} className="text-[var(--fg3)]" />
              <select
                aria-label="Sort candidates by"
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                className="bg-transparent text-xs text-[var(--fg1)] font-medium outline-none cursor-pointer focus-visible:shadow-none"
              >
                <option value="score">Score</option>
                <option value="recent">Recently active</option>
                <option value="coverage">Coverage</option>
              </select>
            </label>
            {/* Sliders reads as "filters" everywhere else in software, so the
                scorecard gets its own mark rather than competing with the funnel. */}
            <button
              onClick={() => setRailOpen((o) => !o)}
              aria-pressed={railOpen}
              className={cx(
                'flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-xs font-medium cursor-pointer',
                'transition-colors duration-150 active:bg-[var(--beige-200)]',
                railOpen
                  ? 'bg-[var(--success-bg-subtle)] border-[var(--brand-primary)] text-[var(--success-text)] hover:bg-[var(--green-200)]'
                  : 'bg-white border-[var(--beige-500)] text-[var(--fg2)] hover:border-[var(--focus-border)] hover:bg-[var(--beige-50)]',
              )}
            >
              <Ranking size={14} weight={railOpen ? 'bold' : 'regular'} />
              Scorecard
            </button>
          </div>
        </div>

        {/* Main + rail */}
        <div className="flex-1 min-h-0 flex">
          <div className="relative flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto" data-usage="score">
            {forced === 'ats-disconnected' && atsBanner && (
              <div className="px-5 pt-3">
                <Banner
                  variant="warning"
                  icon={<ShieldWarning size={15} weight="bold" />}
                  title="Greenhouse is disconnected."
                  action={<Button size="xs" variant="secondary" color="altBrand">Reconnect</Button>}
                  onDismiss={() => setAtsBanner(false)}
                >
                  Showing public profiles only — 0 internal candidates in this list.
                </Banner>
              </div>
            )}
            {forced === 'partial-failure' && (
              <div className="px-5 pt-3">
                <Banner
                  variant="warning"
                  icon={<ShieldWarning size={15} weight="bold" />}
                  title="Search stopped after 612 of about 900 profiles."
                  action={
                    <div className="flex gap-1.5">
                      <Button size="xs" variant="secondary" color="altBrand">Use partial results</Button>
                      <Button size="xs">Resume search</Button>
                    </div>
                  }
                >
                  Results below are partial.
                </Banner>
              </div>
            )}

            <CandidateTable
              ranked={ranked}
              criteria={activeCriteria}
              selected={selected}
              deltas={deltas}
              outreachByCandidate={new Map(outreach.map((o) => [o.candidateId, o]))}
              shortlist={shortlist}
              allSelected={allSelected}
              onToggleAll={() => setSelected(allSelected ? new Set() : new Set(ranked.map((r) => r.candidate.id)))}
              onToggle={(id: string) => setSelected((prev) => {
                const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
              })}
              onOpen={setOpen}
              onShortlist={store.toggleShortlist}
              view={view}
              forced={forced}
              railOpen={railOpen}
              searchPhase={store.searchPhase}
              scanProgress={store.scanProgress}
              query={query}
              setQuery={setQuery}
              chipsActive={chips.size > 0}
              onClearChips={() => setChips(new Set())}
              onWiden={() => navigate('/search')}
            />
          </div>

          {/* Docked to the foot of the list column, not floating over it: the
              scroller ends where the tray begins, so the last row is reachable
              without a scrim or bottom padding compensating for an overlay.
              It shows the shortlist rather than asserting a number, which is
              what earns it the space on the All tab too. */}
          {tray.render && (
            <div className={cx(trayOverlays && 'absolute inset-x-0 bottom-0 z-10')}>
              <ShortlistTray
                people={shortlisted.length ? shortlisted : trayPeople.current}
                leaving={tray.leaving}
                // Committing hands the decision to the Preflight sheet; the tray
                // settles back rather than sitting at full strength behind it.
                dimmed={preflightOpen}
                onStart={() => setPreflightOpen(true)}
              />
            </div>
          )}
          </div>

          {railOpen && (
            <aside aria-label="Ranking controls" data-usage="rail" className="w-[300px] shrink-0 border-l border-[var(--beige-300)] bg-[var(--beige-50)] overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)]">Ranking controls</div>
                  <IconButton icon={<X size={14} />} onClick={() => setRailOpen(false)} title="Hide" />
                </div>
                <p className="text-xs text-[var(--fg2)] mb-3 leading-[17px]">
                  Re-weighting re-ranks the list immediately. Required criteria count double.
                </p>

                {draftCriteria && (
                  <div className="mb-3 rounded-md border border-[var(--info-border)] bg-[var(--info-bg-subtle)] px-2.5 py-2 text-xs text-[var(--info-text)]">
                    <span className="font-medium">{previewChange} candidate{previewChange === 1 ? '' : 's'} change band.</span>
                    <div className="flex gap-1.5 mt-2">
                      <Button size="xs" onClick={() => commitCriteria(draftCriteria)}>Apply</Button>
                      <Button size="xs" variant="ghost" color="altBrand" onClick={() => setDraftCriteria(null)}>Cancel</Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {activeCriteria.map((c) => (
                    <div key={c.id} className="rounded-lg border border-[var(--beige-400)] bg-white p-2.5">
                      <div className="text-sm text-[var(--fg1)] leading-[18px]">{c.name}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => toggleType(c.id)}
                          className={cx(
                            'text-[10px] uppercase tracking-[1px] font-bold px-1.5 py-1 rounded-xs cursor-pointer transition-colors',
                            c.type === 'required'
                              ? 'bg-[var(--success-bg)] text-[var(--success-text)] hover:bg-[var(--green-300)] active:bg-[var(--green-400)]'
                              : 'bg-[var(--beige-200)] text-[var(--fg2)] hover:bg-[var(--beige-300)] active:bg-[var(--beige-400)]',
                          )}
                          title="Toggle required / preferred"
                        >
                          {c.type}
                        </button>
                        {/* A level scale, not ±1: the question here is how much
                            this criterion matters against the other five. */}
                        <div className="ml-auto">
                          <WeightScale
                            name={c.name}
                            value={c.weight}
                            share={railShares[c.id]}
                            shareShort
                            onChange={(n) => setWeight(c.id, n)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  size="sm" variant="ghost" color="altBrand" block className="mt-3"
                  icon={<ArrowCounterClockwise size={13} />}
                  onClick={() => { store.resetCriteria(); setDraftCriteria(null); toast('Scorecard reset to search defaults.'); }}
                >
                  Reset to search defaults
                </Button>

                <div className="mt-4 pt-3 border-t border-[var(--beige-400)]">
                  <div className="text-xs text-[var(--fg2)] leading-[17px]">
                    <span className="font-medium text-[var(--fg1)]">Corrections apply to this search only.</span>{' '}
                    Ema does not carry them across to other searches.
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>

        {/* Bulk selection bar */}
        {selected.size > 0 && (
          <div data-usage="bulk" className="shrink-0 bg-[var(--beige-960)] text-white px-4 py-2.5 flex items-center gap-3 flex-wrap animate-[emaRise_200ms_var(--ease-out-quint)]">
            <span className="text-sm font-medium">
              {selected.size} selected
              {selected.size > ranked.length && ` across ${Math.ceil(selected.size / 50)} pages`}
            </span>
            <button onClick={() => setSelected(new Set())}
              className="text-xs text-[var(--beige-600)] rounded-xs px-1 py-0.5 hover:text-white active:text-[var(--beige-500)] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus-visible:shadow-none">
              Clear
            </button>
            <div className="w-px h-5 bg-[var(--beige-930)]" />
            {[
              { label: 'Shortlist', run: () => { store.shortlistMany([...selected]); toast(`${selected.size} added to shortlist`, { label: 'Undo', onClick: () => store.removeFromShortlist([...selected]) }); setSelected(new Set()); } },
              { label: 'Remove', run: () => { store.removeFromShortlist([...selected]); toast(`${selected.size} removed from shortlist`); setSelected(new Set()); } },
              { label: 'Start outreach', run: () => setPreflightOpen(true) },
              { label: 'Mark as not a fit', run: () => { store.pass([...selected]); toast(`${selected.size} marked as not a fit`, { label: 'Undo', onClick: () => {} }); setSelected(new Set()); } },
            ].map((a) => (
              <button key={a.label} onClick={a.run}
                className={cx(
                  'text-sm px-2.5 py-1 rounded-sm cursor-pointer transition-colors',
                  'hover:bg-[var(--beige-930)] active:bg-[var(--beige-900)]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus-visible:shadow-none',
                )}>
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {openCandidate && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          <div className="pointer-events-auto">
            <DrawerHost
              candidate={openCandidate}
              criteria={activeCriteria}
              onClose={() => setOpen(null)}
              onPrev={openIndex > 0 ? () => setOpen(ranked[openIndex - 1].candidate.id) : undefined}
              onNext={openIndex >= 0 && openIndex < ranked.length - 1 ? () => setOpen(ranked[openIndex + 1].candidate.id) : undefined}
            />
          </div>
        </div>
      )}

      <CompareModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        candidates={selectedList.slice(0, 4)}
        criteria={activeCriteria}
      />

      <PreflightSheet
        open={preflightOpen}
        onClose={() => setPreflightOpen(false)}
        candidateIds={selected.size ? [...selected] : [...shortlist]}
        onConfirm={(ids) => {
          store.addToOutreach(ids);
          setPreflightOpen(false);
          setSelected(new Set());
          navigate('/outreach');
        }}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <UsageOverlay screen="candidates" />
    </AppShell>
  );
}

/* ------------------------------ Shortlist tray ----------------------------- */

/**
 * The terminal action of the product (shortlist -> outreach), docked to the
 * foot of the list column.
 *
 * It is a row of the page, not an overlay: the scroller above it ends where it
 * begins, so nothing runs underneath and the last candidate stays reachable
 * with no scrim and no compensating bottom padding. It reports who is in the
 * shortlist — faces, then names — and what pressing it starts, because a bare
 * count told you the size of a thing you could not see.
 */
/** Each face steps further right than the one before it, so the stack opens. */
const FAN = 'inline-flex transition-transform duration-150 ease-[var(--ease-out-quint)] '
  + '[@media(hover:hover)]:group-hover:[transform:translateX(var(--fan))]';

/**
 * Keeps a thing mounted while it leaves.
 *
 * `render` outlives `show` by the length of the exit, and `leaving` says which
 * of the two states it is in — enough for a fade-out without a library.
 */
function useExit(show: boolean, ms = 160) {
  const [render, setRender] = React.useState(show);
  const [leaving, setLeaving] = React.useState(false);

  React.useEffect(() => {
    if (show) { setRender(true); setLeaving(false); return; }
    setLeaving(true);
    const t = setTimeout(() => { setRender(false); setLeaving(false); }, ms);
    return () => clearTimeout(t);
  }, [show, ms]);

  return { render, leaving };
}

function ShortlistTray({
  people, onStart, leaving, dimmed,
}: { people: Candidate[]; onStart: () => void; leaving?: boolean; dimmed?: boolean }) {
  const n = people.length;
  const shown = people.slice(0, 4);
  const names = n === 1
    ? people[0].name
    : n === 2
      ? `${people[0].name} and ${people[1].name}`
      : `${people[0].name}, ${people[1].name} and ${n - 2} other${n - 2 === 1 ? '' : 's'}`;

  return (
    <div
      className={cx(
        'shrink-0 flex items-center gap-3 px-5 py-2.5',
        'bg-[var(--bg2)] border-t border-[var(--beige-400)] shadow-[var(--shadow-md)]',
        'transition-opacity duration-200 ease-[var(--ease-out-quint)]',
        // Backwards fill, never both: a filled animation would leave this a
        // permanent stacking context and trap the menus above it.
        leaving
          ? 'animate-[emaOut_160ms_var(--ease-out-quint)_forwards]'
          : 'animate-[emaRise_240ms_var(--ease-out-quint)_backwards]',
        dimmed && 'opacity-60',
      )}
    >
      {/* Who, at a glance. Names carry the same information for screen
          readers, so the stack itself stays decorative. */}
      {/* The faces overlap by 6px; hovering separates them so each is legible.
          Gated on a real hover pointer — on touch every tap would trigger it. */}
      <div className="group flex shrink-0 pl-1.5" aria-hidden>
        {shown.map((c, i) => (
          <span key={c.id} className={cx(FAN, '-ml-1.5')} style={{ ['--fan' as string]: `${i * 2}px` }}>
            <Avatar name={c.name} size={26} tone="beige" className="ring-2 ring-[var(--bg2)]" />
          </span>
        ))}
        {n > shown.length && (
          <span
            className={cx(
              FAN, '-ml-1.5 items-center justify-center size-[26px] rounded-full',
              'ring-2 ring-[var(--bg2)] bg-[var(--beige-200)] text-[var(--fg2)] text-[10px] font-bold tabular-nums',
            )}
            style={{ ['--fan' as string]: `${shown.length * 2}px` }}
          >
            +{n - shown.length}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {/* The count changes from the All tab and from the bulk bar too. */}
        <div role="status" className="text-sm font-bold text-[var(--fg1)]">
          {/* Re-keyed on the count, so a change replays the entrance on the
              one word that changed. */}
          <span key={n} className="inline-block tabular-nums animate-[emaPop_220ms_var(--ease-out-quint)_backwards]">
            {n} shortlisted
          </span>
        </div>
        <div className="text-xs text-[var(--fg2)] truncate">
          {names} · 4-step sequence, drafts for your approval
        </div>
      </div>

      <Button
        size="md"
        icon={<PaperPlaneTilt size={15} weight="fill" />}
        onClick={onStart}
        aria-label={`Start outreach with ${n} shortlisted candidate${n === 1 ? '' : 's'}`}
        // The global focus halo is green and invisible against a green button;
        // this is the same ring held off it by a white gap.
        className="shrink-0 focus-visible:shadow-[0_0_0_2px_var(--bg2),0_0_0_4px_var(--brand-primary)]"
      >
        Start outreach
      </Button>
    </div>
  );
}

function DrawerHost(props: React.ComponentProps<typeof CandidateDrawer>) {
  return (
    <>
      <div onClick={props.onClose} className="fixed inset-0 bg-[rgba(35,33,25,0.32)] animate-[emaFade_150ms_var(--ease-out-quint)]" />
      <aside
        className="fixed right-0 top-0 bottom-0 bg-white border-l border-[var(--beige-400)] shadow-[var(--shadow-lg)] flex flex-col animate-[emaSlide_300ms_var(--ease-out-quint)]"
        style={{ width: 560 }}
        data-usage="evidence"
      >
        <CandidateDrawer {...props} />
      </aside>
    </>
  );
}

/* ------------------------------ the table -------------------------------- */

function CandidateTable({
  ranked, criteria, selected, deltas, shortlist, outreachByCandidate, allSelected,
  onToggleAll, onToggle, onOpen, onShortlist, view, forced, railOpen, chipsActive, onClearChips, onWiden,
  query, setQuery,
  searchPhase, scanProgress,
}: any) {
  if (searchPhase === 'running') return <SearchingPanel scanned={scanProgress} />;

  if (searchPhase === 'draft') {
    return (
      <EmptyState
        icon={<UsersThree size={22} />}
        title="No search has been run yet."
        body="Describe the role, set your filters and scorecard, then begin the search to see candidates here."
        action={<Button size="sm" onClick={onWiden}>Set up the search</Button>}
      />
    );
  }

  if (!ranked.length) {
    if (forced === 'zero-results') {
      return (
        <EmptyState
          icon={<UsersThree size={22} />}
          title="No candidates matched all 4 must-have filters."
          body="Ema found 340 profiles matching 3 of 4. Relaxing one filter opens the pool back up."
        >
          <div className="flex flex-col gap-2 mt-5 w-full max-w-sm">
            {[
              { label: 'Drop "PhD required"', n: 112 },
              { label: 'Widen location to EU remote', n: 89 },
              { label: 'Move "8+ years" to preferred', n: 203 },
            ].map((r) => (
              <button key={r.label} onClick={onWiden}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md border border-[var(--beige-500)] bg-white hover:border-[var(--focus-border)] hover:bg-[var(--green-50)] cursor-pointer transition-colors text-left">
                <span className="text-sm text-[var(--fg1)]">{r.label}</span>
                <span className="text-sm font-medium text-[var(--success-text)] tabular-nums shrink-0">→ {r.n} candidates</span>
              </button>
            ))}
          </div>
        </EmptyState>
      );
    }
    if (forced === 'gate-wipeout') {
      return (
        <EmptyState
          icon={<ShieldWarning size={22} />}
          title="0 candidates cleared all required criteria."
          body={'The tightest is "Production model serving at scale" — 4 of 112 clear it.'}
          action={<Button size="sm" onClick={onWiden}>Make it preferred</Button>}
          secondary={<Button size="sm" variant="secondary" color="altBrand" onClick={onWiden}>Edit scorecard</Button>}
        />
      );
    }
    if (forced === 'no-search') {
      return (
        <EmptyState
          icon={<UsersThree size={22} />}
          title="No searches yet."
          body="Describe a role, add filters, then begin the search to see candidates."
          action={<Button size="sm" onClick={onWiden}>New search</Button>}
        />
      );
    }
    if (query.trim()) return <NoQueryMatch query={query} onClear={() => setQuery('')} />;
    if (chipsActive) {
      return (
        <EmptyState
          icon={<UsersThree size={22} />}
          title="No candidates match these table filters."
          body="The filters above narrowed everything out. The search itself still has results."
          action={<Button size="sm" variant="secondary" color="altBrand" onClick={onClearChips}>Clear filters</Button>}
        />
      );
    }
    if (view === 'shortlist') {
      return (
        <EmptyState
          icon={<BookmarkSimple size={22} />}
          title="Nothing shortlisted yet."
          body="Select candidates in the list to build your shortlist. Shortlisted people stay put even if you change the scorecard."
        />
      );
    }
    return <EmptyState icon={<UsersThree size={22} />} title="No candidates here." />;
  }

  return (
    <table className="w-full border-collapse table-fixed">
      <colgroup>
        <col style={{ width: 44 }} />
        <col style={{ width: railOpen ? '23%' : '19%' }} />
        <col style={{ width: railOpen ? '14%' : '12%' }} />
        {!railOpen && <col style={{ width: '13%' }} />}
        <col style={{ width: 118 }} />
        {/* Assessment takes the slack: it is the only cell holding a sentence. */}
        <col />
        <col style={{ width: railOpen ? 150 : 164 }} />
        <col style={{ width: 44 }} />
      </colgroup>
      <thead className="sticky top-0 z-10 bg-[var(--beige-50)]">
        <tr className="border-b border-[var(--beige-400)]">
          <th scope="col" className="pl-5 py-2.5 text-left">
            <Checkbox checked={allSelected} onChange={onToggleAll} label="Select all" />
          </th>
          {(railOpen
            ? ['Candidate', 'Company', 'Score', 'Assessment', 'Outreach stage']
            : ['Candidate', 'Company', 'Role', 'Score', 'Assessment', 'Outreach stage']
          ).map((h) => (
            <th key={h} className="py-2 pr-3 text-left text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)]">
              {h}
            </th>
          ))}
          <th className="pr-5"><span className="sr-only">Shortlist</span></th>
        </tr>
      </thead>
      <tbody>
        {ranked.map(({ candidate, ranking }: any) => {
          const delta = deltas.get(candidate.id);
          const rec = outreachByCandidate.get(candidate.id);
          const isShort = shortlist.has(candidate.id);
          return (
            <tr
              key={candidate.id}
              tabIndex={0}
              aria-label={`Open ${candidate.name}`}
              onClick={() => onOpen(candidate.id)}
              onKeyDown={(e) => {
                // Enter and Space are what a row-as-button owes the keyboard.
                if (e.key === 'Enter' || e.key === ' ') {
                  if (e.target !== e.currentTarget) return;
                  e.preventDefault();
                  onOpen(candidate.id);
                }
              }}
              className={cx(
                'border-b border-[var(--beige-200)] cursor-pointer transition-colors duration-150 group',
                'hover:bg-[var(--beige-100)] active:bg-[var(--beige-200)]',
                // Chrome will not paint a ring around a table row, so focus is a
                // tint plus an accent bar on the first cell.
                'outline-none focus-visible:bg-[var(--beige-200)]',
                'focus-visible:[&>td:first-child]:shadow-[inset_3px_0_0_var(--brand-primary)]',
              )}
            >
              <td className="pl-5 pt-4 pb-2.5 align-top" onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={selected.has(candidate.id)} onChange={() => onToggle(candidate.id)} label={`Select ${candidate.name}`} />
              </td>

              <td className="py-2.5 pr-3 align-top">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={candidate.name} size={28} tone={candidate.avatarTone} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpen(candidate.id); }}
                        className="text-sm font-medium text-[var(--fg1)] truncate text-left rounded-xs hover:underline active:text-[var(--brand-primary)] cursor-pointer"
                      >
                        {candidate.name}
                      </button>
                      {delta !== undefined && (
                        <span className={cx(
                          'text-[10px] font-bold tabular-nums shrink-0',
                          delta > 0 ? 'text-[var(--success-text)]' : 'text-[var(--fg3)]',
                        )}>
                          {delta > 0 ? `▲${delta}` : `▼${Math.abs(delta)}`}
                        </span>
                      )}
                    </div>
                    <div className="text-xs leading-4 text-[var(--fg3)] truncate flex items-center gap-1">
                      {candidate.yearsExperience} yrs · {candidate.location}
                      {candidate.source === 'internal' && <Lock size={10} className="shrink-0" />}
                    </div>
                  </div>
                </div>
              </td>

              <td className="py-2.5 pr-3 align-top">
                <div className="text-sm leading-[18px] text-[var(--fg1)] truncate">{candidate.company}</div>
                <div className="text-xs leading-4 text-[var(--fg3)] mt-0.5">{candidate.companyTenure}</div>
              </td>

              {!railOpen && (
                <td className="py-2.5 pr-3 align-top">
                  <div className="text-sm leading-[18px] text-[var(--fg2)] line-clamp-2">{candidate.title}</div>
                </td>
              )}

              <td className="py-2.5 pr-3 align-top" onClick={(e) => e.stopPropagation()}>
                <ScoreCell candidate={candidate} criteria={criteria} />
              </td>

              {/* Signals ride with the sentence they qualify: two sparse columns
                  read as a hole in the table, one dense column reads as a row. */}
              <td className="py-2.5 pr-3 align-top">
                <div className="flex items-start gap-1.5 min-w-0">
                  {candidate.signals.length > 0 && (
                    <span className="flex items-center gap-1 shrink-0 pt-px">
                      {candidate.signals.map((s: any) => {
                        const Icon = (SIGNAL_ICON as any)[s.kind] ?? Clock;
                        return (
                          <Tooltip key={s.kind} content={<span className="text-xs">{s.detail ?? s.label}</span>} width={240}>
                            <span className={cx(
                              'inline-flex items-center justify-center size-[18px] rounded-xs',
                              s.kind === 'current-employee' || s.kind === 'duplicate'
                                ? 'text-[var(--blue-930)] bg-[var(--info-bg-subtle)]'
                                : 'text-[var(--warning-text)] bg-[var(--warning-bg-subtle)]',
                            )}>
                              <Icon size={11} weight="bold" />
                            </span>
                          </Tooltip>
                        );
                      })}
                    </span>
                  )}
                  <span className={cx(
                    'text-xs leading-[17px] line-clamp-2 min-w-0',
                    ranking.gateFailed && !ranking.gateOverridden ? 'text-[var(--error-text)]' : 'text-[var(--fg2)]',
                  )}>
                    {reasonClause(candidate, criteria)}
                  </span>
                </div>
              </td>

              <td className="py-2.5 pr-3 align-top">
                {rec
                  ? <Badge variant={STATES[rec.state as OutreachState].tone as any} size="sm">{STATES[rec.state as OutreachState].label}</Badge>
                  : <span className="text-xs leading-[18px] text-[var(--fg3)] inline-block">Not contacted</span>}
              </td>

              <td className="pr-5 py-2.5 align-top" onClick={(e) => e.stopPropagation()}>
                <IconButton
                  icon={<BookmarkSimple size={15} weight={isShort ? 'fill' : 'regular'} />}
                  onClick={() => onShortlist(candidate.id)}
                  title={isShort ? 'Remove from shortlist' : 'Shortlist'}
                  className={cx(
                    isShort
                      ? 'text-[var(--brand-primary)] hover:text-[var(--brand-primary-accent)]'
                      : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100',
                  )}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Search-running is a live panel, not a spinner — rows stream in ranked order. */
function SearchingPanel({ scanned = 0 }: { scanned?: number }) {
  const matched = Math.round((scanned / Math.max(1, SEARCH.profilesScored)) * SEARCH.matched);
  return (
    <div className="p-5">
      <Card className="p-4 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <Sparkle size={14} weight="fill" className="text-[var(--ai-magic-text)]" />
          <span className="text-sm font-medium text-[var(--fg1)]">Ema is searching.</span>
          <span className="text-sm text-[var(--fg2)] tabular-nums">
            {scanned.toLocaleString()} profiles scored · {matched} matched
          </span>
          <Button size="xs" variant="ghost" color="destructive" className="ml-auto">Cancel</Button>
        </div>
        <div className="space-y-1.5 text-xs">
          {[
            { label: 'Public profiles', done: scanned > SEARCH.profilesScored * 0.45, n: '2,438 scanned' },
            { label: 'Internal talent (Greenhouse)', done: scanned >= SEARCH.profilesScored, n: 'in progress' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-2">
              <span className={cx('size-3.5 rounded-full flex items-center justify-center text-white text-[9px]',
                s.done ? 'bg-[var(--brand-primary)]' : 'bg-[var(--beige-500)]')}>
                {s.done ? '✓' : ''}
              </span>
              <span className="text-[var(--fg1)]">{s.label}</span>
              <span className="text-[var(--fg3)]">{s.n}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-[var(--beige-300)] text-xs text-[var(--fg2)]">
          Ranking updates as more profiles are scored.
        </div>
      </Card>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5 border-b border-[var(--beige-200)]" style={{ opacity: 1 - i * 0.1 }}>
          <div className="ema-skeleton size-7 rounded-full" />
          <div className="ema-skeleton h-3.5 rounded-xs" style={{ width: 140 }} />
          <div className="ema-skeleton h-3.5 rounded-xs" style={{ width: 90 }} />
          <div className="ema-skeleton h-3.5 rounded-xs ml-auto" style={{ width: 170 }} />
        </div>
      ))}
    </div>
  );
}
