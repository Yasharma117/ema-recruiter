import React from 'react';
import { PaperPlaneTilt, Warning, X, Sparkle } from '@phosphor-icons/react';
import type { OutreachRecord, OutreachState } from '../lib/types';
import { STATES, nextAction } from '../lib/outreach';
import { SEARCH } from '../data/search';
import { Avatar, Badge, Banner, Button, EmptyState, Modal, IconButton, ToastStack, cx } from '../components/ui';
import { AppShell } from '../components/AppShell';
import { SchedulePanel } from '../screens/Schedule';
import { ClassifyPanel } from '../screens/Classify';
import { AVAILABILITY_HINTS } from '../data/outreach';
import { type ActionId } from '../lib/outreach';
import { SequenceEditor, DraftEditor } from '../components/SequenceEditor';
import { ConfirmReschedule } from '../components/ConfirmReschedule';
import { useStore } from '../store';
import { UsageOverlay } from './LayoutPicker';

/**
 * Outreach · C — Pipeline board. Built to be disproven.
 *
 * The objection: a board's central affordance is dragging, which implies the
 * recruiter controls transitions. Nearly every transition here is machine- or
 * candidate-driven — you do not drag someone from "Sent" to "Replied", they
 * reply. Cards are therefore deliberately not draggable, which is exactly the
 * tell.
 *
 * Built to Greenhouse's published rules so the comparison is fair: capped at
 * 10 cards per column with a link out, and colour encoding *who is blocking*
 * rather than which stage. Note what that colour rule reduces to — it is the
 * Needs you / In flight grouping from variant A, redrawn at four times the
 * width.
 */

const COLUMNS: { id: string; label: string; states: OutreachState[] }[] = [
  { id: 'queued', label: 'Queued', states: ['draft-ready', 'scheduled'] },
  { id: 'sent', label: 'Sent', states: ['sent', 'send-limit'] },
  { id: 'replied', label: 'Replied', states: ['replied', 'sequence-finished'] },
  { id: 'scheduling', label: 'Scheduling', states: ['times-proposed', 'call-booked', 'reschedule-requested', 'call-done'] },
  { id: 'outcome', label: 'Outcome', states: ['interested', 'maybe-later', 'handed-off', 'not-interested'] },
  { id: 'blocked', label: 'Blocked', states: ['no-route', 'bounced', 'sender-disconnected', 'send-failed', 'already-contacted', 'calendar-disconnected'] },
];

const CAP = 10;

/** Greenhouse's semantics: colour says who is blocking, not what stage it is. */
function blockedBy(r: OutreachRecord): 'you' | 'clock' | 'none' {
  const a = nextAction(r);
  if (a.kind === 'human') return 'you';
  if (a.kind === 'waiting') return 'clock';
  return 'none';
}

const DOT = {
  you: { cls: 'bg-[var(--red-800)]', label: 'Needs you' },
  clock: { cls: 'bg-[var(--yellow-900)]', label: 'Waiting' },
  none: { cls: 'bg-[var(--beige-600)]', label: 'Done' },
};

