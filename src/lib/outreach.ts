import type { Channel, OutreachRecord, OutreachState, Outcome, Sender, Slot } from './types';

/**
 * The outreach state machine.
 *
 * Rule for what earns a state: ACTIVE states are distinguished by what you DO
 * next — if two states resolve to the same action they are one state with
 * different metadata. TERMINAL states are distinguished by what they RECORD;
 * they share a non-action but mean different things to the pipeline.
 *
 * This is the single source of truth for the table, the grouping and the
 * detail pane, so they cannot disagree about what happens next.
 */

export type StateKind = 'you' | 'waiting' | 'blocked' | 'terminal';
export type Tone = 'default' | 'info' | 'success' | 'warning' | 'error' | 'pending' | 'magic' | 'muted';

export interface StateMeta {
  label: string;
  kind: StateKind;
  tone: Tone;
  /** One line under the badge in the detail pane — what this state means. */
  means: string;
}

export const STATES: Record<OutreachState, StateMeta> = {
  // — waiting on you —
  'draft-ready': {
    label: 'Draft ready', kind: 'you', tone: 'magic',
    means: 'Ema wrote the first message. Nothing sends until you approve it.',
  },
  replied: {
    label: 'Replied', kind: 'you', tone: 'magic',
    means: 'Something came back. Follow-ups are already stopped.',
  },
  'sequence-finished': {
    label: 'No reply', kind: 'you', tone: 'pending',
    means: 'All four steps went out and nothing came back.',
  },
  interested: {
    label: 'Interested', kind: 'you', tone: 'success',
    means: 'You classified this reply as interested.',
  },
  'maybe-later': {
    label: 'Maybe later', kind: 'you', tone: 'pending',
    means: 'Open to a conversation, not now.',
  },
  'reschedule-requested': {
    label: 'Reschedule requested', kind: 'you', tone: 'warning',
    means: 'The time moved from their side. Nothing is confirmed until you accept it.',
  },
  'call-done': {
    label: 'Call done', kind: 'you', tone: 'success',
    means: 'The call happened. Decide whether they go forward.',
  },

  // — waiting on a clock or the candidate —
  scheduled: {
    label: 'Scheduled', kind: 'waiting', tone: 'info',
    means: 'Approved and queued. Sends inside the candidate’s working hours.',
  },
  sent: {
    label: 'Sent', kind: 'waiting', tone: 'info',
    means: 'In flight. The next step fires on its own unless they reply first.',
  },
  'send-limit': {
    label: 'Send limit reached', kind: 'waiting', tone: 'warning',
    means: 'The sender hit its weekly cap. This resumes on its own.',
  },
  'times-proposed': {
    label: 'Times proposed', kind: 'waiting', tone: 'info',
    means: 'Options are with them. Whichever they pick lands on both calendars.',
  },
  'call-booked': {
    label: 'Call booked', kind: 'waiting', tone: 'success',
    means: 'Confirmed on both calendars. They can still move it from their side.',
  },

  // — blocked: faults, not judgements —
  'no-route': {
    label: 'No way to reach them', kind: 'blocked', tone: 'warning',
    means: 'No verified address on file, so email cannot be the first step.',
  },
  bounced: {
    label: 'Email bounced', kind: 'blocked', tone: 'error',
    means: 'The address rejected the message. Nothing will retry it.',
  },
  'sender-disconnected': {
    label: 'Blocked', kind: 'blocked', tone: 'error',
    means: 'The sending account lost authorisation. Every row on it is held.',
  },
  'send-failed': {
    label: 'Send failed', kind: 'blocked', tone: 'error',
    means: 'Three attempts failed. Ema stopped rather than keep trying.',
  },
  'already-contacted': {
    label: 'Already being contacted', kind: 'blocked', tone: 'warning',
    means: 'Someone else is mid-conversation with this person.',
  },
  'calendar-disconnected': {
    label: 'Calendar blocked', kind: 'blocked', tone: 'error',
    means: 'The calendar lost authorisation, so no invite can be sent.',
  },

  // — terminal —
  'handed-off': {
    label: 'Handed off', kind: 'terminal', tone: 'success',
    means: 'Moved into the hiring process. Outreach is done here.',
  },
  'not-interested': {
    label: 'Not interested', kind: 'terminal', tone: 'muted',
    means: 'Declined. No further contact in this search.',
  },
  cancelled: {
    label: 'Cancelled', kind: 'terminal', tone: 'muted',
    means: 'You stopped this sequence before it finished.',
  },
  'do-not-contact': {
    label: 'Do not contact', kind: 'terminal', tone: 'error',
    means: 'Blocked everywhere, in this search and every future one.',
  },
};

export const ACTIVE_STATES = (Object.keys(STATES) as OutreachState[])
  .filter((s) => STATES[s].kind !== 'terminal');

