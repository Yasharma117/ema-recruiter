import type { OutreachRecord, Slot } from '../lib/types';
import type { AvailabilityHint } from './availability';

/**
 * What each candidate actually wrote about their availability, parsed into
 * something checkable. Ema quotes this back rather than asserting a match.
 */
export const AVAILABILITY_HINTS: Record<string, AvailabilityHint> = {
  c_tobias: {
    quote: 'Next week works, I\'m free Tuesday or Thursday afternoon CET',
    days: ['Tue', 'Thu'],
    fromHour: 12,
    toHour: 18,
  },
  c_sofia: {
    quote: 'anything after 11am your time works',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    fromHour: 15,
    toHour: 22,
  },
};

const slot = (id: string, yours: string, theirs: string, outsideCoreHours = false): Slot =>
  ({ id, startsAt: id, yours, theirs, outsideCoreHours });

/* Seeded so the board opens mid-flight: work waiting on the hiring manager,
   work in flight, and the blocked states that make the model real. */

const intro = (first: string) =>
  `Hi ${first} — I'm hiring a Staff ML Engineer for the payments risk team at Northwind.\n\n` +
  `I came across your work on real-time inference and it lines up closely with what this team owns: ` +
  `the scoring path behind our lending decisions, currently about 18k requests a second under model ` +
  `governance.\n\nWould you be open to a short call in the next week or two?\n\nSarah`;

