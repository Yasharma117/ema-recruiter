import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookmarkSimple, PaperPlaneTilt, PencilSimple, Question, Clock, ShieldWarning, Lock,
} from '@phosphor-icons/react';
import type { Candidate, Criterion } from '../lib/types';
import { rankAll, rank, applyOverrides, effectiveScore, matchesQuery } from '../lib/scoring';
import { SEARCH } from '../data/search';
import { Avatar, Badge, Button, Tabs, ToastStack, cx } from '../components/ui';
import { AppShell } from '../components/AppShell';
import { ScorePill, Sparkbar, EvidenceCard } from '../components/Score';
import { PreflightSheet } from '../screens/Preflight';
import { useStore } from '../store';
import { CandidateSearch, NoQueryMatch } from '../components/CandidateSearch';
import { UsageOverlay } from './LayoutPicker';

/**
 * Candidates · B — Split pane.
 *
 * Bets that evidence needs permanent real estate. A 2025 study comparing
 * inline / sidebar / hover source presentation found the sidebar produced the
 * highest rate of source examination and hover the lowest — so here the
 * evidence is never behind a hover, and reading a profile costs zero clicks.
 *
 * Sacrifices roughly half the visible rows (~9 vs ~17). For a screen whose
 * dominant verb is *reject*, that is a real cost, which is why this is a test
 * rather than a foregone conclusion.
 */
