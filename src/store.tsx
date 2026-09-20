import React from 'react';
import type { Candidate, CellOverride, Criterion, Meeting, OutreachRecord, Outcome, SequenceStep } from './lib/types';
import { applyAction, type ActionId } from './lib/outreach';
import { ALL_CANDIDATES, SEEDED_SHORTLIST } from './data/candidates';
import { CRITERIA, DAILY_CANDIDATE_LIMIT, SENDERS, SEQUENCE } from './data/search';
import { CALENDAR } from './data/availability';
import { SEARCH } from './data/search';

/** How long the simulated search runs. Long enough to read, short enough to demo. */
const RUN_MS = 3600;
const SEARCH_TOTALS = { scored: SEARCH.profilesScored, matched: SEARCH.matched };
import { OUTREACH } from './data/outreach';
import type { ToastMsg } from './components/ui';

/**
 * One thing that happened while you were looking elsewhere.
 *
 * Deliberately not a toast: a toast is a receipt for something *you* just did
 * and may vanish unread. This is an event the product raised on its own, so it
 * persists until it is either read or acted on.
 */
export interface Notif {
  id: number;
  candidateId: string;
  /** One line, past tense, names the person. */
  title: string;
  /** What changed, in your clock. */
  detail: string;
  at: string;
  read: boolean;
  /** True if the tab was hidden when this landed — changes how the alert opens. */
  whileAway: boolean;
}

/**
 * The demo arrival, timed from the moment there is work to interrupt.
 *
 * It used to run from provider mount, which meant a call could "move" before
 * the recruiter had run a search or seen a single candidate — an event about a
 * booked call, landing in a workspace with no pipeline in it. The clock now
 * starts once the search is complete and the candidate list has actually been
 * opened, so it reads as something happening while you work.
 */
const ARRIVE_MS = 10000;

/** Dev switch for forcing empty/error states: ?state=zero-results etc. */
export type ForcedState =
  | null | 'zero-results' | 'gate-wipeout' | 'ats-disconnected'
  | 'sender-disconnected' | 'partial-failure' | 'searching' | 'no-search' | 'exhausted'
  | 'calendar-disconnected';

export function readForcedState(): ForcedState {
  const v = new URLSearchParams(window.location.search).get('state');
  const allowed: ForcedState[] = [
    'zero-results', 'gate-wipeout', 'ats-disconnected', 'sender-disconnected',
    'partial-failure', 'searching', 'no-search', 'exhausted', 'calendar-disconnected',
  ];
  return (allowed as string[]).includes(v ?? '') ? (v as ForcedState) : null;
}

/** Where the search itself is, so the prototype runs as one continuous story. */
export type SearchPhase = 'draft' | 'running' | 'complete';

interface Store {
  candidates: Candidate[];
  searchPhase: SearchPhase;
  /** Profiles scored so far while running — the live counter. */
  scanProgress: number;
  /** Commits the scorecard, runs the search, then reveals results. */
  runSearch: () => void;
  /** Replay the whole story from an empty draft. */
  resetDemo: () => void;
  /** The candidate list has been opened at least once — arms the demo arrival. */
  sawCandidates: boolean;
  noteCandidatesSeen: () => void;
  criteria: Criterion[];
  shortlist: Set<string>;
  passed: Set<string>;
  outreach: OutreachRecord[];
  forced: ForcedState;
  dailyLimit: number;
  /** Free-text candidate lookup. Shared, so it survives a layout switch. */
  query: string;
  senders: typeof SENDERS;
  toasts: ToastMsg[];
  /** Events raised by the product, newest first. Global, so any screen can show them. */
  notifications: Notif[];
  /** Set when a notification is clicked through; the outreach screen consumes it. */
  focusCandidate: string | null;
  setFocusCandidate: (id: string | null) => void;
  /** Opening the panel is what counts as seeing them. Clears the nav urgency. */
  markNotificationsRead: () => void;
  dismissNotification: (id: number) => void;
  /**
   * Notification ids whose top-of-page alert has been closed. Separate from
   * `read` and from the record itself: closing the alert is "I have seen this",
   * never "this is handled" — the bell and the nav badge keep the trail.
   */
  alertDismissed: number[];
  dismissAlert: (id: number) => void;