/* -------------------------------------------------------------------------- */
/*  Next action                                                               */
/* -------------------------------------------------------------------------- */

/** What an action does when you take it. `null` = no transition, just a side effect. */
export type ActionId =
  | 'review-and-send' | 'send-now'
  | 'read-and-classify'
  | 'close-out' | 'retry-later'
  | 'schedule-call' | 'hand-off'
  | 'send-invite' | 'nudge' | 'join-call' | 'reschedule'
  | 'confirm-new-time' | 'decline-new-time' | 'cancel-call'
  | 'mark-call-done' | 'not-a-fit' | 'reconnect-calendar'
  | 'reply' | 'snooze'
  | 'use-linkedin' | 'find-address' | 'skip'
  | 'switch-channel' | 'reconnect' | 'retry' | 'add-sender'
  | 'view-other-search' | 'contact-anyway'
  | 'restart' | 'suppress';

export interface Act { id: ActionId; label: string }

export interface NextAction {
  /** Imperative when a person must act; descriptive when it waits on a clock or a candidate. */
  label: string;
  kind: 'human' | 'waiting' | 'none';
  primary?: Act;
  secondary?: Act;
}

function wait(hours: number | null): string {
  if (hours === null) return 'shortly';
  if (hours <= 1) return 'within the hour';
  if (hours < 24) return `in ${Math.round(hours)}h`;
  return `in ${Math.round(hours / 24)}d`;
}

export function nextAction(r: OutreachRecord, sender?: Sender): NextAction {
  switch (r.state) {
    // — waiting on you —
    case 'draft-ready':
      return {
        label: r.asks?.length
          ? 'Draft is ready, and it asks a question'
          : 'Draft is ready for you',
        kind: 'human',
        primary: { id: 'review-and-send', label: 'Review and send' },
      };
    case 'replied':
      return {
        label: 'Reply needs your read',
        kind: 'human',
        primary: { id: 'read-and-classify', label: 'Read and classify' },
      };
    case 'sequence-finished':
      return {
        label: `All ${r.totalSteps} steps sent, no reply`,
        kind: 'human',
        primary: { id: 'close-out', label: 'Close out' },
        secondary: { id: 'retry-later', label: 'Retry in 60d' },
      };
    case 'interested':
      return {
        label: 'Move them forward',
        kind: 'human',
        primary: { id: 'schedule-call', label: 'Schedule a call' },
        secondary: { id: 'hand-off', label: 'Hand off' },
      };
    case 'maybe-later':
      return {
        label: 'Keep the thread warm',
        kind: 'human',
        primary: { id: 'reply', label: 'Send a reply' },
        secondary: { id: 'snooze', label: 'Snooze 30d' },
      };
    case 'reschedule-requested': {
      const to = r.meeting?.booked?.theirs;
      return {
        label: to ? `They moved it to ${to}` : 'They asked to move the call',
        kind: 'human',
        primary: { id: 'confirm-new-time', label: 'Confirm the new time' },
        secondary: { id: 'reschedule', label: 'Propose other times' },
      };
    }
    case 'call-done':
      return {
        label: 'Decide whether they go forward',
        kind: 'human',
        primary: { id: 'hand-off', label: 'Hand off' },
        secondary: { id: 'not-a-fit', label: 'Not a fit' },
      };

    // — waiting on a clock or the candidate —
    case 'scheduled':
      return {
        label: `Sends ${wait(r.nextAt)}, candidate local`,
        kind: 'waiting',
        secondary: { id: 'send-now', label: 'Send now' },
      };
    case 'sent':
      return {
        label: r.step >= r.totalSteps
          ? 'Last step sent, waiting for a reply'
          : `Step ${r.step + 1} of ${r.totalSteps} sends ${wait(r.nextAt)}`,
        kind: 'waiting',
      };
    case 'send-limit':
      return {
        label: `${sender?.name ?? 'Sender'} hit its weekly cap, resumes Mon 09:00`,
        kind: 'waiting',
        secondary: { id: 'add-sender', label: 'Add a sender' },
      };
    case 'times-proposed': {
      const n = r.meeting?.proposed?.length ?? 0;
      return {
        label: `${n} time${n === 1 ? '' : 's'} sent, waiting on them to pick`,
        kind: 'waiting',
        secondary: { id: 'nudge', label: 'Nudge' },
      };
    }
    case 'call-booked': {
      const b = r.meeting?.booked;
      return {
        // Their clock only — the detail pane carries both, and this column is tight.
        label: b ? b.theirs : 'Call is booked',
        kind: 'waiting',
        secondary: { id: 'reschedule', label: 'Reschedule' },
      };
    }

    // — blocked —
    case 'no-route':
      return {
        label: 'No address on file',
        kind: 'human',
        primary: { id: 'use-linkedin', label: 'Use LinkedIn only' },
        secondary: { id: 'find-address', label: 'Find an address' },
      };
    case 'bounced':
      return {
        label: 'The address is dead',
        kind: 'human',
        primary: { id: 'find-address', label: 'Find another address' },
        secondary: { id: 'switch-channel', label: 'Switch to LinkedIn' },
      };
    case 'sender-disconnected':
      return {
        label: `${sender?.handle ?? 'The sender'} needs reconnecting`,
        kind: 'human',
        primary: { id: 'reconnect', label: sender?.channel === 'linkedin' ? 'Reconnect LinkedIn' : 'Reconnect Gmail' },
      };
    case 'send-failed':
      return {
        label: 'Gave up after 3 attempts',
        kind: 'human',
        primary: { id: 'retry', label: 'Retry' },
        secondary: { id: 'switch-channel', label: 'Switch channel' },
      };
    case 'already-contacted':
      return {
        label: 'Active in another search',
        kind: 'human',
        primary: { id: 'view-other-search', label: 'See the other search' },
        secondary: { id: 'contact-anyway', label: 'Contact anyway' },
      };
    case 'calendar-disconnected':
      return {
        label: 'No invite can be sent until the calendar is reconnected',
        kind: 'human',
        primary: { id: 'reconnect-calendar', label: 'Reconnect Google Calendar' },
      };

    // — terminal —
    case 'handed-off':
      return { label: 'In the hiring process', kind: 'none' };
    case 'not-interested':
      return { label: 'Closed', kind: 'none', secondary: { id: 'suppress', label: 'Add to do-not-contact' } };
    case 'cancelled':
      return { label: 'Stopped by you', kind: 'none', secondary: { id: 'restart', label: 'Restart outreach' } };
    case 'do-not-contact':
      return { label: 'Blocked everywhere', kind: 'none' };
  }
}

