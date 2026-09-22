import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkle, Check, MagnifyingGlass, PaperPlaneTilt, CaretDown, ArrowCounterClockwise, PencilSimple,
} from '@phosphor-icons/react';
import {
  SEARCH, FILTERS, FILTER_CATEGORIES, BRIEF_SOURCE, type FilterChip, type FilterMode,
} from '../data/search';
import { Button, Card, Textarea, ToastStack, cx } from '../components/ui';
import {
  ModePicker, ScorecardRow, ScorecardInfo, DerivedFrom, AddFilter, AddCriterion, RemoveButton,
  SuggestedMark, MODE_DOT, MODE_COPY,
} from '../components/SearchControls';
import { AppShell } from '../components/AppShell';
import { weightShares } from '../lib/scoring';
import { useStore } from '../store';
import { UsageOverlay, useMode } from './LayoutPicker';
import { Wash } from '../components/Wash';

/**
 * Search · B — Conversational setup.
 *
 * Built on the block-vs-refine rule: **block on anything that changes who is in
 * the pool, refine anything that only changes the order.** So Ema asks two or
 * three questions — the ones where getting it wrong makes people invisible —
 * and infers everything else.
 *
 * The screen earns its furniture in three acts, because a cold start that opens
 * with an empty rail and a disabled button is asking you to read a UI before
 * you have said anything:
 *
 *   1. cold        — the brief and the two blocking questions, together. No
 *                    nav, no rail, nothing to review yet.
 *   2. building    — eligibility is already settled when this act opens, so
 *                    nothing competes with the work: Ema reads the brief back
 *                    and writes the configuration across the full width.
 *   3. ready       — the pass is over, so the nav returns, the brief folds into
 *                    a bar that can replay how Ema got here, and the
 *                    configuration stays under review.
 *
 * The questions sit in act 1 rather than beside the building configuration
 * because they were the thing in the way: answered up front they cost one more
 * glance at a screen you are already reading, and act 2 gets the whole width.
 *
 * Sacrifices fast revision: editing filter #7 means re-opening the thread.
 */

type Step = { id: string; ask: string; short: string; why: string; options: string[] };

const BLOCKING: Step[] = [
  {
    id: 'seniority',
    ask: 'What level are you hiring at?',
    short: 'a level',
    why: 'Getting this wrong excludes people rather than re-ordering them.',
    options: ['Staff or Principal', 'Senior', 'Any level'],
  },
  {
    id: 'location',
    ask: 'Where can they be based?',
    short: 'a location',
    why: 'Location is a hard constraint — it decides eligibility, not ranking.',
    options: ['SF Bay Area or US remote', 'US only', 'Anywhere'],
  },
];

/* This reveal is the one animation on the screen that is allowed to take its
   time: it is seen once per search, and it is the moment Ema shows its work.
   320ms of travel at 50ms apart reads as material settling; the 200ms version
   read as a page reloading. Still capped, so row 16 does not wait on 15 others. */
/**
 * Plays a re-order rather than cutting to it.
 *
 * Raising one criterion re-apportions every share, so the list can re-sort
 * under your hand — and a list that simply appears in a new order leaves you
 * working out what moved. First/Last/Invert/Play: measure where each row was,
 * let React paint the new order, then put each row back where it came from and
 * release it. Transform only, so it never touches layout.
 */