  setCriteria: (next: Criterion[]) => void;
  resetCriteria: () => void;
  toggleShortlist: (id: string) => void;
  shortlistMany: (ids: string[]) => void;
  removeFromShortlist: (ids: string[]) => void;
  pass: (ids: string[]) => void;
  overrideGate: (id: string) => void;
  overrideScore: (candidateId: string, criterionId: string, score: number) => void;
  /** The only way an outreach record changes. Returns what to say about it. */
  act: (candidateId: string, id: ActionId, opts?: { outcome?: Outcome; meeting?: Meeting }) => void;
  /**
   * The same action across a selection: one pass, one toast, one undo. Looping
   * `act` would queue N toasts and N undos, each of which would only roll back
   * one record — an undo that lies about its own scope.
   */
  actMany: (candidateIds: string[], id: ActionId) => void;
  calendar: typeof CALENDAR;
  reconnectCalendar: () => void;
  addToOutreach: (ids: string[], asks?: Record<string, string[]>) => void;
  /** Clears the arrival highlight once the rows have actually been looked at. */
  acknowledgeArrivals: () => void;
  /** Rewrite one sequence step for one candidate. Unsent steps only. */
  setStepBody: (candidateId: string, stepN: number, body: string) => void;
  sequence: SequenceStep[];
  /** Rewrite a template for everyone who has not received it yet. */
  setSequenceTemplate: (stepN: number, body: string) => void;
  /** Rewrite the pending draft message in the thread. */
  setDraftBody: (candidateId: string, body: string) => void;
  /** Queue a question about an unknown cell onto this candidate's next message. */
  askInOutreach: (candidateId: string, criterionId: string) => void;
  pendingAsks: Record<string, string[]>;
  /** Human judgement over machine cells. A separate layer so it survives a re-run. */
  overrides: CellOverride[];
  setCellOverride: (o: CellOverride) => void;
  clearCellOverride: (candidateId: string, criterionId: string) => void;
  setDailyLimit: (n: number) => void;
  setQuery: (q: string) => void;
  reconnectSender: (id: string) => void;
  toast: (text: string, action?: ToastMsg['action']) => void;
  dismissToast: (id: number) => void;
}

const Ctx = React.createContext<Store | null>(null);

export function useStore(): Store {
  const s = React.useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}

