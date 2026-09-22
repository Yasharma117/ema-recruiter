import React from 'react';
import {
  Check, Sparkle, ArrowRight, PaperPlaneTilt, Warning, Kanban, Rows,
} from '@phosphor-icons/react';
import type { OutreachRecord, OutreachState } from '../lib/types';
import { STATES, nextAction, isHalted, type ActionId } from '../lib/outreach';
import { SEARCH } from '../data/search';
import { StageWash } from '../components/Wash';
import { Avatar, Badge, Banner, Button, Checkbox, EmptyState, ToastStack, cx } from '../components/ui';
import { OutreachDetail } from '../components/OutreachDetail';
import { AppShell } from '../components/AppShell';
import { ClassifyPanel } from '../screens/Classify';
import { SchedulePanel } from '../screens/Schedule';
import { AVAILABILITY_HINTS } from '../data/outreach';
import { SequenceEditor, DraftEditor } from '../components/SequenceEditor';
import { ConfirmReschedule } from '../components/ConfirmReschedule';
import { useStore } from '../store';
import { useFocusTarget } from '../lib/useFocusTarget';
import { UsageOverlay } from './LayoutPicker';

/**
 * Outreach · B — Focus queue with a pipeline strip.
 *
 * B and C answered two different questions. B answered "what do I do next",
 * and was right: six decisions is a queue, so show one and measure success by
 * emptying it. C answered "where is everyone", and its board was the only
 * variant that could. Neither question is optional, but only one of them is
 * *work* — so the board is demoted to peripheral vision and the queue keeps the
 * whole decision surface.
 *
 * The strip is C's six columns compressed to one row of avatar chips. Colour
 * still encodes who is blocking, not stage. Chips that need you are buttons
 * that jump the queue to that person; chips waiting on a clock or a candidate
 * are inert, because they are. Column headers filter the queue. Nothing drags.
 *
 * When the queue empties, the strip expands in place into the full board — the
 * screen stops being a queue at exactly the moment there is nothing to decide
 * and becomes the orientation tool the empty state was standing in for. The
 * same expansion is available at any time with B.
 *
 * Sacrifices per-card detail while triaging: collapsed, a column is a count and
 * a row of faces, not readable cards.
 */

/**
 * Mirrors variant C's columns. C owns the canonical copy; duplicating eight
 * lines is cheaper than coupling the two variants that are meant to be compared.
 */
const COLUMNS: { id: string; label: string; states: OutreachState[] }[] = [
  { id: 'queued', label: 'Queued', states: ['draft-ready', 'scheduled'] },
  { id: 'sent', label: 'Sent', states: ['sent', 'send-limit'] },
  { id: 'replied', label: 'Replied', states: ['replied', 'sequence-finished'] },
  { id: 'scheduling', label: 'Scheduling', states: ['times-proposed', 'call-booked', 'reschedule-requested', 'call-done'] },
  { id: 'outcome', label: 'Outcome', states: ['interested', 'maybe-later', 'handed-off', 'not-interested'] },
  { id: 'blocked', label: 'Blocked', states: ['no-route', 'bounced', 'sender-disconnected', 'send-failed', 'already-contacted', 'calendar-disconnected'] },
];

/** Colour says who is blocking, not what stage it is — C's rule, kept. */
/* Semantic tokens, not raw scale steps — and `none` was beige-600, which is
   1.25:1 against the column it sits in: the "Done" state had no visible marker
   at all. Green says done, which is also what every other surface in the
   product uses it for. */
const DOT = {
  you: { cls: 'bg-[var(--error)]', label: 'Needs you' },
  clock: { cls: 'bg-[var(--pending)]', label: 'Waiting' },
  none: { cls: 'bg-[var(--success)]', label: 'Done' },
} as const;

type Who = keyof typeof DOT;

const CHIP_CAP = 7;

/**
 * Actions a bulk bar must not offer.
 *
 * Every one of them needs something a selection cannot supply: a panel
 * (schedule, reschedule), a dialog (confirm a moved time), a classification you
 * have to read for, a body of text you have to write, or an account-level fix
 * that is not per-candidate at all. Offering them across five people would be
 * inventing an action, so the bar stays quiet about them.
 */
const NOT_BULKABLE = new Set<ActionId>([
  'schedule-call', 'send-invite', 'reschedule', 'join-call',
  'confirm-new-time', 'decline-new-time', 'reconnect-calendar', 'reply',
  'reconnect', 'add-sender', 'view-other-search',
]);

/**
 * Actions you cannot honestly do to a batch — because doing them *is* looking
 * at each one. Picking these for a selection does not fire them: it takes the
 * board down, scopes the queue to exactly what you ticked, and walks you
 * through them one at a time. "Review and send" that sent without showing you
 * anything was the bug; a bulk bar should never be able to skip the reading.
 */
