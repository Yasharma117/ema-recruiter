import React from 'react';
import { ArrowRight, Sun, CalendarBlank, X } from '@phosphor-icons/react';
import type { Candidate, OutreachRecord } from '../lib/types';
import { CALENDAR } from '../data/availability';
import { Avatar, Button, IconButton, Modal } from './ui';

/**
 * Accepting a time someone else picked.
 *
 * This used to apply straight from the row. It shouldn't: the candidate chose
 * a slot that suits *them*, and with a nine-hour gap their mid-morning is your
 * pre-dawn. Confirming sends a calendar update, so the one thing worth a beat
 * is seeing what you are agreeing to before it goes out.
 */
export function ConfirmReschedule({
  open, onClose, record, candidate, onConfirm, onPropose,
}: {
  open: boolean;
  onClose: () => void;
  record: OutreachRecord;
  candidate: Candidate;
  onConfirm: () => void;
  onPropose: () => void;
}) {
  const m = record.meeting;
  if (!open || !m?.booked) return null;

  const first = candidate.name.split(' ')[0];
  const early = m.booked.outsideCoreHours;

  return (
    <Modal label="Confirm the new time" open={open} onClose={onClose} width={480}>
      <div className="flex items-start gap-3 px-5 pt-4 pb-3">
        <Avatar name={candidate.name} size={32} tone={candidate.avatarTone} />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-[var(--fg1)]">{first} moved your call</h2>
          <p className="text-sm text-[var(--fg2)]">Nothing is confirmed until you accept.</p>
        </div>
        <IconButton icon={<X size={16} />} onClick={onClose} title="Close" />
      </div>

      <div className="px-5 pb-4">
        <div className="rounded-lg border border-[var(--beige-400)] bg-[var(--beige-50)] p-3">
          {m.previous && (
            <div className="flex items-center gap-2 text-sm mb-2.5 pb-2.5 border-b border-[var(--beige-300)]">
              <span className="line-through text-[var(--fg3)]">{m.previous.theirs}</span>
              <ArrowRight size={12} className="text-[var(--fg3)] shrink-0" />
              <span className="font-medium text-[var(--fg1)]">{m.booked.theirs}</span>
            </div>
          )}
          <div className="flex items-start gap-2.5">
            <CalendarBlank size={14} className="text-[var(--fg3)] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-[var(--fg1)]">
                {m.booked.theirs} <span className="font-normal text-[var(--fg3)]">{candidate.timezone}</span>
              </div>
              <div className="text-sm text-[var(--fg2)]">
                {m.booked.yours} <span className="text-[var(--fg3)]">{CALENDAR.timezone} — your time</span>
              </div>
              <div className="text-xs text-[var(--fg3)] mt-1">{m.durationMins} min · {m.joinUrl}</div>
            </div>
          </div>
        </div>

        {/* The reason this screen exists. */}
        {early && (
          <div className="flex items-start gap-2 mt-3 px-3 py-2.5 rounded-md border border-[var(--warning-border)] bg-[var(--warning-bg-subtle)] text-xs text-[var(--warning-text)]">
            <Sun size={14} className="mt-px shrink-0" />
            <span>
              <span className="font-medium">
                That is {m.booked.yours.split(' · ')[1]} for you, outside your {CALENDAR.workingHours} hours.
              </span>{' '}
              Their working day and yours barely overlap, so this may be the only kind of slot that works.
            </span>
          </div>
        )}

        {m.changeNote && (
          <div className="text-xs text-[var(--fg2)] mt-3">{m.changeNote}</div>
        )}
      </div>

      <div className="flex items-center gap-2 px-5 py-3 border-t border-[var(--beige-300)]">
        <span className="text-xs text-[var(--fg3)] flex-1">
          Confirming updates both calendars.
        </span>
        <Button size="sm" variant="secondary" color="altBrand" onClick={onPropose}>
          Propose other times
        </Button>
        <Button size="sm" onClick={onConfirm}>Confirm {m.booked.yours.split(' · ')[1]}</Button>
      </div>
    </Modal>
  );
}