export function CandidatesSplit() {
  const navigate = useNavigate();
  const store = useStore();
  const { criteria, shortlist, passed, searchPhase, toasts, dismissToast, toast } = store;

  const candidates = React.useMemo(
    () => applyOverrides(store.candidates, store.overrides),
    [store.candidates, store.overrides],
  );

  const [view, setView] = React.useState<'all' | 'shortlist' | 'passed'>('all');
  const [focusId, setFocusId] = React.useState<string | null>(null);
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

  const ranked = React.useMemo(() => rankAll(pool, criteria), [pool, criteria]);
  const idx = Math.max(0, ranked.findIndex((r) => r.candidate.id === focusId));
  const focused = ranked[idx]?.candidate ?? null;

  React.useEffect(() => {
    if (!focusId && ranked.length) setFocusId(ranked[0].candidate.id);
  }, [ranked, focusId]);

  // Keyboard is the point of this layout — moving between candidates must be free.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusId(ranked[Math.min(ranked.length - 1, idx + 1)]?.candidate.id ?? focusId);
      }
      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusId(ranked[Math.max(0, idx - 1)]?.candidate.id ?? focusId);
      }
      if (e.key === 's' && focused) { e.preventDefault(); store.toggleShortlist(focused.id); }
      if (e.key === 'x' && focused) { e.preventDefault(); store.pass([focused.id]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ranked, idx, focused, focusId]);

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
        <div className="shrink-0 px-5 pt-3.5 pb-2.5 flex items-center gap-4 border-b border-[var(--beige-300)]">
          <Tabs
            variant="segmented"
            value={view}
            onChange={(v) => { setView(v); setFocusId(null); }}
            items={[
              { id: 'all', label: 'All', count: candidates.filter((c) => !passed.has(c.id)).length },
              { id: 'shortlist', label: 'Shortlist', count: shortlist.size },
              { id: 'passed', label: 'Not a fit', count: passed.size },
            ]}
          />
          <span className="text-xs text-[var(--fg3)]">
            <kbd className="font-mono">J</kbd>/<kbd className="font-mono">K</kbd> move ·{' '}
            <kbd className="font-mono">S</kbd> shortlist · <kbd className="font-mono">X</kbd> pass
          </span>
          <CandidateSearch resultCount={ranked.length} className="ml-auto" />
        </div>

        <div className="flex-1 min-h-0 flex">
          {/* List — deliberately narrower than variant A */}
          <div className="w-[480px] shrink-0 border-r border-[var(--beige-300)] overflow-y-auto" data-usage="score">
            {ranked.map(({ candidate, ranking }) => {
              const on = candidate.id === focusId;
              return (
                <button
                  key={candidate.id}
                  onClick={() => setFocusId(candidate.id)}
                  className={cx(
                    'w-full text-left flex items-center gap-2.5 px-4 py-2.5 border-b border-[var(--beige-200)] cursor-pointer transition-colors duration-150',
                    on ? 'bg-[var(--beige-200)]' : 'hover:bg-[var(--beige-100)]',
                  )}
                >
                  <Avatar name={candidate.name} size={28} tone={candidate.avatarTone} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-[var(--fg1)] truncate">{candidate.name}</span>
                      {shortlist.has(candidate.id) && (
                        <BookmarkSimple size={12} weight="fill" className="text-[var(--brand-primary)] shrink-0" />
                      )}
                    </span>
                    <span className="block text-xs text-[var(--fg3)] truncate">
                      {candidate.title} · {candidate.company}
                    </span>
                  </span>
                  <span className="shrink-0 flex items-center gap-1.5">
                    <Sparkbar candidate={candidate} criteria={criteria} />
                    <ScorePill ranking={ranking} size="sm" />
                    <span className={cx('text-xs tabular-nums w-[38px] text-right',
                      ranking.lowCoverage ? 'text-[var(--warning-text)]' : 'text-[var(--fg3)]')}>
                      {ranking.scored} of {ranking.total}
                    </span>
                  </span>
                </button>
              );
            })}
            {!ranked.length && (
              store.query.trim()
                ? <NoQueryMatch query={store.query} onClear={() => store.setQuery('')} compact={true} />
                : <div className="p-8 text-center text-sm text-[var(--fg2)]">Nothing here yet.</div>
            )}
          </div>

          {/* Profile — persistent, evidence always visible */}
          {focused ? (
            <ProfilePane
              candidate={focused}
              criteria={criteria}
              onShortlist={() => store.toggleShortlist(focused.id)}
              onPass={() => store.pass([focused.id])}
              onAsk={(cid, name) => {
                store.askInOutreach(focused.id, cid);
                toast(`Ema will ask about ${name.toLowerCase()} in the next message.`);
              }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-[var(--fg2)]">
              Select a candidate.
            </div>
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

function ProfilePane({
  candidate, criteria, onShortlist, onPass, onAsk,
}: {
  candidate: Candidate; criteria: Criterion[];
  onShortlist: () => void; onPass: () => void; onAsk: (criterionId: string, name: string) => void;
}) {
  const r = rank(candidate, criteria);
  const store = useStore();
  const shortlisted = store.shortlist.has(candidate.id);
  const ordered = [...criteria].sort((a, b) => (a.type === b.type ? 0 : a.type === 'required' ? -1 : 1));

  return (
    <div className="flex-1 min-w-0 overflow-y-auto">
      <div className="p-5 pb-3 border-b border-[var(--beige-300)] sticky top-0 bg-[var(--app-background)] z-10">
        <div className="flex items-start gap-3">
          <Avatar name={candidate.name} size={44} tone={candidate.avatarTone} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium text-[var(--fg1)] truncate">{candidate.name}</h2>
              <ScorePill ranking={r} size="sm" />
              <span className="text-xs text-[var(--fg3)] tabular-nums">{r.scored} of {r.total}</span>
            </div>
            <div className="text-sm text-[var(--fg2)] truncate">{candidate.title} · {candidate.company}</div>
            <div className="text-xs text-[var(--fg3)] flex items-center gap-1">
              {candidate.yearsExperience} yrs · {candidate.location}
              {candidate.source === 'internal' && <Lock size={10} />}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant={shortlisted ? 'primary' : 'secondary'}
              color={shortlisted ? 'brand' : 'altBrand'}
              icon={<BookmarkSimple size={14} weight={shortlisted ? 'fill' : 'regular'} />}
              onClick={onShortlist}
            >
              {shortlisted ? 'Shortlisted' : 'Shortlist'}
            </Button>
            <Button size="sm" variant="ghost" color="altBrand" onClick={onPass}>Pass</Button>
          </div>
        </div>

        {candidate.signals.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            {candidate.signals.map((s) => (
              <Badge key={s.kind} variant="warning" size="sm"
                icon={s.kind === 'stale' ? <Clock size={10} /> : <ShieldWarning size={10} />}>
                {s.label}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* The whole point: evidence at rest, not behind a hover. */}
      <div className="p-5 space-y-2.5" data-usage="evidence">
        <div className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)]">
          Evidence · always visible
        </div>
        {ordered.map((c) => {
          const cs = candidate.scores.find((s) => s.criterionId === c.id);
          const v = cs ? effectiveScore(cs) : null;
          return (
            <div key={c.id} className="rounded-lg border border-[var(--beige-400)] bg-white p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[var(--fg1)]">{c.name}</span>
                    <span className={cx(
                      'text-[10px] uppercase tracking-[1px] font-bold px-1.5 py-0.5 rounded-xs',
                      c.type === 'required' ? 'bg-[var(--beige-200)] text-[var(--fg2)]' : 'bg-[var(--beige-100)] text-[var(--fg3)]',
                    )}>{c.type}</span>
                  </div>
                  {cs?.whyNotFive && !cs.override && (
                    <div className="text-xs text-[var(--fg2)] mt-1">{cs.whyNotFive}</div>
                  )}
                </div>
                <span className={cx(
                  'shrink-0 inline-flex items-center justify-center size-7 rounded-sm border font-bold text-sm tabular-nums',
                  v === null
                    ? 'bg-[var(--beige-50)] border-dashed border-[var(--beige-600)] text-[var(--fg3)]'
                    : 'bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success-text)]',
                )}>{v ?? '—'}</span>
              </div>

              {v === null ? (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[var(--fg2)]">No signal found — lowers coverage, not the score.</span>
                  <button
                    onClick={() => onAsk(c.id, c.name)}
                    className="inline-flex items-center gap-1 h-6 px-2 rounded-xs border border-[var(--beige-500)] bg-white text-xs font-medium text-[var(--fg1)] hover:border-[var(--focus-border)] cursor-pointer"
                  >
                    <Question size={11} weight="bold" /> Ask in outreach
                  </button>
                </div>
              ) : (
                <div className="mt-2 space-y-1.5">
                  {(cs?.evidence ?? []).slice(0, 2).map((e, i) => <EvidenceCard key={i} e={e} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