function useReorderFlip(active: boolean) {
  const nodes = React.useRef(new Map<string, HTMLElement>());
  const tops = React.useRef(new Map<string, number>());

  React.useLayoutEffect(() => {
    const now = new Map<string, number>();
    nodes.current.forEach((el, id) => now.set(id, el.getBoundingClientRect().top));
    if (active) {
      now.forEach((top, id) => {
        const was = tops.current.get(id);
        const el = nodes.current.get(id);
        if (was === undefined || !el) return;
        const dy = was - top;
        if (Math.abs(dy) < 1) return;
        el.animate(
          [{ transform: `translateY(${dy}px)` }, { transform: 'none' }],
          { duration: 260, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
        );
      });
    }
    tops.current = now;
  });

  return (id: string) => (el: HTMLElement | null) => {
    if (el) nodes.current.set(id, el);
    else nodes.current.delete(id);
  };
}

/**
 * A name being written, at its finished size.
 *
 * Typing a string grows it a character at a time, and a growing string
 * re-wraps — which changed the row's height mid-pass and made the whole column
 * twitch. The part not yet written stays in the layout, unseen, so the line box
 * is the same on the first frame as on the last.
 */
function Written({ full, shown }: { full: string; shown: string }) {
  if (shown === full) return <>{full}</>;
  return (
    <>
      {shown}
      <span className="invisible">{full.slice(shown.length)}</span>
    </>
  );
}

/** Deterministic per id: a bone that changed width on re-render would flicker. */
const boneWidth = (id: string, lo = 46, range = 36) => {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return `${lo + (h % range)}%`;
};

const STAGGER = 50;
const STAGGER_CAP = 8;
const REVEAL = 'animate-[emaReveal_320ms_var(--ease-out-quint)_backwards]';
/* Leaving an act: the same 4px of travel the entrance uses, upward, faster.
   Content lifts away instead of being deleted under the cursor. */
const LEAVE = 'animate-[emaOut_120ms_var(--ease-out-quint)_forwards]';

/* One decision lands every STEP, and a row's verdict resolves one step after
   the row itself — so there is always exactly one item visibly being weighed.
   Sixteen of them, plus a beat at the start for reading, comes to about 3s. */
const STEP = 150;
/** The beat between answering a question and Ema asking the next one. */
const ASK_MS = 340;

/* ── The skeleton pass ──
   Before Ema writes anything it lays out the shape of what it is about to
   write: every section and every line, boned, cascading down the two cards.
   Only once the wireframe is standing does content start replacing it.

   The point is that the structure is knowable before the content is. Ema has
   read the brief, so it already knows there will be ten filters in three
   groups and six criteria — showing that first makes the fill read as parsing
   a document rather than as a page loading, because you can see the size and
   shape of the answer before any of it arrives. */
const BONE_STAGGER = 45;
/** The scorecard's bones start a beat after the filters', as its card does. */
const BONE_OFFSET = 120;
/** The pause before the first row: the bones are still arriving. */
const READING_MS = 880;
/** A name is written over this long, whatever its length. */
const TYPE_MS = 120;
/** The beat between the last verdict landing and act 2 handing over. */
const SETTLE_MS = 400;

/** Groups, in the order Ema settles them: what excludes, then what ranks. */
const MODE_ORDER: FilterMode[] = ['must', 'preferred', 'exclude'];
const delay = (i: number, base = 0) =>
  ({ animationDelay: `${base + Math.min(i, STAGGER_CAP) * STAGGER}ms` });

/** "a role description, a level and a location" */
const sentenceList = (xs: string[]) =>
  (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

export function SearchConversational() {
  const navigate = useNavigate();
  const store = useStore();
  const { toasts, dismissToast } = store;

  const [brief, setBrief] = React.useState(SEARCH.brief);
  const [sent, setSent] = React.useState(false);
  /* Prefilled: the fastest way to show what a brief looks like is to put one
     there. It is a textarea, so disagreeing with it costs one select-all. */
  const [draft, setDraft] = React.useState(SEARCH.brief);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [filters, setFilters] = React.useState<FilterChip[]>(FILTERS);
  const [stepsOpen, setStepsOpen] = React.useState(false);
  /** The brief has been handed over; the questions are on screen. */
  const [briefIn, setBriefIn] = React.useState(false);
  /* Adding and removing are the same job — changing the list — so they live
     behind one switch rather than an "add" button plus a row of little crosses
     permanently on show. */
  const [editFilters, setEditFilters] = React.useState(false);
  const [editScore, setEditScore] = React.useState(false);
  const mode = useMode();

  /* Nobody asked for the theatre if they asked for less motion: there, every
     decision is simply already made. The stylesheet also forces
     animation-delay to 0, so a cascade would collapse into a flash anyway. */
  const still = React.useRef(
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  ).current;

  const answered = BLOCKING.filter((s) => answers[s.id]).length;
  const ready = answered === BLOCKING.length;

  /* Both act changes replace the entire composition, and a straight swap costs
     two things. The click that caused it never registers — you press the last
     answer and the thread holding it is gone in the same frame — and the old
     act is deleted rather than dismissed. One beat of exit buys both back, and
     it is the only way to cross-fade two trees without a layout library. */
  const [leaving, setLeaving] = React.useState(false);

  /* Act 2 is driven by the pass, not by the answers. Both questions are
     answered before Send now, so keying it on `ready` — as it was — would make
     act 3 true in the same frame the brief lands and the building act would
     never play. Only `send` switches `building` on, so nothing a user does in
     act 3 can drop them back into a pass they have already watched. */
  const [building, setBuilding] = React.useState(false);

  const stage: 'cold' | 'configuring' | 'ready' = !sent ? 'cold' : building ? 'configuring' : 'ready';
  /* The configuration is new information exactly once — in act 2, while Ema is
     building it. In act 3 it is the same 16 rows in a new place, so they ride
     in with their card instead of re-cascading in front of someone who has
     already read them. */

  const musts = filters.filter((f) => f.mode === 'must').length;
  const inferred = filters.filter((f) => f.mode !== 'must').length;
  const shares = React.useMemo(() => weightShares(store.criteria), [store.criteria]);

  /* Deciding order is the final display order, so nothing moves while it runs:
     the must-haves, then preferred, then exclude, then the criteria by share. */
  const decidingOrder = React.useMemo(() => [
    ...MODE_ORDER.flatMap((m) => filters.filter((f) => f.mode === m).map((f) => f.id)),
    ...[...store.criteria].sort((a, b) => (shares[b.id] ?? 0) - (shares[a.id] ?? 0)).map((c) => c.id),
    // Only the first pass matters; later edits re-sort but never re-decide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [stage === 'configuring']);

  const [landed, setLanded] = React.useState(0);
  // Reduced motion gets the new order without the journey.
  const total = decidingOrder.length;
  // Latched: anything added after the pass is decided the moment it exists.
  /* Only the configuring act performs the pass. Act 3 reviews a configuration
     that has already been decided — and the counter resets on leaving, so
     without this the cards would render empty there. */
  const done = still || stage !== 'configuring' || landed > total;
  // Re-ordering only plays once the pass is over: while rows are still
  // arriving, every landing shifts the ones below it and the flip would
  // animate all of them at once — which is what made it feel jumpy.
  const flipRow = useReorderFlip(!still && done);

  React.useEffect(() => {
    if (stage !== 'configuring') { setLanded(0); return; }
    if (still || landed > total) return;
    const t = setTimeout(() => setLanded((n) => n + 1), landed === 0 ? READING_MS : STEP);
    return () => clearTimeout(t);
  }, [stage, landed, total, still]);

  /* The pass ends the act: one beat to read the last verdict, then the same
     cross-fade every other act change uses. Nothing to press — the questions
     were answered before any of this was on screen. */
  React.useEffect(() => {
    if (stage !== 'configuring' || !done) return;
    const t1 = setTimeout(() => setLeaving(true), SETTLE_MS);
    const t2 = setTimeout(() => { setBuilding(false); setLeaving(false); }, SETTLE_MS + 160);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [stage, done]);

  /* Typing is a clock, not per-character state: the row being written asks how
     far along it is and slices its own name. One timer for the whole pass. */
  const [typed, setTyped] = React.useState(1);
  React.useEffect(() => {
    if (still || done || landed === 0) { setTyped(1); return; }
    setTyped(0);
    const started = Date.now();
    const tick = setInterval(() => {
      const t = Math.min(1, (Date.now() - started) / TYPE_MS);
      setTyped(t);
      if (t >= 1) clearInterval(tick);
    }, 24);
    return () => clearInterval(tick);
  }, [landed, still, done]);

  /** The name as far as it has been written. Finished rows render in full. */
  const written = (id: string, name: string) => {
    if (done || still || rank(id) < landed - 1) return name;
    return name.slice(0, Math.max(1, Math.ceil(name.length * typed)));
  };

  /** The phrase in the brief that produced whatever is being written now. */
  const readingNow = !done && !still && landed > 0
    ? BRIEF_SOURCE[decidingOrder[landed - 1]] ?? null
    : null;

  /** Landed = the row is on screen. Resolved = its verdict is in. */
  const rank = (id: string) => decidingOrder.indexOf(id);
  const hasLanded = (id: string) => done || rank(id) < landed;
  const hasResolved = (id: string) => done || rank(id) < landed - 1;

  /* Act 1 is two beats, not one form. You write the role; Ema comes back with
     the only two questions that decide who is eligible. Asking them up front,
     beside the empty box, made it a form and made Ema look like it had not
     read anything. */
  const unanswered = BLOCKING.filter((b) => !answers[b.id]).map((b) => b.short);

  /* The questions arrive one at a time. Both at once made this a form with two
     fields and made Ema look like it had dealt a hand rather than asked
     anything — and a form does not explain why it is only asking two things.
     Answering the first is what prompts the second, after a beat long enough to
     read as a reply. Nothing is ever taken away: an asked question stays on
     screen and stays changeable. */
  const wantAsked = React.useMemo(() => {
    const next = BLOCKING.findIndex((b) => !answers[b.id]);
    return next === -1 ? BLOCKING.length : next + 1;
  }, [answers]);
  const [asked, setAsked] = React.useState(1);
  React.useEffect(() => {
    if (still) { setAsked(BLOCKING.length); return; }
    if (asked >= wantAsked) return;
    const t = setTimeout(() => setAsked((n) => n + 1), ASK_MS);
    return () => clearTimeout(t);
  }, [asked, wantAsked, still]);
  /** Every question is on screen, so the way forward can be too. */
  const allAsked = asked >= BLOCKING.length;

  /** First beat: hand Ema the brief. */
  const submitBrief = () => {
    if (!draft.trim() || leaving) return;
    setBrief(draft.trim());
    setBriefIn(true);
  };
  /** Second beat: the answers are in, so act 2 has everything it needs. */
  const send = () => {
    if (!draft.trim() || unanswered.length || leaving) return;
    setBrief(draft.trim());
    setLeaving(true);
    /* Reduced motion has no pass to watch, so it never enters act 2. */
    setTimeout(() => { setSent(true); setBuilding(!still); setLeaving(false); }, 120);
  };
  const begin = () => { store.runSearch(); navigate('/candidates'); };

  const setMode = (id: string, mode: FilterMode) =>
    setFilters((prev) => prev.map((f) => (f.id === id ? { ...f, mode, suggested: false } : f)));

  /* ------------------------------ act 1: cold ----------------------------- */

  if (stage === 'cold') {
    return (
      <AppShell chrome="hidden">
        <div className="relative h-full overflow-y-auto bg-[var(--app-background)]">
          <Wash />
          <div className="relative z-10 min-h-full flex flex-col items-center justify-center px-6 py-10">
            <div className={cx('w-full max-w-[620px]', leaving && LEAVE)} data-usage="role">
              <div className="flex items-center justify-center gap-2.5 mb-5 animate-[emaIn_200ms_var(--ease-out-quint)_backwards]">
                <img src="/logo-mark.svg" alt="" height={22} style={{ height: 22 }} />
                <span className="text-sm text-[var(--fg3)]">New search</span>
              </div>

              <h1 className="text-[26px] leading-[32px] font-medium text-[var(--fg1)] text-center animate-[emaRise_240ms_var(--ease-out-quint)_60ms_backwards]">
                What role are you hiring for?
              </h1>
              {/* The lede explains what Ema is about to do. Once it has done it
                  and is asking back, the explanation is in its own words. */}
              {!briefIn && (
                <p className="text-sm text-[var(--fg2)] mt-2 leading-[20px] text-center animate-[emaRise_240ms_var(--ease-out-quint)_120ms_backwards]">
                  Describe it however you like, or paste the job description. Ema only asks about
                  the things that decide who is eligible — everything else it infers, and you can
                  change all of it afterwards.
                </p>
              )}

              {/* Beat one: the box, and nothing else to answer yet. */}
              <div className="mt-5 animate-[emaRise_240ms_var(--ease-out-quint)_180ms_backwards]">
                {briefIn ? (
                  // Handed over. It stays readable, and stays editable — going
                  // back is a click, not a restart.
                  <Card className="px-3.5 py-3">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--fg2)] flex-1">
                        Your brief
                      </span>
                      <button
                        onClick={() => setBriefIn(false)}
                        className="text-xs text-[var(--fg3)] rounded-xs px-1.5 py-0.5 hover:text-[var(--fg1)] hover:bg-[var(--beige-100)] cursor-pointer transition-colors duration-150"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="text-sm text-[var(--fg2)] leading-[20px]">{draft.trim()}</div>
                  </Card>
                ) : (
                  <Textarea
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitBrief(); }}
                    rows={5}
                    className="text-[15px] leading-[22px] p-4"
                    placeholder="Staff ML engineer for payments risk. Needs production model serving at real scale, 7+ years, fintech preferred…"
                  />
                )}
              </div>

              {!briefIn ? (
                <div className="mt-4 flex items-center gap-2.5 animate-[emaRise_240ms_var(--ease-out-quint)_240ms_backwards]">
                  <Button icon={<PaperPlaneTilt size={14} />} disabled={!draft.trim()} onClick={submitBrief}>
                    Send
                  </Button>
                  <span className="text-xs text-[var(--fg3)]">⌘⏎ to send</span>
                  {/* The nav is gone in this act, so the way out cannot be in it. */}
                  <button
                    onClick={() => navigate(mode === 'variants' ? '/search' : '/')}
                    className="ml-auto text-xs text-[var(--fg3)] rounded-xs px-1.5 py-1 hover:text-[var(--fg1)] hover:bg-[var(--beige-100)] cursor-pointer transition-colors duration-150"
                  >
                    {mode === 'variants' ? 'Prefer a form? Switch layout' : '← Overview'}
                  </button>
                </div>
              ) : (
                <>
                  {/* Beat two: Ema answers, and asks for the only two things it
                      cannot infer without excluding people by accident. */}
                  <div className="mt-4">
                    <Bubble from="ema">
                      Read that. Two things change <span className="font-medium">who is in the pool</span>,
                      so they are yours to confirm — everything else I can infer.
                    </Bubble>
                  </div>

                  <div className="mt-3 space-y-2.5">
                    {BLOCKING.slice(0, asked).map((step, i) => (
                      <Card
                        key={step.id}
                        className="p-3 animate-[emaRise_240ms_var(--ease-out-quint)_backwards]"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-[var(--fg1)] flex-1">{step.ask}</span>
                          {/* Two questions, and the screen says so — otherwise
                              answering one gives no sense of how much is left. */}
                          <span className="text-xs text-[var(--fg2)] tabular-nums shrink-0">
                            {i + 1} of {BLOCKING.length}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--fg2)] mt-0.5 mb-2">{step.why}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {step.options.map((o) => (
                            <Choice
                              key={o}
                              on={answers[step.id] === o}
                              onClick={() => setAnswers((a) => ({ ...a, [step.id]: o }))}
                            >
                              {o}
                            </Choice>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* The way forward appears once there is nothing left to ask.
                      Before that the questions are the only task on screen. */}
                  {allAsked && (
                    <div className="mt-4 animate-[emaRise_240ms_var(--ease-out-quint)_backwards]">
                      {/* The button used to say "Build the search" next to
                          "Ema builds the filters and scorecard next", which
                          named the next click and nothing after it. Pressing
                          this does not run a search — it writes the criteria a
                          search will run on, and the whole point is that you get
                          to argue with them first. So the arc is stated: Ema
                          drafts, you vet, then you run. */}
                      {/* Full measure: this is the only action in the act, and
                          a small button floating at the left of a 620px column
                          read as one option among several. */}
                      <Button
                        block
                        size="lg"
                        icon={<Sparkle size={16} weight="fill" />}
                        disabled={unanswered.length > 0}
                        onClick={send}
                      >
                        Build search criteria
                      </Button>
                      {unanswered.length > 0 && (
                        <div className="text-xs text-[var(--fg2)] text-center mt-2">
                          Pick {sentenceList(unanswered)}
                        </div>
                      )}
                      <p className="text-xs text-[var(--fg2)] leading-[18px] mt-2.5 mb-0 text-center">
                        Ema turns your brief into{' '}
                        <span className="font-medium text-[var(--fg1)]">filters</span> that decide who is
                        eligible and a <span className="font-medium text-[var(--fg1)]">scorecard</span> that
                        decides the order. Nothing runs yet — you review and adjust them, then press{' '}
                        <span className="font-medium text-[var(--fg1)]">Begin search</span> to see the
                        ranked candidates.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </AppShell>
    );
  }

  /* ------------------------- the configuration panel ---------------------- */

  /* Grouped by what a filter does, not by where it came from. Render-time only:
     the source array's order drives the funnel maths in layouts A and C. */
  const decidedFilters = filters.filter((f) => hasLanded(f.id));
  /* Grouped over the whole list, not the landed part: every row holds its place
     from the first frame and simply becomes visible, so nothing below it moves
     while the pass runs. */
  const grouped = MODE_ORDER
    .map((m) => ({ mode: m, rows: filters.filter((f) => f.mode === m) }))
    .filter((g) => g.rows.length > 0);

  const filtersCard = (
    <Card className={cx('p-3.5', !done && 'animate-[emaReveal_320ms_var(--ease-out-quint)_backwards]')} data-usage="filters">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-base font-bold text-[var(--fg1)]">Filters</span>
        <span className="text-xs text-[var(--fg3)] tabular-nums">
          {done
            ? `${musts} must-have · ${inferred} inferred`
            : landed === 0
              ? 'Reading your description'
              : `Reading · ${decidedFilters.length} of ${filters.length}`}
        </span>
      </div>
      <div className="mb-2.5"><DerivedFrom /></div>

      <div className="space-y-3">
        {grouped.map((g) => (
          <div key={g.mode}>
            {/* A boned section is still a section: it holds its dot and its
                space, so the card's shape is right from the first frame. The
                label and the count arrive with the group's first real row —
                naming a group before anything is in it gives the answer away. */}
            {(() => {
              const open = done || g.rows.some((f) => hasLanded(f.id));
              return (
                <div className="flex items-center gap-1.5 mb-1 px-1.5 h-4">
                  <span className={cx(
                    'size-2 rounded-full shrink-0 transition-colors duration-200',
                    open ? MODE_DOT[g.mode] : 'bg-[var(--beige-400)]',
                  )} />
                  {open ? (
                    <>
                      <span className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--fg2)]">
                        {MODE_COPY[g.mode].label}
                      </span>
                      <span className="text-xs text-[var(--fg3)] tabular-nums">
                        {done ? g.rows.length : g.rows.filter((f) => hasLanded(f.id)).length}
                      </span>
                    </>
                  ) : (
                    <span className="ema-skeleton block h-2.5 w-16 rounded-xs" aria-hidden />
                  )}
                </div>
              );
            })()}

            <div className="space-y-1">
              {g.rows.map((f) => (
                <div
                  key={f.id}
                  ref={flipRow(f.id)}
                  className={cx(
                    'flex items-center gap-2 px-1.5 py-1 rounded-sm transition-colors duration-150',
                    'hover:bg-[var(--beige-100)] focus-within:bg-[var(--beige-100)]',
                    /* backwards, never both: a filled animation keeps this row
                       a stacking context after it has landed, and the open mode
                       menu of a row above would paint underneath it. */
                    !done && 'animate-[emaReveal_280ms_var(--ease-out-quint)_backwards]',
                  )}
                  style={!done ? { animationDelay: `${rank(f.id) * BONE_STAGGER}ms` } : undefined}
                >
                  <span className="text-sm text-[var(--fg1)] truncate flex-1">
                    {hasLanded(f.id) ? (
                      <Written full={f.value} shown={written(f.id, f.value)} />
                    ) : (
                      <span
                        className="ema-skeleton block h-3.5 rounded-xs my-[3px]"
                        style={{ width: boneWidth(f.id) }}
                        aria-hidden
                      />
                    )}
                    {/* No phrase behind it: Ema inferred this one, and says so
                        rather than implying a source that is not in the text. */}
                    {!BRIEF_SOURCE[f.id] && hasLanded(f.id) && (
                      <span className={cx(
                        'ml-1.5 inline-flex items-baseline gap-1 text-xs text-[var(--fg3)]',
                        !(done || hasResolved(f.id)) && 'invisible',
                      )}>
                        <SuggestedMark />
                        inferred
                      </span>
                    )}
                  </span>
                  {/* Right-aligned like layout C: a 248px menu hung off a 92px
                      cell at the card's edge otherwise spills into open air. */}
                  {editFilters && (
                    <span className="order-last">
                      <RemoveButton
                        onClick={() => setFilters((prev) => prev.filter((x) => x.id !== f.id))}
                        title={`Remove ${f.value}`}
                      />
                    </span>
                  )}
                  <span className={cx(
                    'shrink-0 w-[92px] [&>span]:block [&>span>button]:w-full [&>span>button]:justify-between',
                    '[&_[role=menu]]:left-auto [&_[role=menu]]:right-0',
                  )}>
                    {hasResolved(f.id) ? (
                      // The pop is dropped once the pass is over, and is
                      // backwards-filled while it runs: either way this span
                      // must stop being a stacking context the moment it has
                      // settled, or the menu paints under the rows below it.
                      <span className={cx('block', !done && 'animate-[emaPop_160ms_var(--ease-out-quint)_backwards]')}>
                        <ModePicker compact value={f.mode} name={f.value} onChange={(m) => setMode(f.id, m)} />
                      </span>
                    ) : (
                      <span className="ema-skeleton block h-6 w-full rounded-sm" aria-hidden />
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {done && (
        <div className="mt-2">
          {editFilters ? (
            <div className="space-y-2">
              <AddFilter
                categories={FILTER_CATEGORIES}
                onAdd={(category, value) => {
                  setFilters((prev) => [...prev, { id: `f_custom_${Date.now()}`, category, value, mode: 'preferred' }]);
                  store.toast(`Added “${value}” to ${category.toLowerCase()}.`);
                }}
              />
              <Button size="sm" variant="ghost" color="altBrand" onClick={() => setEditFilters(false)}>
                Done
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" color="altBrand" icon={<PencilSimple size={13} />}
              onClick={() => setEditFilters(true)}>
              Edit filters
            </Button>
          )}
        </div>
      )}
    </Card>
  );

  /* Ranked by what each criterion actually controls. Sorted on the share rather
     than the weight, because `weightShares` breaks its rounding ties on array
     position — sorting the numbers keeps the numbers themselves still. */
  const rankedCriteria = [...store.criteria].sort((a, b) => (shares[b.id] ?? 0) - (shares[a.id] ?? 0));
  const decidedCriteria = rankedCriteria.filter((c) => hasLanded(c.id));

  /* Both cards stand from the first frame. Letting the scorecard arrive when
     its first row landed meant the column jumped by its full height halfway
     through the pass — the last piece of the jumpiness. It reads as a card
     waiting its turn, which is what it is. */
  const scorecardCard = (
    <Card
      className={cx('p-3.5', !done && 'animate-[emaReveal_320ms_var(--ease-out-quint)_120ms_backwards]')}
      data-usage="scorecard"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base font-bold text-[var(--fg1)]">Scorecard</span>
        <ScorecardInfo />
        <span className="text-xs text-[var(--fg3)] tabular-nums">
          {done
            ? `${store.criteria.length} criteria · most to least of the score`
            : `Weighing · ${decidedCriteria.length} of ${store.criteria.length}`}
        </span>
      </div>
      <div className="mb-2.5"><DerivedFrom /></div>
      <div className="space-y-1.5">
        {rankedCriteria.map((c) => (
          <div
            key={c.id}
            ref={flipRow(c.id)}
            className={cx(!done && 'animate-[emaReveal_280ms_var(--ease-out-quint)_backwards]')}
            style={!done ? {
              animationDelay: `${BONE_OFFSET + (rank(c.id) - filters.length) * BONE_STAGGER}ms`,
            } : undefined}
          >
            {!hasLanded(c.id) ? <BoneCriterion id={c.id} /> : (
            /* The level scale, not the stepper: this act is about how much each
               criterion matters relative to the others, not about ±1. */
            <ScorecardRow
              compact
              weightControl="scale"
              pending={!hasResolved(c.id)}
              onRemove={editScore
                ? () => store.setCriteria(store.criteria.filter((x) => x.id !== c.id))
                : undefined}
              share={shares[c.id]}
              criterion={c}
              nameNode={<Written full={c.name} shown={written(c.id, c.name)} />}
              note={!BRIEF_SOURCE[c.id] ? (
                <span className={cx(
                  'ml-1.5 inline-flex items-baseline gap-1 text-xs font-normal text-[var(--fg3)]',
                  !(done || hasResolved(c.id)) && 'invisible',
                )}>
                  <SuggestedMark />
                  inferred
                </span>
              ) : undefined}
              onChange={(next) => store.setCriteria(store.criteria.map((x) => (x.id === c.id ? next : x)))}
            />
            )}
          </div>
        ))}
      </div>
      {done && (
        <div className="mt-2">
          {editScore ? (
            <div className="space-y-2">
              <AddCriterion
                criteria={store.criteria}
                onAdd={(c) => {
                  store.setCriteria([...store.criteria, { ...c, id: `c_custom_${Date.now()}` }]);
                  store.toast(`Added “${c.name}” to the scorecard.`);
                }}
              />
              <Button size="sm" variant="ghost" color="altBrand" onClick={() => setEditScore(false)}>
                Done
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" color="altBrand" icon={<PencilSimple size={13} />}
              onClick={() => setEditScore(true)}>
              Edit scorecard
            </Button>
          )}
        </div>
      )}
    </Card>
  );

  /* The one number on this screen that answers "did my filters do something
     sane". It was 20px of body text sharing a flex row with a large button,
     which outweighed it — so the only feedback the configuration gives was the
     quietest thing in the card. It now leads at display size, in the brand
     green, with its denominator underneath it rather than in tertiary text. */
  /* The two cards below are the search criteria. Nothing on the screen said so:
     they were titled "Filters" and "Scorecard" at the same size and weight as
     the rows inside them, with no statement of how the two differ — which is
     the whole thesis of this screen. Filters decide who is in the pool;
     the scorecard decides the order of whoever survives. */
  const criteriaHeading = (
    <div className="flex items-baseline gap-3 flex-wrap">
      <h2 className="text-xl font-bold text-[var(--fg1)]">Search criteria</h2>
      <p className="text-sm text-[var(--fg2)] m-0">
        <span className="font-medium text-[var(--fg1)]">Filters</span> decide who is eligible ·{' '}
        <span className="font-medium text-[var(--fg1)]">the scorecard</span> decides the order
      </p>
    </div>
  );

  const reachAndBegin = (
    /* Three blocks, all 44px, all centred on one line: the figure's
       line-height, the two text lines stacked (24 + 20), and the lg button's
       height. It was items-baseline, which pinned the 40px figure's baseline to
       the 16px line's and left the whole group sitting low against it. */
    <div className="flex items-center gap-5 flex-wrap" data-usage="reach">
      <div className="flex items-center gap-2.5">
        <span className="text-[40px] leading-[44px] font-black text-[var(--brand-ink)] tabular-nums">
          {SEARCH.eligible.toLocaleString()}
        </span>
        <div className="min-w-0">
          <div className="text-base font-bold text-[var(--fg1)] leading-6">profiles are eligible</div>
          <div className="text-sm text-[var(--fg2)] tabular-nums leading-5">
            of {SEARCH.profilesScanned.toLocaleString()} scanned · your filters cut{' '}
            {Math.round((1 - SEARCH.eligible / SEARCH.profilesScanned) * 100)}%
          </div>
        </div>
      </div>
      <Button
        size="lg"
        className="ml-auto"
        disabled={!ready}
        icon={<MagnifyingGlass size={16} weight="bold" />}
        onClick={begin}
      >
        Begin search
      </Button>
    </div>
  );

  /* --------------------------- act 2: configuring ------------------------- */

  if (stage === 'configuring') {
    /* Said back in the user's own options, never hardcoded: the point of
       repeating it is that it is what they picked. */
    const settled = BLOCKING.map((s) => answers[s.id]).filter(Boolean).join(', ');
    return (
      <AppShell chrome="hidden">
        <div className={cx(
          'relative h-full overflow-y-auto bg-[var(--app-background)]',
          leaving ? LEAVE : 'animate-[emaFade_200ms_var(--ease-out-quint)_backwards]',
        )}>
          {/* The same painting as the cold start, turned down. Act 1 handed
              over to a flat canvas, which made the middle of the flow read as
              two different products — the wash was the screen's whole
              atmosphere and then, on one click, nothing. It now fades across
              the three acts instead of being switched off. */}
          <Wash ambient strength={0.42} />
          <div className="relative p-5 space-y-3">
            {/* Full width, so its right edge lines up with the cards below;
                the brief's own text is capped to a readable measure inside. */}
            <div className="space-y-2.5" data-usage="role">
              <Bubble from="ema">
                Read that. <span className="font-medium">{settled}</span>. Building your filters
                and scorecard — each one lights up the words it came from.
              </Bubble>
              {/* The brief stays on screen through the pass: the lit phrase is
                  the only evidence that a row came from something you wrote. */}
              <Card className="px-3 py-2.5">
                <div className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--fg2)] mb-1">
                  Your brief
                </div>
                <div className="text-sm text-[var(--fg2)] leading-[20px] max-w-[92ch]">
                  <Lit text={brief} phrase={readingNow} />
                </div>
              </Card>
            </div>

            {/* The reason for the act: the same two-column configuration act 3
                ends on, at the full width of the window. */}
            <div className="pt-1">{criteriaHeading}</div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
              {filtersCard}
              {scorecardCard}
            </div>
          </div>
        </div>
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <UsageOverlay screen="search" />
      </AppShell>
    );
  }

  /* ------------------------------ act 3: ready ---------------------------- */

  const steps = [
    { label: 'Read your role description', detail: `${brief.length} characters` },
    { label: `Extracted ${filters.length} filters`, detail: `${musts} must-have · ${inferred} that only shape the order` },
    { label: 'Asked what changes eligibility', detail: BLOCKING.map((s) => answers[s.id]).join(' · ') },
    { label: `Inferred ${store.criteria.length} scorecard criteria`, detail: 'Required criteria count double in the score' },
  ];

  return (
    <AppShell chrome="enter" breadcrumbs={['Searches', SEARCH.name]} screen="search">
      <div className="relative h-full overflow-y-auto">
        <Wash ambient strength={0.2} />
        <div className="relative max-w-[1100px] mx-auto p-5 space-y-3">
          {/* The thread folds to a line, but the reasoning stays reachable:
              "where did these filters come from" is the first question anyone
              asks of a configuration they did not type. */}
          <Card className="overflow-hidden animate-[emaRise_240ms_var(--ease-out-quint)_backwards]" data-usage="role">
            <div className="flex items-center gap-1 pr-2.5">
              <button
                onClick={() => setStepsOpen((o) => !o)}
                aria-expanded={stepsOpen}
                className="flex-1 min-w-0 flex items-center gap-2.5 px-3.5 py-2.5 text-left cursor-pointer transition-colors duration-150 hover:bg-[var(--beige-100)] active:bg-[var(--beige-100)]"
              >
                <span className="size-6 rounded-full bg-[var(--ai-magic)] text-white flex items-center justify-center shrink-0">
                  <Sparkle size={12} weight="fill" />
                </span>
                <span className="text-sm text-[var(--fg1)] truncate flex-1 min-w-0">{brief}</span>
                <span className="text-xs text-[var(--fg3)] shrink-0 hidden sm:inline">{steps.length} steps</span>
                <CaretDown size={12} weight="bold" className={cx('text-[var(--fg3)] shrink-0 transition-transform duration-200 ease-[var(--ease-out-quint)]', stepsOpen && 'rotate-180')} />
              </button>
              <span className="w-px h-5 bg-[var(--beige-400)] shrink-0" />
              <Button
                size="sm"
                variant="ghost"
                color="altBrand"
                icon={<ArrowCounterClockwise size={13} />}
                /* The answers survive: they were true of this search a minute
                   ago, they are chips you can change in place, and clearing
                   them would disable Send on a screen you just came back to. */
                onClick={() => { setDraft(brief); setSent(false); setStepsOpen(false); }}
              >
                Start again
              </Button>
            </div>

            {stepsOpen && (
              <div className="border-t border-[var(--border-color)] bg-[var(--bg3)] px-3.5 py-3">
                <ol className="space-y-2.5">
                  {steps.map((s, i) => (
                    <li key={s.label} className={cx('flex gap-2.5', REVEAL)} style={delay(i)}>
                      <span className="size-5 rounded-full bg-[var(--success-bg)] text-[var(--success-text)] text-[10px] font-bold flex items-center justify-center shrink-0 mt-px tabular-nums">
                        {i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm text-[var(--fg1)] leading-[18px]">{s.label}</span>
                        <span className="block text-xs text-[var(--fg2)] leading-4 mt-0.5">{s.detail}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </Card>

          <Card className="p-5 animate-[emaRise_240ms_var(--ease-out-quint)_60ms_backwards]">{reachAndBegin}</Card>

          <div className="pt-2 animate-[emaRise_240ms_var(--ease-out-quint)_80ms_backwards]">
            {criteriaHeading}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
            <div className="animate-[emaRise_240ms_var(--ease-out-quint)_100ms_backwards]">{filtersCard}</div>
            <div className="animate-[emaRise_240ms_var(--ease-out-quint)_140ms_backwards]">{scorecardCard}</div>
          </div>
        </div>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <UsageOverlay screen="search" />
    </AppShell>
  );
}

/**
 * A criterion before Ema has worked it out.
 *
 * Built to the compact ScorecardRow's own geometry — same border, radius, fill
 * and padding, and bones where its name, type chip and weight scale will be —
 * because a skeleton whose height is a guess makes the column jump at the
 * moment the content it was standing in for arrives.
 */
function BoneCriterion({ id }: { id: string }) {
  return (
    <div
      className="rounded-lg border border-[var(--border-color)] bg-[var(--bg3)] px-2.5 py-2"
      style={{ ['--bone' as string]: 'var(--beige-400)' }}
      aria-hidden
    >
      <div className="ema-skeleton h-3.5 rounded-xs" style={{ width: boneWidth(id) }} />
      <div className="flex items-center gap-3 mt-2.5">
        <div className="ema-skeleton h-4 w-[68px] rounded-xs shrink-0" />
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="ema-skeleton h-4 w-[13px] rounded-xs" />
          ))}
        </div>
        <div className="ema-skeleton h-3 w-10 rounded-xs ml-auto" />
      </div>
    </div>
  );
}

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={cx(
        'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-pill border text-sm font-medium',
        'cursor-pointer transition-colors duration-150',
        on
          ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-[var(--brand-primary-foreground)] hover:bg-[var(--brand-primary-accent)]'
          : 'bg-white border-[var(--border-color)] text-[var(--fg1)] hover:border-[var(--focus-border)] hover:bg-[var(--beige-100)] active:bg-[var(--beige-200)]',
      )}
    >
      {on && <Check size={12} weight="bold" className="shrink-0" />}
      {children}
    </button>
  );
}

/**
 * The brief with one phrase lit — the words Ema is reading as it writes the
 * filter they produced. Nothing is lit once the pass is over; this is a
 * narration of the work, not a permanent annotation.
 */
function Lit({ text, phrase }: { text: string; phrase: string | null }) {
  const at = phrase ? text.indexOf(phrase) : -1;
  if (at < 0 || !phrase) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="brief-lit">{phrase}</mark>
      {text.slice(at + phrase.length)}
    </>
  );
}

/**
 * Ema speaking.
 *
 * This was a chat bubble — a white box with a tail corner and a purple disc
 * floating beside it. Two things were wrong with that. The tail is a messaging
 * idiom in a product that is not a messenger, and it was the only tailed
 * corner anywhere in the app; and the panel was plain white with a raw
 * beige-400 edge, while this product already has a settled treatment for
 * "Ema wrote this, you have not approved it" — the purple tint and purple
 * border used on every draft in Messages and Outreach.
 *
 * So Ema sounds the same here as everywhere else: the label names the speaker,
 * and the tint says whose words these are without a disc in the margin.
 *
 * `from` is kept because the signature is part of the screen's grammar, but
 * only Ema has ever spoken on this screen.
 */
function Bubble({ from, children }: { from: 'ema' | 'you'; children: React.ReactNode }) {
  if (from === 'you') {
    return (
      <div className="flex justify-end animate-[emaRise_200ms_var(--ease-out-quint)_backwards]">
        <div className="max-w-[80%] rounded-lg bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] px-3.5 py-2.5 text-sm leading-[20px] whitespace-pre-line">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className={cx(
      'rounded-lg border border-[var(--ai-magic-border)] bg-[var(--ai-magic-bg-subtle)] px-3.5 py-3',
      'animate-[emaRise_200ms_var(--ease-out-quint)_80ms_backwards]',
    )}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Sparkle size={12} weight="fill" className="text-[var(--ai-magic-text)]" />
        <span className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--ai-magic-text)]">
          Ema
        </span>
      </div>
      <div className="text-sm text-[var(--fg1)] leading-[20px]">{children}</div>
    </div>
  );
}
