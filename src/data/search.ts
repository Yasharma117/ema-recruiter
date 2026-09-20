import type { Criterion, SequenceStep, Sender } from '../lib/types';

export const SEARCH = {
  id: 'srch_01',
  name: 'Staff ML Engineer — Payments Risk',
  team: 'Risk Platform',
  location: 'San Francisco / Remote (US)',
  createdBy: 'Sarah Chen',
  /** What the hiring manager typed. Everything below was parsed from it. */
  brief:
    "Staff-level ML engineer for our payments risk team. Needs to have run LLM or " +
    "large model inference in production at real scale — not notebooks. 7+ years. " +
    "Fintech or another regulated domain is a big plus because they'll be working " +
    "under model governance. Bay Area or US remote. Not looking for pure researchers.",
  profilesScanned: 8412,
  profilesScored: 847,
  matched: 112,
};

/**
 * Where each filter and criterion came from in the brief — the exact words, so
 * the configuring act can light them up as Ema writes the thing they produced.
 *
 * An id that is absent has no anchor in the text: Python, technical leadership
 * and open-source work are Ema's inference from "ML engineer" and "Staff-level",
 * not something the hiring manager wrote. Same convention as candidate
 * evidence, where `inferred` is the kind with no quote — the absence is the
 * point, and the UI says so rather than implying a source that is not there.
 */
export const BRIEF_SOURCE: Record<string, string> = {
  // filters
  f1: 'ML engineer',
  f2: 'Staff-level',
  f3: 'Bay Area',
  f4: 'US remote',
  f5: '7+ years',
  f6: 'payments risk team',
  f7: 'another regulated domain',
  f8: 'run LLM or large model inference in production at real scale',
  f10: 'Not looking for pure researchers',
  // scorecard criteria
  c_serving: 'inference in production at real scale',
  c_seniority: 'Staff-level ML engineer',
  c_regulated: 'Fintech or another regulated domain',
  c_risk: 'payments risk team',
};

/**
 * Parsed from the brief by Ema, then editable. Filters narrow the pool;
 * the scorecard ranks whoever survives.
 */
export type FilterMode = 'must' | 'preferred' | 'exclude';

export interface FilterChip {
  id: string;
  category: string;
  value: string;
  mode: FilterMode;
  /** Still carries a MagicWand until the recruiter confirms it. */
  suggested?: boolean;
  /** Pool remaining after this filter is applied — drives the funnel. */
  poolAfter?: number;
}

export const FILTERS: FilterChip[] = [
  { id: 'f1', category: 'Jobs', value: 'Machine Learning Engineer', mode: 'must', poolAfter: 4820 },
  { id: 'f2', category: 'Jobs', value: 'Staff / Principal level', mode: 'must', suggested: true, poolAfter: 3140 },
  { id: 'f3', category: 'Location', value: 'San Francisco Bay Area', mode: 'preferred' },
  { id: 'f4', category: 'Location', value: 'United States (remote)', mode: 'preferred' },
  { id: 'f5', category: 'Experience', value: '7+ years', mode: 'must', suggested: true, poolAfter: 2410 },
  { id: 'f6', category: 'Industry', value: 'Fintech / Payments', mode: 'preferred', suggested: true },
  { id: 'f7', category: 'Industry', value: 'Regulated (health, insurance)', mode: 'preferred', suggested: true },
  { id: 'f8', category: 'Skills', value: 'LLM inference / model serving', mode: 'must', suggested: true, poolAfter: 1180 },
  { id: 'f9', category: 'Skills', value: 'Python', mode: 'preferred' },
  { id: 'f10', category: 'Company', value: 'Academic labs only', mode: 'exclude', suggested: true },
];

export const FILTER_CATEGORIES = [
  'Jobs', 'Location', 'Company', 'Industry', 'Experience', 'Education', 'Languages', 'Skills',
];

/**
 * Six criteria. Required weight 3, preferred 2 by default — a recruiter who
 * never touches a weight still gets a sensible required-dominant ranking.
 */