export const OUTREACH: OutreachRecord[] = [
  // Replied, and the outreach carried a question about an unknown cell.
  {
    candidateId: 'c_tobias',
    state: 'replied',
    step: 2,
    totalSteps: 4,
    senderId: 'snd_li',
    lastActivity: '40m ago',
    nextAt: null,
    asks: ['c_leadership'],
    proposedRead: {
      outcome: 'interested',
      because: 'Says the timing is good and offers to talk next week.',
      resolves: [{
        criterionId: 'c_leadership',
        score: 4,
        quote: 'I lead a team of six on the underwriting side',
      }],
    },
    messages: [
      { channel: 'linkedin', direction: 'out', body: 'Connection request sent with a short note about the payments risk role.', at: '10 Mar, 09:14' },
      {
        channel: 'linkedin', direction: 'out',
        body: `Hi Tobias — I'm hiring a Staff ML Engineer for payments risk at Northwind. Your BNPL underwriting work at Klarna is close to what this team owns.\n\nOne thing I couldn't tell from your profile: how much of your work there has been leading others versus hands-on modelling?\n\nWould you be open to a short call?\n\nSarah`,
        at: '13 Mar, 09:30',
        asks: ['c_leadership'],
      },
      {
        channel: 'linkedin', direction: 'in',
        body: "Hi Sarah — good timing, I've been starting to look. To your question: I lead a team of six on the underwriting side, so it's about half and half these days. Still write the scoring code myself.\n\nNext week works, I'm free Tuesday or Thursday afternoon CET.",
        at: '16 Mar, 08:22',
      },
    ],
    note: 'Sequence stopped — Tobias replied on 16 Mar. 2 remaining steps cancelled.',
  },

  // Replied, no question attached — classification only.
  {
    candidateId: 'c_kavya',
    state: 'replied',
    step: 2,
    totalSteps: 4,
    senderId: 'snd_gmail',
    lastActivity: '2h ago',
    nextAt: null,
    proposedRead: {
      outcome: 'maybe-later',
      because: 'Not looking right now, but asked to stay in touch rather than declining.',
    },
    messages: [
      { channel: 'linkedin', direction: 'out', body: 'Connection request sent.', at: '9 Mar, 09:14' },
      { channel: 'email', direction: 'out', subject: 'Staff ML Engineer — payments risk at Northwind', body: intro('Kavya'), at: '12 Mar, 09:02', opened: true },
      {
        channel: 'email', direction: 'in',
        body: "Hi Sarah — thanks for reaching out. I'm happy where I am and not looking to move this year, but the governance side of what you're describing is genuinely interesting. Worth staying in touch — ping me again in a few months?",
        at: '16 Mar, 07:41',
      },
    ],
    note: 'Sequence stopped — Kavya replied on 16 Mar. 2 remaining steps cancelled.',
  },

  // First draft awaiting approval.
  {
    candidateId: 'c_marcus',
    state: 'draft-ready',
    step: 0,
    totalSteps: 4,
    senderId: 'snd_li',
    lastActivity: 'Drafted 20m ago',
    nextAt: null,
    messages: [
      {
        channel: 'linkedin', direction: 'out', draft: true,
        body: "Hi Marcus — I'm hiring a Staff ML Engineer for payments risk at Northwind. The model governance process you built out at Block is close to what this team is standing up, and the role owns the scoring path end to end.\n\nOpen to a short conversation?\n\nSarah",
        at: 'Draft',
      },
    ],
  },

  // Draft that carries a question about an unknown cell.
  {
    candidateId: 'c_sofia',
    state: 'draft-ready',
    step: 0,
    totalSteps: 4,
    senderId: 'snd_gmail',
    lastActivity: 'Drafted 1h ago',
    nextAt: null,
    asks: ['c_leadership'],
    messages: [
      {
        channel: 'email', direction: 'out', draft: true,
        subject: 'Staff ML Engineer — payments risk at Northwind',
        body: "Hi Sofia — I'm hiring a Staff ML Engineer for the payments risk team at Northwind. Your real-time fraud scoring work at Nubank is close to what this team owns.\n\nOne thing I couldn't tell from your profile: have you led or mentored engineers alongside the modelling work?\n\nWould you be open to a short call?\n\nSarah",
        at: 'Draft',
        asks: ['c_leadership'],
      },
    ],
  },

  // In flight.
  {
    candidateId: 'c_amara',
    state: 'reschedule-requested',
    step: 3,
    totalSteps: 4,
    senderId: 'snd_gmail',
    lastActivity: '25m ago',
    nextAt: null,
    isNew: true,
    meeting: {
      durationMins: 30,
      previous: slot('s_am_0', 'Thu 19 Mar · 11:00', 'Thu 19 Mar · 13:00'),
      booked: slot('s_am_1', 'Fri 20 Mar · 08:00', 'Fri 20 Mar · 10:00', true),
      joinUrl: 'meet.google.com/qvd-mkzr-ahs',
      lastChangedBy: 'candidate',
      movedBy: 'candidate',
      changeNote: 'Moved from Google Calendar · “Conflict came up, Friday morning is easier.”',
    },
    messages: [
      { channel: 'linkedin', direction: 'out', body: 'Connection request sent.', at: '8 Mar, 10:20' },
      { channel: 'linkedin', direction: 'out', body: 'Followed up on LinkedIn with role detail.', at: '11 Mar, 09:30' },
      { channel: 'email', direction: 'out', subject: 'Staff ML Engineer — payments risk at Northwind', body: intro('Amara'), at: '15 Mar, 09:05', opened: true },
    ],
  },
  {
    candidateId: 'c_elena',
    state: 'call-booked',
    step: 2,
    totalSteps: 4,
    senderId: 'snd_li',
    lastActivity: '2d ago',
    nextAt: null,
    meeting: {
      durationMins: 30,
      booked: slot('s_el_1', 'Wed 25 Mar · 09:30', 'Wed 25 Mar · 10:30'),
      joinUrl: 'meet.google.com/qvd-mkzr-ahs',
      lastChangedBy: 'candidate',
    },
    messages: [
      { channel: 'linkedin', direction: 'out', body: 'Connection request sent with a short note.', at: '13 Mar, 11:02' },
      { channel: 'email', direction: 'out', subject: 'Staff ML Engineer — payments risk at Northwind', body: intro('Elena'), at: '15 Mar, 09:00', opened: true },
      { channel: 'email', direction: 'in', body: "Happy to chat. I grabbed the Wednesday morning slot from the options you sent.", at: '15 Mar, 16:40' },
    ],
  },
  {
    candidateId: 'c_priya',
    state: 'scheduled',
    step: 0,
    totalSteps: 4,
    senderId: 'snd_li',
    lastActivity: 'Queued 1h ago',
    nextAt: 14,
    messages: [],
  },

  // All four steps out, nothing back — the most common outcome in sourcing.
  {
    candidateId: 'c_yuki',
    state: 'sequence-finished',
    step: 4,
    totalSteps: 4,
    senderId: 'snd_li',
    lastActivity: '6d ago',
    nextAt: null,
    messages: [
      { channel: 'linkedin', direction: 'out', body: 'Connection request sent.', at: '24 Feb, 09:10' },
      { channel: 'email', direction: 'out', subject: 'Staff ML Engineer — payments risk at Northwind', body: intro('Yuki'), at: '27 Feb, 09:00', opened: true },
      { channel: 'linkedin', direction: 'out', body: 'Followed up on LinkedIn.', at: '3 Mar, 09:20' },
      { channel: 'email', direction: 'out', subject: 'Re: Staff ML Engineer — payments risk', body: 'Hi Yuki — last note from me on this. If the timing is wrong, no problem at all; happy to keep in touch for later.\n\nSarah', at: '10 Mar, 09:00' },
    ],
  },

  // Blocked.
  {
    candidateId: 'c_omar',
    state: 'bounced',
    step: 2,
    totalSteps: 4,
    senderId: 'snd_gmail',
    lastActivity: '6h ago',
    nextAt: null,
    messages: [
      { channel: 'linkedin', direction: 'out', body: 'Connection request sent.', at: '11 Mar, 14:00' },
      { channel: 'email', direction: 'out', subject: 'Staff ML Engineer — payments risk at Northwind', body: intro('Omar'), at: '16 Mar, 09:00' },
    ],
    note: 'Hard bounce — omar.haddad@hey.com is not accepting mail.',
  },
];