export function OutreachBoard() {
  const store = useStore();
  const { candidates, outreach, toasts, dismissToast, toast } = store;
  const byId = React.useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);
  const [showAll, setShowAll] = React.useState<Set<string>>(new Set());
  const [scheduleFor, setScheduleFor] = React.useState<string | null>(null);
  const [confirmFor, setConfirmFor] = React.useState<string | null>(null);
  // Some actions need input — a reply to read, a draft to approve. A board has
  // no detail pane, so it needs a surface for those or it silently no-ops.
  const [openCard, setOpenCard] = React.useState<string | null>(null);

  const NEEDS_INPUT: ActionId[] = ['read-and-classify', 'review-and-send'];

  // Cards do not drag, but they must still act — dropping the action is a
  // different failure from the one this layout exists to demonstrate.
  const act = (r: OutreachRecord, id: ActionId) => {
    if (id === 'schedule-call' || id === 'reschedule' || id === 'decline-new-time') {
      setScheduleFor(r.candidateId); return;
    }
    if (id === 'reconnect') { store.reconnectSender(r.senderId); return; }
    if (id === 'confirm-new-time') { setConfirmFor(r.candidateId); return; }
    if (id === 'reconnect-calendar') { store.reconnectCalendar(); return; }
    if (id === 'join-call') { toast('Opening Google Meet.'); return; }
    if (id === 'view-other-search') { toast('Opening “Staff Backend — EMEA”.'); return; }
    if (NEEDS_INPUT.includes(id)) { setOpenCard(r.candidateId); return; }
    store.act(r.candidateId, id);
  };

  if (!outreach.length) {
    return (
      <AppShell breadcrumbs={['Searches', SEARCH.name, 'Outreach']} screen="outreach">
        <EmptyState icon={<PaperPlaneTilt size={22} />} title="No outreach yet."
          body="Shortlist candidates, then start outreach from the candidate list." />
      </AppShell>
    );
  }

  const needsYou = outreach.filter((r) => blockedBy(r) === 'you').length;

  return (
    <AppShell breadcrumbs={['Searches', SEARCH.name, 'Outreach']} screen="outreach">
      <div className="h-full flex flex-col">
        <div className="shrink-0 px-5 pt-3 pb-2.5 flex items-center gap-3 flex-wrap" data-usage="grouping">
          <span className="text-sm text-[var(--fg1)]">
            <span className="font-bold tabular-nums">{needsYou}</span> need you
          </span>
          {(['you', 'clock', 'none'] as const).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-xs text-[var(--fg2)]">
              <span className={cx('size-2 rounded-full', DOT[k].cls)} /> {DOT[k].label}
            </span>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-x-auto px-5 pb-5" data-usage="next-action">
          <div className="flex gap-3 h-full min-w-max">
            {COLUMNS.map((col) => {
              const rows = outreach.filter((r) => col.states.includes(r.state));
              const expanded = showAll.has(col.id);
              const visible = expanded ? rows : rows.slice(0, CAP);
              return (
                <div key={col.id} className="w-[236px] shrink-0 flex flex-col">
                  <div className="flex items-center gap-2 px-1 pb-2 shrink-0">
                    <span className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)]">{col.label}</span>
                    <span className="text-xs text-[var(--fg2)] tabular-nums">{rows.length}</span>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto space-y-2 rounded-lg bg-[var(--beige-100)] border border-[var(--beige-300)] p-2">
                    {visible.map((r) => {
                      const c = byId.get(r.candidateId);
                      if (!c) return null;
                      const who = blockedBy(r);
                      const a = nextAction(r);
                      return (
                        <div key={r.candidateId}
                          className="rounded-md border border-[var(--beige-400)] bg-white p-2.5 shadow-[var(--shadow-xs)]">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Avatar name={c.name} size={22} tone={c.avatarTone} />
                            <span className="text-sm font-medium text-[var(--fg1)] truncate flex-1">{c.name}</span>
                            <span className={cx('size-2 rounded-full shrink-0', DOT[who].cls)} title={DOT[who].label} />
                          </div>
                          <Badge variant={STATES[r.state].tone as any} size="sm">{STATES[r.state].label}</Badge>
                          {a.primary ? (
                            <button
                              onClick={() => act(r, a.primary!.id)}
                              className="mt-2 w-full text-left text-xs font-medium text-[var(--success-text)] hover:underline cursor-pointer"
                            >
                              {a.primary.label} →
                            </button>
                          ) : (
                            <div className="text-xs text-[var(--fg2)] mt-1.5 line-clamp-2">{a.label}</div>
                          )}
                        </div>
                      );
                    })}

                    {!rows.length && (
                      <div className="text-xs text-[var(--fg3)] text-center py-6">Empty</div>
                    )}

                    {/* Greenhouse's explicit anti-infinite-scroll rule. */}
                    {rows.length > CAP && !expanded && (
                      <button
                        onClick={() => setShowAll((p) => new Set(p).add(col.id))}
                        className="w-full text-xs font-medium text-[var(--success-text)] hover:underline cursor-pointer py-1.5"
                      >
                        View all {rows.length}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="shrink-0 px-5 py-2.5 border-t border-[var(--beige-300)] flex items-center gap-2">
          <span className="text-xs text-[var(--fg2)] flex-1">
            Cards are not draggable — stage changes come from Ema or the candidate, not from you.
          </span>
        </div>
      </div>

      {openCard && (() => {
        const rec = outreach.find((r) => r.candidateId === openCard);
        const cand = byId.get(openCard);
        if (!rec || !cand) return null;
        const draft = rec.messages.find((m) => m.draft);
        return (
          <Modal label="Review message" open onClose={() => setOpenCard(null)} width={560}>
            <div className="flex items-start gap-3 px-5 pt-4 pb-3">
              <Avatar name={cand.name} size={32} tone={cand.avatarTone} />
              <div className="flex-1 min-w-0">
                <div className="text-base font-medium text-[var(--fg1)] truncate">{cand.name}</div>
                <div className="text-xs text-[var(--fg3)] truncate">{STATES[rec.state].means}</div>
              </div>
              <IconButton icon={<X size={16} />} onClick={() => setOpenCard(null)} title="Close" />
            </div>
            <div className="px-5 pb-5 overflow-y-auto">
              {rec.state === 'replied' ? (
                <ClassifyPanel
                  record={rec}
                  candidate={cand}
                  criteria={store.criteria}
                  onClassify={(outcome) => {
                    store.act(rec.candidateId, 'read-and-classify', { outcome });
                    setOpenCard(null);
                  }}
                  onResolveCell={(criterionId, score, quote) => {
                    store.setCellOverride({
                      candidateId: rec.candidateId, criterionId, score, via: 'reply',
                      by: cand.name, at: '16 Mar', quote,
                      originalScore: cand.scores.find((x) => x.criterionId === criterionId)?.score ?? null,
                    });
                    toast('Recorded from the reply.');
                  }}
                />
              ) : draft ? (
                <>
                  <div className="rounded-lg border border-[var(--ai-magic-border)] bg-[var(--ai-magic-bg-subtle)] p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkle size={12} weight="fill" className="text-[var(--ai-magic-text)]" />
                      <span className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--ai-magic-text)]">
                        Drafted by Ema · Review before sending
                      </span>
                    </div>
                    <DraftEditor
                      body={draft.body}
                      onSave={(t) => { store.setDraftBody(rec.candidateId, t); toast('Draft updated.'); }}
                      onSend={() => { store.act(rec.candidateId, 'review-and-send'); setOpenCard(null); }}
                      onSkip={() => { store.act(rec.candidateId, 'skip'); setOpenCard(null); }}
                    />
                  </div>
                  <div className="mt-3">
                    <div className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)] mb-2">
                      Rest of the sequence
                    </div>
                    <SequenceEditor
                      record={rec}
                      firstName={cand.name.split(' ')[0]}
                      onEdit={(n, body) => { store.setStepBody(rec.candidateId, n, body); toast(`Step ${n} updated.`); }}
                    />
                  </div>
                </>
              ) : (
                <div className="text-sm text-[var(--fg2)]">Nothing to review here.</div>
              )}
            </div>
          </Modal>
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