export const CRITERIA: Criterion[] = [
  {
    id: 'c_serving',
    name: 'Production model serving at scale',
    bar: 'Owned inference infrastructure serving >10k req/s',
    type: 'required',
    weight: 3,
  },
  {
    id: 'c_seniority',
    name: '7+ years, staff-level scope',
    bar: 'Staff or principal title with cross-team technical ownership',
    type: 'required',
    weight: 3,
  },
  {
    id: 'c_regulated',
    name: 'Fintech or regulated domain',
    bar: '3+ years under model governance, audit or compliance constraints',
    type: 'preferred',
    weight: 2,
  },
  {
    id: 'c_leadership',
    name: 'Technical leadership',
    bar: 'Led a team of 5+ or drove org-wide technical direction',
    type: 'preferred',
    weight: 2,
  },
  {
    id: 'c_oss',
    name: 'Open-source or published work',
    bar: 'Maintains a widely used repo, or first-author at a top venue',
    type: 'preferred',
    weight: 1,
  },
  {
    id: 'c_risk',
    name: 'Risk or fraud modelling',
    bar: 'Shipped fraud, credit or abuse models in production',
    type: 'preferred',
    weight: 2,
  },
];

/**
 * Every step carries its message. Approving step 1 while steps 2–4 stay
 * invisible means three messages go out in your name that you never read.
 * `{first}` is the candidate's preferred name — Ema never infers pronouns.
 */
export const SEQUENCE: SequenceStep[] = [
  {
    n: 1, channel: 'linkedin', label: 'LinkedIn connection request', delayDays: 0,
    subject: undefined,
    template:
      `Hi {first} — I'm hiring a Staff ML Engineer for payments risk at Northwind. ` +
      `Your work on real-time inference lines up closely with what this team owns. ` +
      `Open to a short conversation?\n\nSarah`,
  },
  {
    n: 2, channel: 'email', label: 'Intro email', delayDays: 3,
    subject: 'Staff ML Engineer — payments risk at Northwind',
    template:
      `Hi {first} — following up on my note.\n\n` +
      `The team owns the scoring path behind our lending decisions — about 18k requests a ` +
      `second, under model governance. It's the kind of problem where the infrastructure and ` +
      `the modelling are the same job.\n\n` +
      `Would you be open to a short call in the next week or two?\n\nSarah`,
  },
  {
    n: 3, channel: 'linkedin', label: 'LinkedIn message', delayDays: 4,
    subject: undefined,
    template:
      `Hi {first} — I know inbound like this is easy to ignore, so I'll keep it short.\n\n` +
      `If the timing is wrong I'd still value staying in touch. And if there's someone you'd ` +
      `point me to instead, that's just as helpful.\n\nSarah`,
  },
  {
    n: 4, channel: 'email', label: 'Close-out email', delayDays: 5,
    subject: 'Re: Staff ML Engineer — payments risk',
    template:
      `Hi {first} — last note from me on this, I don't want to keep landing in your inbox.\n\n` +
      `If the timing changes, my door is open. Best of luck either way.\n\nSarah`,
  },
];

export const SENDERS: Sender[] = [
  {
    id: 'snd_gmail', name: 'Sarah Chen', handle: 'sarah@northwind.com',
    channel: 'email', connected: true, usedToday: 12, dailyCap: 50, periodLabel: 'today',
  },
  {
    id: 'snd_li', name: 'Sarah Chen', handle: 'linkedin.com/in/sarahchen',
    channel: 'linkedin', connected: true, usedToday: 18, dailyCap: 20, periodLabel: 'this week',
  },
  {
    id: 'snd_gmail2', name: 'Daniel Okafor', handle: 'daniel@northwind.com',
    channel: 'email', connected: false, usedToday: 0, dailyCap: 50, periodLabel: 'today',
  },
];

/** Human-in-the-loop throttle. Ema contacts at most this many new people per day. */
export const DAILY_CANDIDATE_LIMIT = 10;
