// Domain model. Vocabulary follows Ema Recruiter's documented object model:
// a Search holds Filters, a Scorecard, Candidates and an outreach sequence.

export type CriterionType = 'required' | 'preferred';

export interface Criterion {
  id: string;
  name: string;
  /** What "5" would look like — shown in the scorecard editor and the "why not 5" line. */
  bar: string;
  type: CriterionType;
  /** 1–5, recruiter-set. Defaults: required 3, preferred 2. */
  weight: number;
}

/** How solid the basis for a score is. Never collapsed into a single "confidence %". */
export type Confidence = 'high' | 'medium' | 'low';

export type EvidenceKind = 'work' | 'repo' | 'publication' | 'internal' | 'inferred';

export interface Evidence {
  kind: EvidenceKind;
  /** Bold first line of the card: "Senior Engineer, Payments · Stripe" */
  source: string;
  /** Date range or point, already formatted. */
  when?: string;
  /** Verbatim quote. Absent for `inferred` — that is the whole point. */
  quote?: string;
  meta?: string;
  href?: string;
}

export interface CriterionScore {
  criterionId: string;
  /** 1–5, or null when Ema found no evidence. Null is excluded from the composite. */
  score: number | null;
  confidence: Confidence;
  /** ≤ ~70 chars, shown in the hover tooltip. */
  summary: string;
  /** "4 not 5: 4 years in payments, the scorecard asks for 6+" */
  whyNotFive?: string;
  evidence: Evidence[];
  /** Set when a human corrects the cell, or a reply answers it. */
  override?: { score: number; by: string; at: string; original: number | null; via?: 'reply' | 'manual' };
}

export type CandidateSource = 'public' | 'internal';

export interface Role {
  title: string;
  company: string;
  start: string;
  end: string | null;
  bullet?: string;
}

export type SignalKind =
  | 'stale'
  | 'gate-failed'
  | 'recently-moved'
  | 'previously-rejected'
  | 'duplicate'
  | 'current-employee'
  | 'no-email'
  | 'do-not-contact';

export interface Signal {
  kind: SignalKind;
  label: string;
  detail?: string;
}

export interface Candidate {
  id: string;
  name: string;
  /** Preferred name used in drafts. Ema never infers gender or pronouns. */
  title: string;
  company: string;
  companyTenure: string;
  location: string;
  /** IANA-ish short label used to show a slot in their time as well as yours. */
  timezone: string;
  yearsExperience: number;
  source: CandidateSource;
  /** Present when the same person came from both the ATS and the public index. */
  mergedFrom?: string[];
  profileUpdated: string;
  /** Months since the profile was last updated — drives the stale signal. */
  profileAgeMonths: number;
  email: string | null;
  emailVerified: boolean;
  linkedin: string | null;
  avatarTone: 'green' | 'purple' | 'beige';
  roles: Role[];
  education: string;
  summary: string;
  news: { title: string; source: string; when: string }[];
  scores: CriterionScore[];
  signals: Signal[];
  /** Recruiter lifted the required-gate cap on this candidate. */
  gateOverridden?: boolean;
}

// ---- Outreach ----

/**
 * 13 active states + 4 terminal. Active states are distinguished by what you
 * DO next; terminal states by what they RECORD. Channel and step number are
 * metadata, not states — "LinkedIn sent" and "Email sent" both resolve to
 * "wait", so they are one state wearing two badges.
 */
export type OutreachState =
  // — waiting on you —
  | 'draft-ready'
  | 'replied'
  | 'sequence-finished'
  | 'interested'
  | 'maybe-later'
  | 'reschedule-requested'
  | 'call-done'
  // — waiting on a clock or the candidate —
  | 'scheduled'
  | 'sent'
  | 'send-limit'
  | 'times-proposed'
  | 'call-booked'
  // — blocked: faults, not judgements —
  | 'no-route'
  | 'bounced'
  | 'sender-disconnected'
  | 'send-failed'
  | 'already-contacted'
  | 'calendar-disconnected'
  // — terminal —
  | 'handed-off'
  | 'not-interested'
  | 'cancelled'
  | 'do-not-contact';

