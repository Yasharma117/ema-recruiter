import type { CalendarAccount, Slot } from '../lib/types';

/**
 * Deterministic availability so screenshots reproduce. Slots are the
 * recruiter's working hours; every slot also carries the candidate's wall
 * clock, because "Tuesday afternoon" for someone in Stockholm is before
 * breakfast in San Francisco and the recruiter needs to see that before
 * they send it.
 */

export const CALENDAR: CalendarAccount = {
  id: 'cal_google',
  name: 'Sarah Chen',
  handle: 'sarah@northwind.com',
  provider: 'google',
  connected: true,
  timezone: 'PDT',
  workingHours: '07:00–18:00',
};

/** Hours to add to the recruiter's clock to get the candidate's. */
const TZ_OFFSET: Record<string, number> = {
  PDT: 0, PST: 0, MDT: 1, CDT: 2, EDT: 3, EST: 3,
  GMT: 7, BST: 8, CET: 9, CEST: 9, IST: 12.5, BRT: 4, SGT: 15,
};

export function offsetFor(candidateTz: string): number {
  return TZ_OFFSET[candidateTz] ?? 0;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const DAY_START = 7;   // first bookable hour, recruiter local
const DAY_END = 18;    // last bookable hour, exclusive
const CORE_START = 9;  // outside this, the slot is flagged as early/late for you
const CORE_END = 17;
// A slot has to be inside the candidate's day too. Offering someone 02:30
// their time is not an option, it is noise — so it is never generated.
const THEIR_START = 8;
const THEIR_END = 19;

function label(base: Date, dayShift: number, totalMinutes: number): string {
  const d = new Date(base);
  d.setDate(base.getDate() + dayShift);
  const h = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} · ${h}:${m}`;
}

/** Busy blocks, keyed so the same slots are always taken. */
function isBusy(dayIndex: number, halfHour: number): boolean {
  return (dayIndex * 7 + halfHour * 3) % 11 < 3;
}

/**
 * What the candidate actually wrote, parsed into something checkable. Kept as
 * structured data on the fixture so Ema's match is grounded in their words
 * rather than asserted.
 */
export interface AvailabilityHint {
  /** Verbatim, quoted back to the recruiter. */
  quote: string;
  /** Day names the candidate named. */
  days: string[];
  /** Their local hour window. */
  fromHour: number;
  toHour: number;
}

/**
 * Next 10 working days from the demo date, on a 30-minute grid. Each slot
 * carries both wall clocks; a slot outside the recruiter's core hours is
 * surfaced, not filtered, because agreeing to a 07:00 call should be a
 * visible choice.
 */
export function generateSlots(candidateTz: string, hint?: AvailabilityHint): Slot[] {
  const offsetMins = Math.round(offsetFor(candidateTz) * 60);
  const slots: Slot[] = [];
  const start = new Date(2026, 2, 17); // Tue 17 Mar 2026, the demo "today"

  let dayIndex = 0;
  for (let d = 0; d < 20 && dayIndex < 10; d++) {
    const day = new Date(start);
    day.setDate(start.getDate() + d);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue;
    dayIndex++;

    const perDay = (DAY_END - DAY_START) * 2;
    for (let hh = 0; hh < perDay; hh++) {
      const mineMins = DAY_START * 60 + hh * 30;
      const theirMins = mineMins + offsetMins;
      const theirDayShift = Math.floor(theirMins / (24 * 60));
      const theirHour = Math.floor((theirMins % (24 * 60)) / 60);
      const hour = Math.floor(mineMins / 60);

      if (theirHour < THEIR_START || theirHour >= THEIR_END) continue;

      slots.push({
        id: `s_${d}_${hh}`,
        startsAt: `2026-03-${String(day.getDate()).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(mineMins % 60).padStart(2, '0')}`,
        yours: label(day, 0, mineMins),
        theirs: label(day, theirDayShift, theirMins % (24 * 60)),
        busy: isBusy(dayIndex, hh),
        outsideCoreHours: hour < CORE_START || hour >= CORE_END,
        matchesHint: hint
          ? hint.days.includes(DAYS[new Date(day.getTime() + theirDayShift * 864e5).getDay()])
            && theirHour >= hint.fromHour && theirHour < hint.toHour
          : false,
      });
    }
  }
  return slots;
}

/**
 * The hours where both working days actually overlap. With a 9-hour gap this
 * is narrow, and saying so up front is kinder than letting someone discover it
 * by scrolling.
 */
export function overlapWindow(candidateTz: string): string | null {
  const offset = offsetFor(candidateTz);
  const from = Math.max(DAY_START, THEIR_START - offset);
  const to = Math.min(DAY_END, THEIR_END - offset);
  if (to <= from) return null;
  const f = (h: number) => `${String(Math.floor(h)).padStart(2, '0')}:${h % 1 ? '30' : '00'}`;
  return `${f(from)}–${f(to)}`;
}

export function meetingTitle(candidateName: string): string {
  return `Northwind × ${candidateName.split(' ')[0]} — Staff ML Engineer`;
}