export function needsYou(r: OutreachRecord, sender?: Sender): boolean {
  return nextAction(r, sender).kind === 'human';
}

/* -------------------------------------------------------------------------- */
/*  Transitions                                                               */
/* -------------------------------------------------------------------------- */

/** Any inbound halts the sequence. Stated once here, honoured everywhere. */
export function isInbound(s: OutreachState): boolean {
  return s === 'replied' || s === 'interested' || s === 'maybe-later' || s === 'not-interested'
    || s === 'times-proposed' || s === 'call-booked' || s === 'reschedule-requested' || s === 'call-done';
}

/** Remaining steps are cancelled rather than pending once a reply lands. */
export function isHalted(r: OutreachRecord): boolean {
  return isInbound(r.state) || STATES[r.state].kind === 'terminal';
}

const OUTCOME_STATE: Record<Outcome, OutreachState> = {
  interested: 'interested',
  'maybe-later': 'maybe-later',
  'not-interested': 'not-interested',
};

export interface TransitionResult {
  record: OutreachRecord;
  /** Short past-tense line for the toast. Carries the Undo, nothing else. */
  said: string;
  undoable: boolean;
}

/**
 * Applying an action is the only way a record changes. Returns the new record
 * plus what to say about it — so a state change is never reported by a toast
 * alone; the row and the pane change too.
 */