export type Channel = 'email' | 'linkedin';

export type Outcome = 'interested' | 'maybe-later' | 'not-interested';

/** One bookable half-hour. `startsAt` is the recruiter's wall clock. */
export interface Slot {
  id: string;
  /** ISO-ish, recruiter local. */
  startsAt: string;
  /** "Tue 24 Mar · 06:00" in the recruiter's zone. */
  yours: string;
  /** "Tue 24 Mar · 15:00" in the candidate's zone. */
  theirs: string;
  busy?: boolean;
  /** Before 09:00 or after 17:00 your time — shown, never hidden. */
  outsideCoreHours?: boolean;
  /** Ema matched this slot to something the candidate actually wrote. */
  matchesHint?: boolean;
}

export interface Meeting {
  durationMins: 30 | 45 | 60;
  /** Sent for them to pick from. */
  proposed?: Slot[];
  /** Confirmed, on both calendars. */
  booked?: Slot;
  /** What it was before a reschedule, so the UI can say what moved. */
  previous?: Slot;
  joinUrl?: string;
  /** Who last touched it. A candidate-side change has to surface differently. */
  lastChangedBy?: 'you' | 'candidate';
  /** Who initiated the move. History, so confirming it does not erase who asked. */
  movedBy?: 'you' | 'candidate';
  /** You accepted a move they made. */
  confirmed?: boolean;
  changeNote?: string;
}

/** Mirrors Sender — a calendar is just another connected account. */
export interface CalendarAccount {
  id: string;
  name: string;
  handle: string;
  provider: 'google';
  connected: boolean;
  timezone: string;
  workingHours: string;
}

export interface SequenceStep {
  n: number;
  channel: Channel;
  label: string;
  delayDays: number;
  subject?: string;
  /** `{first}` is substituted with the candidate's preferred name. */
  template: string;
}

export interface Message {
  channel: Channel;
  direction: 'out' | 'in';
  subject?: string;
  body: string;
  at: string;
  /** Ema wrote it and nobody has approved it yet. */
  draft?: boolean;
  opened?: boolean;
  /** Criterion ids this message asks about — rendered inline in the draft. */
  asks?: string[];
}

/** Ema's reading of a reply. Proposed, never applied. */
export interface ProposedRead {
  outcome: Outcome;
  /** One line saying why it read the reply that way, so you can argue with the reasoning. */
  because: string;
  /** Criteria the reply appears to answer, with the value Ema would write. */
  resolves?: { criterionId: string; score: number; quote: string }[];
}

export interface OutreachRecord {
  candidateId: string;
  state: OutreachState;
  /** Which sequence step has been sent. 0 = nothing sent yet. */
  step: number;
  totalSteps: number;
  senderId: string;
  lastActivity: string;
  /** Hours on the simulated clock until the next automatic transition. */
  nextAt: number | null;
  messages: Message[];
  proposedRead?: ProposedRead;
  meeting?: Meeting;
  /** Per-step message edits. A step with no entry uses the sequence template. */
  stepBodies?: Record<number, string>;
  /** Unknown criteria this outreach is carrying a question about. */
  asks?: string[];
  /** Added to outreach but not yet seen on the outreach screen. Drives the arrival highlight. */
  isNew?: boolean;
  note?: string;
}

export interface Sender {
  id: string;
  name: string;
  handle: string;
  channel: Channel;
  connected: boolean;
  usedToday: number;
  dailyCap: number;
  periodLabel: string;
}

/**
 * A human judgement laid over a machine-scored cell. Kept as a separate layer
 * so it survives a re-run: new results get the overrides reapplied on top,
 * rather than the hiring manager correcting the same fact three times.
 */
export interface CellOverride {
  candidateId: string;
  criterionId: string;
  score: number | null;
  /** Where the correction came from — a reply resolves, a person corrects. */
  via: 'reply' | 'manual';
  by: string;
  at: string;
  quote?: string;
  originalScore: number | null;
}