const WALK_THE_QUEUE = new Set<ActionId>(['review-and-send', 'read-and-classify']);

/** One unit of work: this person, in the state they are in right now. */
const workKey = (r: OutreachRecord) => `${r.candidateId}:${r.state}`;

export function OutreachFocusBoard() {
  const store = useStore();
  const { candidates, outreach, senders, criteria, forced, toasts, dismissToast, toast } = store;
  const [cursor, setCursor] = React.useState(0);
  const [colFilter, setColFilter] = React.useState<string | null>(null);
  /** null = follow the queue (expanded only when it is clear); true/false = you decided. */
  const [manualBoard, setManualBoard] = React.useState<boolean | null>(null);
  const [scheduleFor, setScheduleFor] = React.useState<string | null>(null);
  const [confirmFor, setConfirmFor] = React.useState<string | null>(null);
  /** The selection being walked, or null when the queue is the whole queue. */
  const [reviewIds, setReviewIds] = React.useState<string[] | null>(null);
  const reviewTotal = React.useRef(0);
  /** Selected, but this action does not apply to them — never silently dropped. */
  const [leftOut, setLeftOut] = React.useState<string[]>([]);
  /** Candidate ids ticked on the board. Selection is not a stage change. */
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [detailFor, setDetailFor] = React.useState<string | null>(null);
  /**
   * Bumped only when the queue is moved *discontinuously* — a chip, a
   * notification, entering or leaving a review. Keying the card on it replays
   * the card's own entrance for exactly those moves, and never for j/k/Enter,
   * which walk the queue and have to stay instant.
   */
  const [jump, setJump] = React.useState(0);

  const byId = React.useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);
  const senderById = React.useMemo(() => new Map(senders.map((s) => [s.id, s])), [senders]);

  // Same forced-state handling as variant A, so the edge cases read the same
  // in both — a held sender must not look healthy just because the layout changed.
  const records = React.useMemo(() => {
    if (forced !== 'sender-disconnected') return outreach;
    return outreach.map((r) => (r.senderId === 'snd_gmail' && !isHalted(r)
      ? { ...r, state: 'sender-disconnected' as OutreachState } : r));
  }, [outreach, forced]);

  const blockedBy = React.useCallback((r: OutreachRecord): Who => {
    const a = nextAction(r, senderById.get(r.senderId));
    return a.kind === 'human' ? 'you' : a.kind === 'waiting' ? 'clock' : 'none';
  }, [senderById]);

  // Only what needs a person. Everything waiting is, correctly, not in the queue.
  const allQueue = records.filter((r) => blockedBy(r) === 'you');
  const activeCol = COLUMNS.find((c) => c.id === colFilter) ?? null;
  // A review scopes the queue harder than a column filter does, so it wins.
  const reviewSet = reviewIds ? new Set(reviewIds) : null;
  const queue = reviewSet
    ? allQueue.filter((r) => reviewSet.has(r.candidateId))
    : activeCol ? allQueue.filter((r) => activeCol.states.includes(r.state)) : allQueue;
  const waiting = records.length - allQueue.length;

  /* How far through the queue you are.
     Two wrong models preceded this one. `cursor / queue.length` never moved,
     because acting on a card removes it and leaves the cursor where it was —
     same index, shorter list. Measuring cleared-against-starting-total does
     not move either, and for a more interesting reason: the queue is not a
     list you drain. `replied` is human work, and marking it interested
     produces `interested`, which is *also* human work ("schedule the call").
     The record never leaves. Only a terminal action genuinely removes one.

     So the unit is a job, not a person: candidate plus the state they were in
     when you dealt with them. Handling Priya's reply counts, and the call you
     now owe Priya counts separately as still outstanding — which is the truth,
     and it means the bar moves on every action while "N left" stays honest. */
  const handled = React.useRef(new Set<string>());
  const outstanding = queue.filter((r) => !handled.current.has(workKey(r))).length;
  const passTotal = handled.current.size + outstanding;
  const progress = passTotal ? (passTotal - outstanding) / passTotal : 1;

  const record = queue[Math.min(cursor, queue.length - 1)] ?? null;
  /* The focus view holds one item at a time, so the background can say where
     that item sits in the funnel — the same painting as the search screen,
     keyed to the stage rather than to the act. Working the queue becomes a
     journey through the hues instead of a stack of identical white cards. */
  const stageTone = record
    ? COLUMNS.find((c) => c.states.includes(record.state))?.id ?? null
    : null;
  const candidate = record ? byId.get(record.candidateId) : null;

  const boardOpen = manualBoard ?? allQueue.length === 0;
  const disconnected = senders.find((s) => !s.connected);

  const act = (r: OutreachRecord, id: ActionId) => {
    if (id === 'reconnect') { store.reconnectSender(r.senderId); return; }
    if (id === 'confirm-new-time') { setConfirmFor(r.candidateId); return; }
    if (id === 'reconnect-calendar') { store.reconnectCalendar(); return; }
    if (id === 'schedule-call' || id === 'reschedule' || id === 'decline-new-time') {
      setScheduleFor(r.candidateId); return;
    }
    if (id === 'join-call') { toast('Opening Google Meet.'); return; }
    if (id === 'view-other-search') { toast('Opening “Staff Backend — EMEA”.'); return; }
    // Only here, past the early returns: opening the schedule or confirm
    // modal is not having dealt with the card, it is starting to.
    handled.current.add(workKey(r));
    store.act(r.candidateId, id);
    setCursor((c) => Math.min(c, Math.max(0, queue.length - 2)));
  };

  /** Strip → queue. The only way the board moves anything is by moving your attention. */
  const jumpTo = (candidateId: string) => {
    setReviewIds(null);
    const i = allQueue.findIndex((r) => r.candidateId === candidateId);
    if (i < 0) return;
    if (allQueue[i].candidateId !== record?.candidateId) setJump((n) => n + 1);
    setDetailFor(null);
    setColFilter(null);
    setManualBoard(false);
    setCursor(i);
  };

  /* ---------------------------- selection ---------------------------------- */

  /**
   * The rule: the first tick opens the board.
   *
   * A selection you cannot see is not a selection — from the collapsed strip you
   * would be acting on a row of faces. So going from nothing selected to
   * something selected expands the board, which is also what "category based
   * bulk select … would eventually bring forth the collapsed kanban board"
   * asks for. Clearing the selection leaves the board where it is: you opened
   * it, you close it. The `b` toggle still overrides either way.
   */
  const select = (next: Set<string>) => {
    if (next.size && !selected.size) setManualBoard(true);
    setSelected(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    select(next);
  };
  const toggleMany = (rows: OutreachRecord[], on: boolean) => {
    const next = new Set(selected);
    rows.forEach((r) => (on ? next.add(r.candidateId) : next.delete(r.candidateId)));
    select(next);
  };

  const selectedRecords = records.filter((r) => selected.has(r.candidateId));

  /**
   * Bulk actions are read off the domain, never invented: each selected record
   * offers whatever `nextAction` says it offers, and identical actions collapse
   * into one button that carries its own count. "Review and send 3" on a
   * selection of five is the honest label when only three have a draft.
   */
  const bulkActions = (() => {
    const m = new Map<ActionId, { label: string; ids: string[] }>();
    selectedRecords.forEach((r) => {
      const a = nextAction(r, senderById.get(r.senderId));
      [a.primary, a.secondary].forEach((x) => {
        if (!x || NOT_BULKABLE.has(x.id)) return;
        const e = m.get(x.id) ?? { label: x.label, ids: [] };
        e.ids.push(r.candidateId);
        m.set(x.id, e);
      });
    });
    return [...m.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.ids.length - a.ids.length)
      .slice(0, 4);
  })();

  const covered = new Set(bulkActions.flatMap((a) => a.ids)).size;

  const runBulk = (id: ActionId, ids: string[]) => {
    const rest = [...selected].filter((cid) => !ids.includes(cid));
    setSelected(new Set());
    if (WALK_THE_QUEUE.has(id)) {
      // Not an action — a route into the queue, holding exactly this selection.
      reviewTotal.current = ids.length;
      setLeftOut(rest);
      setReviewIds(ids);
      setColFilter(null);
      setManualBoard(false);
      setCursor(0);
      setJump((n) => n + 1);
      return;
    }
    // One call, so the batch gets one toast and one undo that covers all of it.
    store.actMany(ids, id);
  };

  const endReview = () => { setReviewIds(null); setLeftOut([]); setCursor(0); setJump((n) => n + 1); };

  // The walk ends when the last one stops needing you — not when it is "sent",
  // since skipping and classifying clear a record just as legitimately.
  React.useEffect(() => {
    if (!reviewIds || queue.length > 0) return;
    toast(`Reviewed ${reviewTotal.current} candidate${reviewTotal.current === 1 ? '' : 's'}.`);
    setReviewIds(null);
    setLeftOut([]);
    setCursor(0);
  }, [reviewIds, queue.length, toast]);

  // A notification names a person, so it moves the queue to them — the same
  // move the strip makes, for the same reason.
  useFocusTarget((id, movedCall) => {
    jumpTo(id);
    if (movedCall) setConfirmFor(id);
  });

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      // The detail drawer owns the keyboard while it is open — Escape closes it.
      if (detailFor) return;
      if (e.key === 'b') { e.preventDefault(); setManualBoard(!boardOpen); return; }
      if (!record || boardOpen) return;
      const a = nextAction(record, senderById.get(record.senderId));
      if (e.key === 'Enter' && a.primary) { e.preventDefault(); act(record, a.primary.id); }
      if (e.key === 'j') { e.preventDefault(); setCursor((c) => Math.min(queue.length - 1, c + 1)); }
      if (e.key === 'k') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [record, queue.length, boardOpen, detailFor]);

  if (!outreach.length) {
    return (
      <AppShell breadcrumbs={['Searches', SEARCH.name, 'Outreach']} screen="outreach">
        <EmptyState icon={<PaperPlaneTilt size={22} />} title="No outreach yet."
          body="Shortlist candidates, then start outreach from the candidate list." />
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumbs={['Searches', SEARCH.name, 'Outreach']} screen="outreach">
      <div className="h-full flex flex-col">
        {disconnected && forced === 'sender-disconnected' && (
          <div className="shrink-0 px-5 pt-3">
            <Banner
              variant="error"
              icon={<Warning size={15} weight="bold" />}
              title={`${disconnected.handle} needs to be reconnected.`}
              action={<Button size="xs" onClick={() => store.reconnectSender(disconnected.id)}>Reconnect Gmail</Button>}
            >
              Everything on that account is held. Nothing is retrying in the background.
            </Banner>
          </div>
        )}

        {/* Pipeline — orientation, never work. Collapsed it is chips; expanded it is C. */}
        <div
          data-usage="stats"
          className={cx(
            'shrink-0 px-5 pt-3 pb-3 border-b border-[var(--beige-400)]',
            boardOpen && 'flex-1 min-h-0 flex flex-col',
          )}
        >


          <div className="flex items-center gap-3 flex-wrap mb-2 shrink-0">
            {allQueue.length ? (
              <span className="text-sm text-[var(--fg1)]">
                <span className="font-bold tabular-nums">{allQueue.length}</span> need you
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm text-[var(--success-text)]">
                <Check size={14} weight="bold" /> Queue is clear
              </span>
            )}
            {(['you', 'clock', 'none'] as const).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5 text-xs text-[var(--fg2)]">
                <span className={cx('size-2 rounded-full', DOT[k].cls)} /> {DOT[k].label}
              </span>
            ))}
            <div className="flex-1" />
            {colFilter && (
              <button
                onClick={() => { setColFilter(null); setCursor(0); }}
                className="text-xs font-medium text-[var(--success-text)] hover:underline cursor-pointer"
              >
                Clear filter
              </button>
            )}
            {/* Mode switch, not a link. Queue and board are the two halves of
                this screen, so the control is a real segmented toggle rather
                than the ghost text it used to be. */}
            <div
              role="group"
              aria-label="View"
              className="inline-flex items-center gap-0.5 rounded-md border border-[var(--beige-400)] bg-[var(--beige-200)] p-0.5"
            >
              {([
                { on: false, label: 'Queue', Icon: Rows },
                { on: true, label: 'Board', Icon: Kanban },
              ] as const).map(({ on, label, Icon }) => (
                <button
                  key={label}
                  aria-pressed={boardOpen === on}
                  onClick={() => setManualBoard(on)}
                  className={cx(
                    'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm text-xs font-bold cursor-pointer',
                    'transition-[background-color,color,box-shadow] duration-150 ease-[var(--ease-out-quint)]',
                    boardOpen === on
                      ? 'bg-white text-[var(--fg1)] shadow-[var(--shadow-xs)]'
                      : 'text-[var(--fg2)] hover:text-[var(--fg1)]',
                  )}
                >
                  <Icon size={13} weight="bold" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className={cx('flex gap-2', boardOpen ? 'flex-1 min-h-0' : 'items-stretch')}>
            {COLUMNS.map((col) => {
              const rows = records.filter((r) => col.states.includes(r.state));
              const active = colFilter === col.id;
              const shown = boardOpen ? rows : rows.slice(0, CHIP_CAP);
              const picked = rows.filter((r) => selected.has(r.candidateId)).length;
              const colAll = rows.length > 0 && picked === rows.length;
              const colSome = picked > 0;
              return (
                <div
                  key={col.id}
                  className={cx(
                    'flex-1 min-w-0 flex flex-col rounded-lg border p-2',
                    'transition-colors duration-200 ease-[var(--ease-out-quint)]',
                    active
                      ? 'bg-[var(--beige-200)] border-[var(--beige-600)]'
                      : 'bg-[var(--beige-100)] border-[var(--beige-300)]',
                  )}
                >
                  <div className="flex items-center gap-1.5 px-0.5 pb-1.5 shrink-0">
                    {/* Category bulk select — a whole column in one tick. */}
                    <Checkbox
                      checked={colAll}
                      indeterminate={colSome && !colAll}
                      disabled={!rows.length}
                      label={`Select all in ${col.label}`}
                      onChange={(v) => toggleMany(rows, v)}
                    />
                    <button
                      onClick={() => { setColFilter(active ? null : col.id); setCursor(0); }}
                      disabled={!rows.length}
                      title={rows.length ? `Filter the queue to ${col.label.toLowerCase()}` : undefined}
                      className={cx(
                        'flex items-center gap-1.5 min-w-0 text-left rounded-sm px-1.5 py-1 -mx-1',
                        'transition-colors duration-150',
                        rows.length
                          ? 'cursor-pointer group hover:bg-[var(--beige-300)]'
                          : 'cursor-default',
                      )}
                    >
                      <span className={cx(
                        'text-xs font-bold uppercase tracking-[1.2px] truncate',
                        active ? 'text-[var(--fg1)]' : 'text-[var(--fg3)] group-hover:text-[var(--fg1)]',
                      )}>
                        {col.label}
                      </span>
                      <span className="text-xs text-[var(--fg2)] tabular-nums">{rows.length}</span>
                    </button>
                  </div>

                  {boardOpen ? (
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 animate-[emaFade_200ms_var(--ease-out-quint)]">
                      {shown.map((r) => {
                        const c = byId.get(r.candidateId);
                        if (!c) return null;
                        const who = blockedBy(r);
                        const a = nextAction(r, senderById.get(r.senderId));
                        const isSel = selected.has(r.candidateId);
                        // Every card opens, waiting or not — inspecting is not acting.
                        const open = () => setDetailFor(r.candidateId);
                        return (
                          <div
                            key={r.candidateId}
                            role="button"
                            tabIndex={0}
                            aria-label={`${c.name}, ${STATES[r.state].label}. Open details.`}
                            onClick={open}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
                            className={cx(
                              'rounded-md border bg-white p-2 shadow-[var(--shadow-xs)] cursor-pointer',
                              'transition-[box-shadow,border-color,background-color] duration-150 ease-[var(--ease-out-quint)]',
                              'hover:shadow-[var(--shadow-sm)]',
                              isSel
                                ? 'border-[var(--brand-primary)] bg-[var(--success-bg-subtle)]'
                                : 'border-[var(--beige-400)]',
                            )}
                          >
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Checkbox
                                checked={isSel}
                                label={`Select ${c.name}`}
                                onChange={() => toggleOne(r.candidateId)}
                              />
                              <Avatar name={c.name} size={20} tone={c.avatarTone} />
                              <span className="text-sm font-medium text-[var(--fg1)] truncate flex-1">{c.name}</span>
                              <span className={cx('size-2 rounded-full shrink-0', DOT[who].cls)} title={DOT[who].label} />
                            </div>
                            <Badge variant={STATES[r.state].tone as any} size="sm">{STATES[r.state].label}</Badge>
                            <div className={cx('text-xs mt-1.5 line-clamp-2',
                              who === 'you' ? 'text-[var(--success-text)] font-medium' : 'text-[var(--fg2)]')}>
                              {who === 'you' ? `${a.primary?.label ?? a.label} →` : a.label}
                            </div>
                          </div>
                        );
                      })}
                      {!rows.length && <div className="text-xs text-[var(--fg3)] text-center py-5">Empty</div>}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 h-[22px]">
                      {shown.map((r) => {
                        const c = byId.get(r.candidateId);
                        if (!c) return null;
                        const who = blockedBy(r);
                        const isSel = selected.has(r.candidateId);
                        const jumps = who === 'you';
                        const title = jumps
                          ? `${c.name} · ${STATES[r.state].label} · decide about them`
                          : `${c.name} · ${STATES[r.state].label} · ${DOT[who].label} · open details`;
                        const focused = record?.candidateId === r.candidateId;
                        const dot = (
                          <span className={cx(
                            'absolute -right-0.5 -bottom-0.5 size-[7px] rounded-full ring-2',
                            active ? 'ring-[var(--beige-200)]' : 'ring-[var(--beige-100)]',
                            DOT[who].cls,
                          )} />
                        );
                        // Needs-you chips still jump the queue — that is the fast
                        // path. Everyone else now opens, instead of being inert.
                        return (
                          <button
                            key={r.candidateId}
                            title={title}
                            aria-label={title}
                            onClick={() => (jumps ? jumpTo(r.candidateId) : setDetailFor(r.candidateId))}
                            className={cx(
                              'relative shrink-0 rounded-full cursor-pointer',
                              'transition-[transform,opacity] duration-150 ease-[var(--ease-out-quint)] hover:-translate-y-px',
                              !jumps && 'opacity-55 hover:opacity-100',
                            )}
                          >
                            {/* inline-flex, not block: a block span takes a line
                                box and comes out 20x22, so the ring drew an oval. */}
                            <span className={cx(
                              'inline-flex rounded-full',
                              (focused || isSel) && 'ring-2 ring-[var(--brand-primary)] ring-offset-1',
                              (focused || isSel) && (active ? 'ring-offset-[var(--beige-200)]' : 'ring-offset-[var(--beige-100)]'),
                            )}>
                              <Avatar name={c.name} size={20} tone={c.avatarTone} />
                            </span>
                            {dot}
                          </button>
                        );
                      })}
                      {rows.length > CHIP_CAP && (
                        <span className="text-xs text-[var(--fg3)] tabular-nums shrink-0 pl-0.5">
                          +{rows.length - CHIP_CAP}
                        </span>
                      )}
                      {!rows.length && <span className="text-xs text-[var(--fg3)]">Empty</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {boardOpen && (
            <div className="shrink-0 pt-2 text-xs text-[var(--fg2)]">
              Cards are not draggable — stage changes come from Ema or the candidate, not from you.
              {' '}Open any card to see what it is doing. Tick one, or a column header for the whole stage.
            </div>
          )}
        </div>

        {!boardOpen && (
          <div className="relative flex-1 min-h-0">
            {/* The wash sits behind, outside the scroller: `.wash` is absolute
                with z-index 0, so inside the scroll container it both covered
                the queue and scrolled away with it.

                The scroller is absolutely positioned rather than `h-full`. A
                percentage height resolving through flex-1 → min-h-0 → h-full is
                exactly the chain that collapses, and when it did, the queue's
                own `flex-1` children got zero height and the card vanished.
                inset-0 against a positioned parent needs nothing to resolve. */}
            <StageWash tone={stageTone} strength={0.75} />
            <div className="absolute inset-0 z-10 flex flex-col items-center overflow-y-auto">
            {/* Progress — emptying the queue is the goal, so it is the headline. */}
            <div className="w-full max-w-[760px] px-5 pt-4 pb-3 shrink-0" data-usage="grouping">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-[var(--fg1)]">
                  {reviewIds ? 'Your selection' : activeCol ? activeCol.label : 'Needs you'}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-[var(--beige-500)] overflow-hidden">
                  <div
                    /* No transition: this bar is driven by j/k/Enter, and a
                       width animation is both a layout property and a 300ms
                       lag on the fastest loop on the screen. */
                    className="h-full rounded-full bg-[var(--brand-primary)]"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-[var(--fg1)] tabular-nums">
                  {queue.length ? `${queue.length} left` : 'all clear'}
                </span>
                </div>
              <div className="text-xs text-[var(--fg3)] mt-1.5 flex items-center gap-2 flex-wrap">
                {reviewIds ? (
                  <>
                    <span>
                      Reviewing the {reviewTotal.current} you picked · {allQueue.length} need you in total
                    </span>
                    {/* The rest of the selection is not in this pass — a scheduled
                        send is not waiting on you. Say which, and let them look. */}
                    {leftOut.length > 0 && (
                      <span className="flex items-center gap-1">
                        <span>
                          {leftOut.length} more you picked {leftOut.length === 1 ? 'is' : 'are'} not waiting on you
                        </span>
                        <button
                          onClick={() => setDetailFor(leftOut[0])}
                          className="font-medium text-[var(--fg2)] rounded-xs px-1 hover:bg-[var(--beige-100)] hover:text-[var(--fg1)] cursor-pointer transition-colors duration-150"
                        >
                          Open {byId.get(leftOut[0])?.name.split(' ')[0] ?? 'it'}
                        </button>
                      </span>
                    )}
                    <button
                      onClick={endReview}
                      className="font-medium text-[var(--brand-ink)] rounded-xs px-1 hover:bg-[var(--beige-200)] cursor-pointer transition-colors duration-150"
                    >
                      Show the whole queue
                    </button>
                  </>
                ) : activeCol
                  ? `Filtered to ${activeCol.label.toLowerCase()} · ${allQueue.length} need you in total`
                  : `${waiting} waiting on a clock or a candidate · shown above, not in the queue`}
              </div>
            </div>

            {!record || !candidate ? (
              <div className="flex-1 flex items-center">
                <EmptyState
                  icon={<Check size={22} />}
                  title={activeCol ? `Nothing in ${activeCol.label.toLowerCase()} needs you.` : 'Queue is clear.'}
                  body={activeCol
                    ? `${allQueue.length} item${allQueue.length === 1 ? '' : 's'} elsewhere still need you.`
                    : `Nothing needs you right now. ${waiting} item${waiting === 1 ? '' : 's'} still in flight.`}
                  action={activeCol
                    ? <Button size="sm" onClick={() => { setColFilter(null); setCursor(0); }}>Show the whole queue</Button>
                    : <Button size="sm" variant="secondary" color="altBrand" onClick={() => setManualBoard(true)}>Open the board</Button>}
                />
              </div>
            ) : (
              <div className="w-full max-w-[760px] px-5 pb-10" data-usage="next-action">
                <div key={jump} className="rounded-xl border border-[var(--beige-400)] bg-white shadow-[var(--shadow-sm)] p-5 animate-[emaIn_200ms_var(--ease-out-quint)]">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar name={candidate.name} size={36} tone={candidate.avatarTone} />
                    <div className="flex-1 min-w-0">
                      <div className="text-lg font-bold text-[var(--fg1)] truncate">{candidate.name}</div>
                      <div className="text-xs text-[var(--fg3)] truncate">{candidate.title} · {candidate.company}</div>
                    </div>
                    <Badge variant={STATES[record.state].tone as any} size="md">{STATES[record.state].label}</Badge>
                  </div>

                  <div className="text-sm text-[var(--fg2)] mb-4">{STATES[record.state].means}</div>

                  {record.state === 'replied' ? (
                    <ClassifyPanel
                      record={record}
                      candidate={candidate}
                      criteria={criteria}
                      onClassify={(outcome) => { store.act(record.candidateId, 'read-and-classify', { outcome }); }}
                      onResolveCell={(criterionId, score, quote) => {
                        store.setCellOverride({
                          candidateId: record.candidateId, criterionId, score, via: 'reply',
                          by: candidate.name, at: '16 Mar', quote,
                          originalScore: candidate.scores.find((s) => s.criterionId === criterionId)?.score ?? null,
                        });
                        toast('Recorded from the reply.');
                      }}
                    />
                  ) : (
                    <>
                      {record.messages.slice(-1).map((m, i) => (
                        <div key={i} className={cx('rounded-lg border p-3 mb-4',
                          m.draft ? 'border-[var(--ai-magic-border)] bg-[var(--ai-magic-bg-subtle)]' : 'border-[var(--beige-400)] bg-[var(--bg3)]')}>
                          {m.draft ? (
                            <>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Sparkle size={12} weight="fill" className="text-[var(--ai-magic-text)]" />
                                <span className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--ai-magic-text)]">
                                  Drafted by Ema · Review before sending
                                </span>
                              </div>
                              <DraftEditor
                                body={m.body}
                                onSave={(t) => { store.setDraftBody(record.candidateId, t); toast('Draft updated.'); }}
                                onSend={() => act(record, 'review-and-send')}
                                onSkip={() => act(record, 'skip')}
                              />
                            </>
                          ) : (
                            <div className="text-sm text-[var(--fg2)] whitespace-pre-line leading-[20px]">{m.body}</div>
                          )}
                        </div>
                      ))}

                      <details className="mb-4 group">
                        <summary className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--fg2)] cursor-pointer hover:text-[var(--fg1)]">
                          The rest of the sequence · {record.totalSteps - record.step} unsent
                        </summary>
                        <div className="mt-2.5">
                          <SequenceEditor
                            record={record}
                            firstName={candidate.name.split(' ')[0]}
                            onEdit={(n, body) => { store.setStepBody(record.candidateId, n, body); toast(`Step ${n} updated.`); }}
                          />
                        </div>
                      </details>

                      {(() => {
                        const a = nextAction(record, senderById.get(record.senderId));
                        return (
                          <div className="flex items-center gap-2 flex-wrap">
                            {a.primary && (
                              <Button onClick={() => act(record, a.primary!.id)} icon={<Check size={14} weight="bold" />}>
                                {a.primary.label}
                              </Button>
                            )}
                            {a.secondary && (
                              <Button variant="secondary" color="altBrand" onClick={() => act(record, a.secondary!.id)}>
                                {a.secondary.label}
                              </Button>
                            )}
                            <Button variant="ghost" color="altBrand" iconRight={<ArrowRight size={13} />}
                              onClick={() => setCursor((c) => Math.min(queue.length - 1, c + 1))}>
                              Skip
                            </Button>
                          </div>
                        );
                      })()}
                    </>
                  )}

                  <div className="mt-4 pt-3 border-t border-[var(--beige-400)] text-xs text-[var(--fg3)]">
                    <kbd className="font-mono">⏎</kbd> take the action ·{' '}
                    <kbd className="font-mono">J</kbd> skip · <kbd className="font-mono">K</kbd> back ·{' '}
                    <kbd className="font-mono">B</kbd> board
                  </div>
                </div>

                {queue.length > 1 && (
                  /* A count of what is left in the queue, not a control. It
                     carried a caret, which is the one glyph in this product
                     that means "press me to open something" — so it read as a
                     dropdown that does nothing when clicked. The sentence says
                     it on its own. */
                  <div className="text-center mt-3 text-xs text-[var(--fg3)]">
                    {queue.length - cursor - 1} more after this
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        )}

        {/* Bulk bar — one dark strip, the same one the candidate list uses. */}
        {selected.size > 0 && (
          <div
            data-usage="bulk"
            role="status"
            aria-live="polite"
            className="shrink-0 bg-[var(--surface-dark)] text-[var(--surface-dark-fg-strong)] px-5 py-3.5 flex items-center gap-3 flex-wrap animate-[emaRise_200ms_var(--ease-out-quint)]"
          >
            <span className="text-sm font-medium">{selected.size} selected</span>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-[var(--surface-dark-fg)] rounded-xs px-1 py-0.5 hover:text-[var(--surface-dark-fg-strong)] active:text-[var(--surface-dark-fg-faint)] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus-visible:shadow-none"
            >
              Clear
            </button>
            <div className="w-px h-5 bg-[var(--surface-dark-line)]" />
            {bulkActions.length ? bulkActions.map((a) => (
              <button
                key={a.id}
                onClick={() => runBulk(a.id, a.ids)}
                title={`Applies to ${a.ids.length} of the ${selected.size} selected`}
                aria-label={`${a.label}. Applies to ${a.ids.length} of ${selected.size} selected.`}
                className={cx(
                  'inline-flex items-center gap-1.5 text-sm px-2.5 py-1 rounded-sm cursor-pointer transition-colors',
                  'hover:bg-[var(--surface-dark-hover)] active:bg-[var(--surface-dark-active)]',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white focus-visible:shadow-none',
                )}
              >
                {a.label}
                <span className="tabular-nums text-[var(--surface-dark-fg)]">{a.ids.length}</span>
              </button>
            )) : (
              <span className="text-sm text-[var(--surface-dark-fg)]">
                Nothing in this selection can be done in bulk.
              </span>
            )}
            {/* Honest about the remainder: a count on a button is only half the truth. */}
            {bulkActions.length > 0 && covered < selected.size && (
              <span className="text-xs text-[var(--surface-dark-fg)]">
                {selected.size - covered} of {selected.size} have nothing you can do in bulk.
              </span>
            )}
          </div>
        )}
      </div>

      {detailFor && (() => {
        const rec = records.find((r) => r.candidateId === detailFor);
        const cand = byId.get(detailFor);
        if (!rec || !cand) return null;
        return (
          <OutreachDetail
            record={rec}
            candidate={cand}
            sender={senderById.get(rec.senderId)}
            onClose={() => setDetailFor(null)}
            onAction={(r, id) => { setDetailFor(null); act(r, id); }}
            onJump={allQueue.some((r) => r.candidateId === detailFor)
              ? () => jumpTo(detailFor) : undefined}
          />
        );
      })()}

      {confirmFor && (() => {
        const rec = outreach.find((r) => r.candidateId === confirmFor);
        const cand = byId.get(confirmFor);
        if (!rec || !cand) return null;
        return (
          <ConfirmReschedule
            open
            onClose={() => setConfirmFor(null)}
            record={rec}
            candidate={cand}
            onConfirm={() => { store.act(confirmFor, 'confirm-new-time'); setConfirmFor(null); }}
            onPropose={() => { setConfirmFor(null); setScheduleFor(confirmFor); }}
          />
        );
      })()}

      {scheduleFor && (() => {
        const rec = outreach.find((r) => r.candidateId === scheduleFor);
        const cand = byId.get(scheduleFor);
        if (!rec || !cand) return null;
        return (
          <SchedulePanel
            open
            onClose={() => setScheduleFor(null)}
            record={rec}
            candidate={cand}
            hint={AVAILABILITY_HINTS[scheduleFor]}
            calendarConnected={store.calendar.connected}
            onSend={(meeting) => { store.act(scheduleFor, 'send-invite', { meeting }); setScheduleFor(null); }}
          />
        );
      })()}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <UsageOverlay screen="outreach" />
    </AppShell>
  );
}