let toastId = 0;
let notifId = 0;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const forced = React.useMemo(readForcedState, []);

  const [candidates, setCandidates] = React.useState<Candidate[]>(ALL_CANDIDATES);
  const [criteria, setCriteriaState] = React.useState<Criterion[]>(CRITERIA);
  const [shortlist, setShortlist] = React.useState<Set<string>>(
    () => new Set(forced === 'no-search' || forced === 'zero-results' ? [] : SEEDED_SHORTLIST),
  );
  const [passed, setPassed] = React.useState<Set<string>>(new Set(['c_hiroshi', 'c_james']));
  const [outreach, setOutreach] = React.useState<OutreachRecord[]>(OUTREACH);
  const [dailyLimit, setDailyLimit] = React.useState(DAILY_CANDIDATE_LIMIT);
  const [query, setQuery] = React.useState('');
  const [senders, setSenders] = React.useState(SENDERS);
  const [sequence, setSequence] = React.useState<SequenceStep[]>(SEQUENCE);
  const [overrides, setOverrides] = React.useState<CellOverride[]>([]);
  const [calendar, setCalendar] = React.useState({
    ...CALENDAR,
    connected: readForcedState() !== 'calendar-disconnected',
  });
  const [pendingAsks, setPendingAsks] = React.useState<Record<string, string[]>>({});
  // Seeded complete so a cold load still opens mid-workflow and shows depth;
  // Begin search is what moves it back through running.
  const [searchPhase, setSearchPhase] = React.useState<SearchPhase>(
    forced === 'searching' ? 'running' : forced === 'no-search' ? 'draft' : 'complete',
  );
  const [scanProgress, setScanProgress] = React.useState(SEARCH_TOTALS.scored);
  const [toasts, setToasts] = React.useState<ToastMsg[]>([]);
  const [notifications, setNotifications] = React.useState<Notif[]>([]);
  const [focusCandidate, setFocusCandidate] = React.useState<string | null>(null);
  const [alertDismissed, setAlertDismissed] = React.useState<number[]>([]);

  const toast = React.useCallback((text: string, action?: ToastMsg['action']) => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, text, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 8000);
  }, []);

  // The arrival fires from a timer, so it needs today's records, not the ones
  // that existed when the effect was set up.
  const outreachRef = React.useRef(outreach);
  outreachRef.current = outreach;
  const [sawCandidates, setSawCandidates] = React.useState(false);

  /**
   * A booked call moves from the candidate's side, a few seconds in.
   *
   * No cleanup guard is needed against StrictMode's double mount: the first
   * mount's timer is cleared by its own cleanup, so exactly one fires.
   */
  React.useEffect(() => {
    // Nothing to interrupt until the search has finished and the list has been
    // looked at; a reset puts both back and the arrival waits again.
    if (searchPhase !== 'complete' || !sawCandidates) return;
    const t = setTimeout(() => {
      // Read the precondition from the live record, never from inside the
      // updater below: React only evaluates an updater eagerly while the
      // provider is idle, so a flag set in there is still false if the user
      // happens to be typing — which is exactly when this event lands.
      const moved = outreachRef.current.some(
        (r) => r.candidateId === 'c_elena' && r.state === 'call-booked' && !!r.meeting?.booked,
      );
      if (!moved) return;
      setOutreach((prev) => prev.map((r) => {
        if (r.candidateId !== 'c_elena' || r.state !== 'call-booked' || !r.meeting?.booked) return r;
        return {
          ...r,
          state: 'reschedule-requested',
          lastActivity: 'just now',
          meeting: {
            ...r.meeting,
            previous: r.meeting.booked,
            booked: {
              id: 's_el_2', startsAt: 's_el_2',
              // She is MDT, Sarah is PDT — an hour ahead, so the same moment
              // reads as a civilised 08:30 for her and a pre-dawn 07:30 here.
              yours: 'Thu 26 Mar · 06:30', theirs: 'Thu 26 Mar · 07:30',
              outsideCoreHours: true,
            },
            lastChangedBy: 'candidate',
            movedBy: 'candidate',
            changeNote: 'Moved from Google Calendar · “Something landed on Wednesday — Thursday first thing works better.”',
          },
        };
      }));
      setNotifications((n) => [{
        id: ++notifId,
        candidateId: 'c_elena',
        title: 'Elena Vasquez moved your call',
        detail: 'Now Thu 26 Mar · 06:30, before your working day starts',
        at: 'just now',
        read: false,
        // Captured at arrival, not at render: whether she moved the call
        // behind your back is a fact about the event, not about right now.
        whileAway: document.visibilityState === 'hidden',
      }, ...n]);
    }, ARRIVE_MS);
    return () => clearTimeout(t);
    // Re-armed if the demo is reset and the story is replayed from the search.
  }, [searchPhase, sawCandidates]);

  const value: Store = {
    candidates,
    criteria,
    shortlist,
    passed,
    outreach,
    forced,
    dailyLimit,
    query,
    senders,
    toasts,
    notifications,
    sawCandidates,
    focusCandidate,
    alertDismissed,
    overrides,
    pendingAsks,
    calendar,
    sequence,
    searchPhase,
    scanProgress,

    runSearch: () => {
      setSearchPhase('running');
      setScanProgress(0);
      // Counter climbs while the panel is up, so "running" is legible as work
      // rather than as a spinner.
      const started = Date.now();
      const tick = setInterval(() => {
        const t = Math.min(1, (Date.now() - started) / RUN_MS);
        setScanProgress(Math.round(SEARCH_TOTALS.scored * t));
        if (t >= 1) clearInterval(tick);
      }, 90);
      setTimeout(() => {
        clearInterval(tick);
        setScanProgress(SEARCH_TOTALS.scored);
        setSearchPhase('complete');
      }, RUN_MS);
    },

    resetDemo: () => {
      setSearchPhase('draft');
      setScanProgress(0);
      setShortlist(new Set());
      setPassed(new Set());
      setOutreach([]);
      setNotifications([]);
      setAlertDismissed([]);
      setFocusCandidate(null);
      setOverrides([]);
      setPendingAsks({});
      setCriteriaState(CRITERIA);
      setSawCandidates(false);
      toast('Demo reset. Start from the search.');
    },

    noteCandidatesSeen: () => setSawCandidates((seen) => seen || true),

    setCriteria: setCriteriaState,
    resetCriteria: () => setCriteriaState(CRITERIA),

    toggleShortlist: (id) =>
      setShortlist((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      }),

    shortlistMany: (ids) =>
      setShortlist((prev) => {
        const next = new Set(prev);
        ids.forEach((i) => next.add(i));
        return next;
      }),

    removeFromShortlist: (ids) =>
      setShortlist((prev) => {
        const next = new Set(prev);
        ids.forEach((i) => next.delete(i));
        return next;
      }),

    pass: (ids) => {
      setPassed((prev) => new Set([...prev, ...ids]));
      setShortlist((prev) => {
        const next = new Set(prev);
        ids.forEach((i) => next.delete(i));
        return next;
      });
    },

    overrideGate: (id) =>
      setCandidates((prev) =>
        prev.map((c) => (c.id === id ? { ...c, gateOverridden: !c.gateOverridden } : c)),
      ),

    overrideScore: (candidateId, criterionId, score) =>
      setCandidates((prev) =>
        prev.map((c) =>
          c.id !== candidateId ? c : {
            ...c,
            scores: c.scores.map((s) =>
              s.criterionId !== criterionId ? s : {
                ...s,
                override: { score, by: 'Sarah Chen', at: '16 Mar', original: s.score },
              },
            ),
          },
        ),
      ),

    actMany: (candidateIds, id) => {
      const ids = new Set(candidateIds);
      // Read from the ref, not from an updater: React only runs updaters eagerly
      // while the provider is idle, so mid-interaction the counts came out wrong.
      const before = outreachRef.current;
      let applied = 0;
      let said = '';
      let undoable = false;
      const next = before.map((r) => {
        if (!ids.has(r.candidateId)) return r;
        const res = applyAction(r, id);
        applied += 1;
        said = res.said;
        undoable = res.undoable;
        return res.record;
      });
      if (!applied) return;
      setOutreach(next);
      setNotifications((n) => n.filter((x) => !ids.has(x.candidateId)));
      const text = applied === 1 ? said : `${said.replace(/\.$/, '')} · ${applied} candidates.`;
      toast(text, undoable ? { label: 'Undo', onClick: () => setOutreach(before) } : undefined);
    },

    act: (candidateId, id, opts) => {
      let said = '';
      let undoable = false;
      const before = outreach;
      setOutreach((prev) =>
        prev.map((r) => {
          if (r.candidateId !== candidateId) return r;
          const res = applyAction(r, id, opts);
          said = res.said;
          undoable = res.undoable;
          return res.record;
        }),
      );
      // Acting on the candidate is what retires their notification — not
      // reading it. The panel and the row cannot disagree about what is open.
      setNotifications((n) => (n.some((x) => x.candidateId === candidateId)
        ? n.filter((x) => x.candidateId !== candidateId) : n));
      // The row and the pane carry the change; the toast only carries the undo.
      if (said) {
        toast(said, undoable ? { label: 'Undo', onClick: () => setOutreach(before) } : undefined);
      }
    },

    addToOutreach: (ids, asks) =>
      setOutreach((prev) => {
        const existing = new Set(prev.map((r) => r.candidateId));
        const added = ids
          .filter((id) => !existing.has(id))
          .map<OutreachRecord>((id) => {
            const carried = asks?.[id] ?? pendingAsks[id];
            return {
              candidateId: id,
              state: 'draft-ready',
              step: 0,
              totalSteps: 4,
              senderId: 'snd_li',
              lastActivity: 'just now',
              nextAt: null,
              isNew: true,
              asks: carried,
              messages: [{
                channel: 'linkedin',
                direction: 'out',
                draft: true,
                at: 'Draft',
                asks: carried,
                body: 'Ema drafted an opening message for this candidate.',
              }],
            };
          });
        return [...prev, ...added];
      }),

    setSequenceTemplate: (stepN, body) =>
      setSequence((prev) => prev.map((x) => (x.n === stepN ? { ...x, template: body } : x))),

    setStepBody: (candidateId, stepN, body) =>
      setOutreach((prev) => prev.map((r) => (r.candidateId === candidateId
        ? { ...r, stepBodies: { ...(r.stepBodies ?? {}), [stepN]: body } }
        : r))),

    setDraftBody: (candidateId, body) =>
      setOutreach((prev) => prev.map((r) => (r.candidateId === candidateId
        ? { ...r, messages: r.messages.map((m) => (m.draft ? { ...m, body } : m)) }
        : r))),

    acknowledgeArrivals: () =>
      setOutreach((prev) => (prev.some((r) => r.isNew) ? prev.map((r) => ({ ...r, isNew: false })) : prev)),

    askInOutreach: (candidateId, criterionId) => {
      setPendingAsks((prev) => {
        const cur = prev[candidateId] ?? [];
        return cur.includes(criterionId) ? prev : { ...prev, [candidateId]: [...cur, criterionId] };
      });
      // If they're already in outreach and nothing has gone out, attach it to the live draft.
      setOutreach((prev) => prev.map((r) => {
        if (r.candidateId !== candidateId || r.step > 0) return r;
        const asks = Array.from(new Set([...(r.asks ?? []), criterionId]));
        return {
          ...r,
          asks,
          messages: r.messages.map((m) => (m.draft ? { ...m, asks } : m)),
        };
      }));
    },

    setCellOverride: (o) =>
      setOverrides((prev) => [
        ...prev.filter((x) => !(x.candidateId === o.candidateId && x.criterionId === o.criterionId)),
        o,
      ]),

    clearCellOverride: (candidateId, criterionId) =>
      setOverrides((prev) => prev.filter((x) => !(x.candidateId === candidateId && x.criterionId === criterionId))),

    setDailyLimit,
    setQuery,

    reconnectCalendar: () => {
      setCalendar((c) => ({ ...c, connected: true }));
      toast('Google Calendar reconnected.');
    },

    reconnectSender: (id) => {
      setSenders((prev) => prev.map((s) => (s.id === id ? { ...s, connected: true } : s)));
      toast('Gmail reconnected. 6 paused messages resumed.');
    },

    setFocusCandidate,
    markNotificationsRead: () =>
      setNotifications((n) => (n.some((x) => !x.read) ? n.map((x) => ({ ...x, read: true })) : n)),
    dismissNotification: (id) => setNotifications((n) => n.filter((x) => x.id !== id)),
    dismissAlert: (id) => setAlertDismissed((prev) => (prev.includes(id) ? prev : [...prev, id])),

    toast,
    dismissToast: (id) => setToasts((t) => t.filter((x) => x.id !== id)),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