export function applyAction(
  r: OutreachRecord,
  id: ActionId,
  opts: { outcome?: Outcome; now?: string; meeting?: NonNullable<OutreachRecord['meeting']> } = {},
): TransitionResult {
  const now = opts.now ?? 'just now';
  const base = { ...r, lastActivity: now, isNew: false };

  switch (id) {
    case 'review-and-send':
    case 'send-now': {
      // The draft becomes a real sent message; the step counter moves.
      const step = r.step + 1;
      const messages = r.messages.map((m) =>
        m.draft ? { ...m, draft: false, at: now } : m);
      const finished = step >= r.totalSteps;
      return {
        record: {
          ...base,
          state: finished ? 'sequence-finished' : 'sent',
          step,
          messages,
          nextAt: finished ? null : 72,
        },
        said: 'Sent.',
        undoable: false,
      };
    }

    case 'read-and-classify': {
      if (!opts.outcome) return { record: base, said: '', undoable: false };
      const state = OUTCOME_STATE[opts.outcome];
      return {
        record: { ...base, state, proposedRead: undefined, nextAt: null },
        said: `Marked ${STATES[state].label.toLowerCase()}.`,
        undoable: true,
      };
    }

    // 'schedule-call' opens the scheduling panel; it is not a transition.
    case 'schedule-call':
      return { record: base, said: '', undoable: false };
    case 'hand-off':
      return { record: { ...base, state: 'handed-off' }, said: 'Handed off to the hiring process.', undoable: true };

    case 'close-out':
      return { record: { ...base, state: 'cancelled', nextAt: null }, said: 'Closed out.', undoable: true };
    case 'retry-later':
      return { record: { ...base, state: 'scheduled', nextAt: 1440 }, said: 'Queued to retry in 60 days.', undoable: true };

    case 'reply':
      return { record: { ...base, state: 'sent', nextAt: 96 }, said: 'Reply sent.', undoable: false };
    case 'snooze':
      return { record: { ...base, state: 'scheduled', nextAt: 720 }, said: 'Snoozed for 30 days.', undoable: true };

    case 'use-linkedin':
    case 'switch-channel':
      return {
        record: { ...base, state: 'scheduled', nextAt: 14 },
        said: 'Switched to LinkedIn.',
        undoable: true,
      };
    case 'find-address':
      return { record: { ...base, state: 'scheduled', nextAt: 2 }, said: 'Address found and verified.', undoable: true };
    case 'skip':
      return { record: { ...base, state: 'cancelled', nextAt: null }, said: 'Skipped.', undoable: true };

    case 'retry':
      return { record: { ...base, state: 'scheduled', nextAt: 1 }, said: 'Retrying.', undoable: true };
    case 'reconnect':
      return { record: { ...base, state: 'scheduled', nextAt: 1 }, said: 'Reconnected.', undoable: false };
    case 'contact-anyway':
      return { record: { ...base, state: 'draft-ready' }, said: 'Draft prepared.', undoable: true };
    case 'restart':
      return { record: { ...base, state: 'draft-ready', step: 0 }, said: 'Outreach restarted.', undoable: true };
    case 'suppress':
      return { record: { ...base, state: 'do-not-contact' }, said: 'Added to the do-not-contact list.', undoable: true };

    case 'send-invite': {
      const m = opts.meeting;
      if (!m) return { record: base, said: '', undoable: false };
      const booking = !!m.booked;
      return {
        record: {
          ...base,
          state: booking ? 'call-booked' : 'times-proposed',
          meeting: { ...m, lastChangedBy: 'you' },
          nextAt: booking ? null : 48,
        },
        said: booking ? 'Invite sent. The call is on both calendars.' : 'Times sent.',
        undoable: true,
      };
    }

    case 'nudge':
      return { record: { ...base, nextAt: 48 }, said: 'Nudge sent.', undoable: false };

    case 'confirm-new-time':
      return {
        record: {
          ...base,
          state: 'call-booked',
          // movedBy is history — confirming must not erase who asked for the change.
          meeting: r.meeting
            ? { ...r.meeting, lastChangedBy: 'you', movedBy: r.meeting.movedBy ?? 'candidate', confirmed: true, changeNote: undefined }
            : undefined,
        },
        said: 'New time confirmed.',
        undoable: true,
      };

    case 'decline-new-time':
    case 'reschedule':
      // Back to the panel — the record itself does not move until times are sent.
      return { record: base, said: '', undoable: false };

    case 'cancel-call':
      return {
        record: { ...base, state: 'interested', meeting: undefined, nextAt: null },
        said: 'Call cancelled.',
        undoable: true,
      };

    case 'mark-call-done':
      return { record: { ...base, state: 'call-done', nextAt: null }, said: 'Marked as done.', undoable: true };

    case 'not-a-fit':
      return { record: { ...base, state: 'not-interested', nextAt: null }, said: 'Marked not a fit.', undoable: true };

    case 'reconnect-calendar':
      return { record: { ...base, state: 'interested' }, said: 'Calendar reconnected.', undoable: false };

    case 'join-call':
    case 'add-sender':
    case 'view-other-search':
      return { record: base, said: '', undoable: false };
  }
}

/* -------------------------------------------------------------------------- */
/*  Stat strip                                                                */
/* -------------------------------------------------------------------------- */

export const STAT_GROUPS: { id: string; label: string; states: OutreachState[] }[] = [
  { id: 'needs-you', label: 'Needs you', states: ['draft-ready', 'replied', 'sequence-finished', 'interested', 'maybe-later', 'reschedule-requested', 'call-done'] },
  { id: 'in-flight', label: 'In flight', states: ['scheduled', 'sent', 'send-limit'] },
  { id: 'scheduling', label: 'Scheduling', states: ['times-proposed', 'call-booked'] },
  { id: 'blocked', label: 'Blocked', states: ['no-route', 'bounced', 'sender-disconnected', 'send-failed', 'already-contacted', 'calendar-disconnected'] },
  { id: 'closed', label: 'Closed', states: ['handed-off', 'not-interested', 'cancelled', 'do-not-contact'] },
];

export const CHANNEL_LABEL: Record<Channel, string> = { email: 'Email', linkedin: 'LinkedIn' };
