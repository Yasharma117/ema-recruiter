import React from 'react';
import { Check, Sparkle, ArrowRight, CaretDown, PaperPlaneTilt } from '@phosphor-icons/react';
import type { OutreachRecord } from '../lib/types';
import { STATES, nextAction, type ActionId } from '../lib/outreach';
import { SEARCH } from '../data/search';
import { Avatar, Badge, Button, EmptyState, ToastStack, cx } from '../components/ui';
import { AppShell } from '../components/AppShell';
import { ClassifyPanel } from '../screens/Classify';
import { SchedulePanel } from '../screens/Schedule';
import { AVAILABILITY_HINTS } from '../data/outreach';
import { SequenceEditor, DraftEditor } from '../components/SequenceEditor';
import { ConfirmReschedule } from '../components/ConfirmReschedule';
import { useStore } from '../store';
import { UsageOverlay } from './LayoutPicker';

/**
 * Outreach · B — Focus queue.
 *
 * Six items needing a decision is a queue, not a database, so this shows one at
 * a time and measures success by emptying it. Front, Superhuman and Linear
 * Triage independently converged on a three-way disposition where deferral
 * always carries a wake-up trigger — that is what the actions here are.
 *
 * Sacrifices all overview: you cannot see the shape of the pipeline at all.
 */
export function OutreachFocus() {
  const store = useStore();
  const { candidates, outreach, senders, criteria, toasts, dismissToast, toast } = store;
  const [cursor, setCursor] = React.useState(0);
  const [scheduleFor, setScheduleFor] = React.useState<string | null>(null);
  const [confirmFor, setConfirmFor] = React.useState<string | null>(null);

  const byId = React.useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);
  const senderById = React.useMemo(() => new Map(senders.map((s) => [s.id, s])), [senders]);

  // Only what needs a person. Everything waiting is, correctly, not in the queue.
  const queue = outreach.filter((r) => nextAction(r, senderById.get(r.senderId)).kind === 'human');
  const waiting = outreach.length - queue.length;
  const record = queue[Math.min(cursor, queue.length - 1)] ?? null;
  const candidate = record ? byId.get(record.candidateId) : null;

  const act = (r: OutreachRecord, id: ActionId) => {
    if (id === 'reconnect') { store.reconnectSender(r.senderId); return; }
    if (id === 'confirm-new-time') { setConfirmFor(r.candidateId); return; }
    if (id === 'reconnect-calendar') { store.reconnectCalendar(); return; }
    if (id === 'schedule-call' || id === 'reschedule' || id === 'decline-new-time') {
      setScheduleFor(r.candidateId); return;
    }
    if (id === 'join-call') { toast('Opening Google Meet.'); return; }
    if (id === 'view-other-search') { toast('Opening “Staff Backend — EMEA”.'); return; }
    store.act(r.candidateId, id);
    setCursor((c) => Math.min(c, Math.max(0, queue.length - 2)));
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!record) return;
      const a = nextAction(record, senderById.get(record.senderId));
      if (e.key === 'Enter' && a.primary) { e.preventDefault(); act(record, a.primary.id); }
      if (e.key === 'j') { e.preventDefault(); setCursor((c) => Math.min(queue.length - 1, c + 1)); }
      if (e.key === 'k') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [record, queue.length]);

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
      <div className="h-full flex flex-col items-center overflow-y-auto">
        {/* Progress — emptying the queue is the goal, so it is the headline. */}
        <div className="w-full max-w-[760px] px-6 pt-5 pb-3" data-usage="stats">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-[var(--fg1)]">Needs you</span>
            <div className="flex-1 h-1.5 rounded-full bg-[var(--beige-300)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--brand-primary)] transition-[width] duration-300 ease-[var(--ease-out-quint)]"
                style={{ width: `${queue.length ? (cursor / queue.length) * 100 : 100}%` }}
              />
            </div>
            <span className="text-sm text-[var(--fg2)] tabular-nums">
              {queue.length ? `${queue.length} left` : 'all clear'}
            </span>
          </div>
          <div className="text-xs text-[var(--fg3)] mt-1.5">
            {waiting} waiting on a clock or a candidate · not shown here
          </div>
        </div>

        {!record || !candidate ? (
          <div className="flex-1 flex items-center">
            <EmptyState
              icon={<Check size={22} />}
              title="Queue is clear."
              body={`Nothing needs you right now. ${waiting} item${waiting === 1 ? '' : 's'} still in flight.`}
            />
          </div>
        ) : (
          <div className="w-full max-w-[760px] px-6 pb-10" data-usage="next-action">
            <div className="rounded-xl border border-[var(--beige-400)] bg-white shadow-[var(--shadow-sm)] p-5 animate-[emaIn_200ms_var(--ease-out-quint)]">
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={candidate.name} size={36} tone={candidate.avatarTone} />
                <div className="flex-1 min-w-0">
                  <div className="text-base font-medium text-[var(--fg1)] truncate">{candidate.name}</div>
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
                      m.draft ? 'border-[var(--ai-magic-border)] bg-[var(--ai-magic-bg-subtle)]' : 'border-[var(--beige-400)] bg-[var(--beige-50)]')}>
                      {m.draft ? (
                        <>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Sparkle size={12} weight="fill" className="text-[var(--ai-magic-text)]" />
                            <span className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--ai-magic-text)]">
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
                    <summary className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)] cursor-pointer hover:text-[var(--fg1)]">
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

              <div className="mt-4 pt-3 border-t border-[var(--beige-300)] text-xs text-[var(--fg3)]">
                <kbd className="font-mono">⏎</kbd> take the action ·{' '}
                <kbd className="font-mono">J</kbd> skip · <kbd className="font-mono">K</kbd> back
              </div>
            </div>

            {queue.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-[var(--fg3)]">
                <CaretDown size={11} />
                {queue.length - cursor - 1} more after this
              </div>
            )}
          </div>
        )}
      </div>

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
