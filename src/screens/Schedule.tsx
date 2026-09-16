import React from 'react';
import { X, Sparkle, Sun, VideoCamera, Warning, Check } from '@phosphor-icons/react';
import type { Candidate, Meeting, OutreachRecord, Slot } from '../lib/types';
import { generateSlots, overlapWindow, CALENDAR, meetingTitle, type AvailabilityHint } from '../data/availability';
import { Avatar, Button, IconButton, Modal, cx } from '../components/ui';

/**
 * Placing the call.
 *
 * Two paths from one panel, because both happen: propose a few times when
 * nothing is agreed, or book a specific slot outright when the reply already
 * named one. Ema pre-selects slots that match what the candidate actually
 * wrote — quoted, so the match is checkable rather than asserted.
 *
 * Every slot carries both wall clocks. A Stockholm afternoon is before
 * breakfast in San Francisco, and agreeing to that should be a visible choice,
 * so out-of-hours slots are flagged rather than hidden.
 */

const DURATIONS = [30, 45, 60] as const;

export function SchedulePanel({
  open, onClose, record, candidate, hint, calendarConnected, onSend,
}: {
  open: boolean;
  onClose: () => void;
  record: OutreachRecord;
  candidate: Candidate;
  hint?: AvailabilityHint;
  calendarConnected: boolean;
  onSend: (meeting: Meeting) => void;
}) {
  const [duration, setDuration] = React.useState<30 | 45 | 60>(30);
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const [mode, setMode] = React.useState<'propose' | 'book'>('propose');

  const slots = React.useMemo(
    () => generateSlots(candidate.timezone, hint),
    [candidate.timezone, hint],
  );
  const free = slots.filter((s) => !s.busy);
  const overlap = overlapWindow(candidate.timezone);
  // When every slot is outside core hours the per-row flag carries no
  // information — the header line says it once instead.
  const allOutside = free.length > 0 && free.every((s) => s.outsideCoreHours);
  const matched = free.filter((s) => s.matchesHint);

  // Ema's pre-selection: the first three free slots that match their words.
  React.useEffect(() => {
    if (!open) return;
    const seed = (matched.length ? matched : free).slice(0, 3).map((s) => s.id);
    setPicked(new Set(seed));
    setMode('propose');
  }, [open]);

  if (!open) return null;

  const rescheduling = !!record.meeting?.booked;
  const pickedSlots = slots.filter((s) => picked.has(s.id));
  const bookTarget = pickedSlots[0];

  const toggle = (s: Slot) =>
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(s.id)) n.delete(s.id);
      else {
        if (mode === 'book') n.clear();
        n.add(s.id);
      }
      return n;
    });

  const send = () => {
    if (!pickedSlots.length) return;
    onSend({
      durationMins: duration,
      ...(mode === 'book'
        ? { booked: bookTarget }
        : { proposed: pickedSlots }),
      previous: record.meeting?.booked,
      joinUrl: 'meet.google.com/qvd-mkzr-ahs',
      lastChangedBy: 'you',
    });
  };

  // Group by day so the list reads like a week, not a flat dump.
  const days: { label: string; slots: Slot[] }[] = [];
  for (const s of free) {
    const d = s.yours.split(' · ')[0];
    const last = days[days.length - 1];
    if (last && last.label === d) last.slots.push(s);
    else days.push({ label: d, slots: [s] });
  }
  const visible = days.slice(0, 5);

  return (
    <Modal label="Schedule a call" open={open} onClose={onClose} width={640} className="max-h-[92vh]">
      <div className="flex items-start gap-3 px-5 pt-4 pb-3 shrink-0">
        <Avatar name={candidate.name} size={32} tone={candidate.avatarTone} />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-[var(--fg1)]">
            {rescheduling ? 'Move the call' : 'Schedule a call'}
          </h2>
          <p className="text-sm text-[var(--fg2)]">
            {candidate.name} · {candidate.location} ({candidate.timezone})
          </p>
        </div>
        <IconButton icon={<X size={16} />} onClick={onClose} title="Close" />
      </div>

      {!calendarConnected && (
        <div className="mx-5 mb-3 flex items-start gap-2 px-3 py-2.5 rounded-md border border-[var(--error-border)] bg-[var(--error-bg-subtle)] text-sm text-[var(--error-text)]">
          <Warning size={15} weight="bold" className="mt-px shrink-0" />
          <span>
            <span className="font-medium">Google Calendar is disconnected.</span>{' '}
            You can pick times, but no invite will send until it is reconnected.
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {/* Ema's read of what they actually said. */}
        {hint && (
          <div className="rounded-lg border border-[var(--ai-magic-border)] bg-[var(--ai-magic-bg-subtle)] p-3 mb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkle size={13} weight="fill" className="text-[var(--ai-magic-text)]" />
              <span className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--ai-magic-text)]">
                Matched to what they said
              </span>
            </div>
            <div className="text-sm text-[var(--fg1)] leading-[20px]">
              {candidate.name.split(' ')[0]} wrote “{hint.quote}”.
              {matched.length > 0
                ? <> {matched.length} of your free slots fall in that window — the first three are selected.</>
                : <> None of your free slots fall in that window, so these are your next openings instead.</>}
            </div>
          </div>
        )}

        {/* Duration */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)]">Length</span>
          <div className="inline-flex items-center gap-0.5 p-0.5 bg-[var(--beige-100)] border border-[var(--beige-300)] rounded-sm">
            {DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={cx(
                  'h-7 px-3 rounded-xs text-xs font-medium cursor-pointer transition-all duration-150',
                  duration === d
                    ? 'bg-white text-[var(--fg1)] border border-[var(--beige-300)] shadow-[var(--shadow-xs)]'
                    : 'text-[var(--fg2)] border border-transparent hover:text-[var(--fg1)]',
                )}
              >
                {d} min
              </button>
            ))}
          </div>
          <span className="ml-auto text-xs text-[var(--fg3)]">
            {overlap
              ? <>Your days overlap {overlap} {CALENDAR.timezone}</>
              : <>Your hours {CALENDAR.workingHours} {CALENDAR.timezone}</>}
          </span>
        </div>

        {/* Slots */}
        <div className="space-y-3">
          {visible.map((day) => (
            <div key={day.label}>
              <div className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)] mb-1.5">
                {day.label}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {day.slots.map((s) => {
                  const on = picked.has(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => toggle(s)}
                      className={cx(
                        'flex items-center gap-2 px-2.5 py-2 rounded-md border text-left cursor-pointer transition-colors duration-150',
                        on
                          ? 'bg-[var(--success-bg-subtle)] border-[var(--brand-primary)]'
                          : 'bg-white border-[var(--beige-500)] hover:border-[var(--focus-border)]',
                      )}
                    >
                      <span className={cx(
                        'size-3.5 shrink-0 flex items-center justify-center border',
                        mode === 'book' ? 'rounded-full' : 'rounded-xs',
                        on ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-[var(--brand-primary-foreground)]' : 'border-[var(--beige-600)]',
                      )}>
                        {on && <Check size={9} weight="bold" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        {/* Their clock first — it is what they told you. */}
                        <span className="block text-sm text-[var(--fg1)] truncate">
                          {s.theirs.split(' · ')[1]} <span className="text-[var(--fg3)]">{candidate.timezone}</span>
                        </span>
                        <span className="block text-xs text-[var(--fg3)] truncate">
                          {s.yours.split(' · ')[1]} {CALENDAR.timezone}
                        </span>
                      </span>
                      {s.matchesHint && (
                        <Sparkle size={11} weight="fill" className="text-[var(--ai-magic-text)] shrink-0" />
                      )}
                      {s.outsideCoreHours && !allOutside && (
                        <span title="Outside your core hours" className="shrink-0">
                          <Sun size={12} className="text-[var(--warning-text)]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {(allOutside || pickedSlots.some((s) => s.outsideCoreHours)) && (
          <div className="flex items-start gap-2 mt-3 px-3 py-2 rounded-md border border-[var(--warning-border)] bg-[var(--warning-bg-subtle)] text-xs text-[var(--warning-text)]">
            <Sun size={13} className="mt-px shrink-0" />
            <span>
              {allOutside
                ? <>Every slot that works for {candidate.name.split(' ')[0]} is before your usual {CALENDAR.workingHours.split('–')[0]}. Their afternoon is your early morning.</>
                : <>Some of these are outside your {CALENDAR.workingHours} hours.</>}
            </span>
          </div>
        )}

        {/* Invite preview */}
        <div className="mt-4 rounded-lg border border-[var(--beige-400)] bg-[var(--beige-50)] p-3">
          <div className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)] mb-2">Invite</div>
          <div className="text-sm font-medium text-[var(--fg1)]">{meetingTitle(candidate.name)}</div>
          <div className="text-xs text-[var(--fg2)] mt-1">
            {duration} min · {CALENDAR.handle} and {candidate.email ?? candidate.linkedin}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--fg2)] mt-1.5">
            <VideoCamera size={12} className="text-[var(--fg3)]" />
            meet.google.com/qvd-mkzr-ahs
          </div>
        </div>
      </div>

      {/* Mode + send */}
      <div className="shrink-0 border-t border-[var(--beige-300)] px-5 py-3">
        <div className="flex items-center gap-4 mb-2.5">
          {([
            ['propose', `Propose ${picked.size || ''} time${picked.size === 1 ? '' : 's'}`.replace('  ', ' ')],
            ['book', bookTarget ? `Book ${bookTarget.theirs.split(' · ')[0]} ${bookTarget.theirs.split(' · ')[1]}` : 'Book one time'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                setMode(id);
                if (id === 'book' && picked.size > 1) {
                  setPicked(new Set([pickedSlots[0].id]));
                }
              }}
              className="inline-flex items-center gap-1.5 cursor-pointer text-sm"
            >
              <span className={cx(
                'size-3.5 rounded-full border flex items-center justify-center shrink-0',
                mode === id ? 'border-[var(--brand-primary)]' : 'border-[var(--beige-600)]',
              )}>
                {mode === id && <span className="size-1.5 rounded-full bg-[var(--brand-primary)]" />}
              </span>
              <span className={mode === id ? 'text-[var(--fg1)] font-medium' : 'text-[var(--fg2)]'}>{label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--fg3)] flex-1">
            {mode === 'propose'
              ? 'They pick one; it lands on both calendars automatically.'
              : 'Goes straight onto both calendars.'}
          </span>
          <Button size="sm" variant="secondary" color="altBrand" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!picked.size || !calendarConnected} onClick={send}>
            {mode === 'book' ? 'Send invite' : `Send ${picked.size} time${picked.size === 1 ? '' : 's'}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
