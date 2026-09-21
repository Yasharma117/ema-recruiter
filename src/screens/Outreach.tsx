import React from 'react';
import {
  PaperPlaneTilt, Pause, Sparkle, EnvelopeSimple, LinkedinLogo, Check, Users,
  CaretDown, CaretRight, Warning, ArrowCounterClockwise, Question, X,
} from '@phosphor-icons/react';
import type { OutreachRecord, OutreachState } from '../lib/types';
import {
  STATES, STAT_GROUPS, nextAction, isHalted, type ActionId,
} from '../lib/outreach';
import { SEARCH, SEQUENCE } from '../data/search';
import {
  Avatar, Badge, Banner, Button, Card, Checkbox, EmptyState, IconButton,
  ToastStack, cx,
} from '../components/ui';
import { AppShell } from '../components/AppShell';
import { ClassifyPanel } from './Classify';
import { SchedulePanel } from './Schedule';
import { AVAILABILITY_HINTS } from '../data/outreach';
import { CalendarBlank, VideoCamera, ArrowRight } from '@phosphor-icons/react';
import { SequenceEditor, DraftEditor } from '../components/SequenceEditor';
import { ConfirmReschedule } from '../components/ConfirmReschedule';
import { useStore } from '../store';
import { TimeChange } from '../components/Notifications';
import { useFocusTarget } from '../lib/useFocusTarget';
import { UsageOverlay } from '../layouts/LayoutPicker';

export function OutreachScreen() {
  const store = useStore();
  const { candidates, criteria, outreach, senders, dailyLimit, forced, toasts, dismissToast, toast } = store;
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const [sendersOpen, setSendersOpen] = React.useState(false);
  // Every group starts open. A row that moves into a collapsed group would
  // otherwise vanish at the moment you acted on it.
  const [openGroups, setOpenGroups] = React.useState<Set<string>>(
    () => new Set(STAT_GROUPS.map((g) => g.id)),
  );
  const [statFilter, setStatFilter] = React.useState<string | null>(null);
  const [scheduleFor, setScheduleFor] = React.useState<string | null>(null);
  const [confirmFor, setConfirmFor] = React.useState<string | null>(null);

  const byId = React.useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);
  const senderById = React.useMemo(() => new Map(senders.map((s) => [s.id, s])), [senders]);

  const arrivals = outreach.filter((r) => r.isNew);

  // Land on whatever needs you most, rather than row one.
  React.useEffect(() => {
    if (selectedId && outreach.some((r) => r.candidateId === selectedId)) return;
    const first = arrivals[0] ?? outreach.find((r) => nextAction(r).kind === 'human') ?? outreach[0];
    if (first) setSelectedId(first.candidateId);
  }, [outreach, selectedId, arrivals]);

  // Arriving from a notification overrides that: it names a person. Declared
  // after the effect above so it wins when both run on the same mount.
  useFocusTarget((id, movedCall) => {
    setSelectedId(id);
    if (movedCall) setConfirmFor(id);
  });

  const records = React.useMemo(() => {
    let list = outreach;
    if (forced === 'sender-disconnected') {
      list = list.map((r) => (r.senderId === 'snd_gmail' && !isHalted(r)
        ? { ...r, state: 'sender-disconnected' as OutreachState } : r));
    }
    if (statFilter) {
      const g = STAT_GROUPS.find((x) => x.id === statFilter);
      if (g) list = list.filter((r) => g.states.includes(r.state));
    }
    return list;
  }, [outreach, forced, statFilter]);

  const groups = STAT_GROUPS.map((g) => ({
    ...g,
    rows: records.filter((r) => g.states.includes(r.state)),
    total: outreach.filter((r) => g.states.includes(r.state)).length,
  }));

  const selected = records.find((r) => r.candidateId === selectedId) ?? records[0] ?? null;
  const disconnected = senders.find((s) => !s.connected);

  const runAction = (r: OutreachRecord, id: ActionId) => {
    if (id === 'schedule-call' || id === 'reschedule' || id === 'decline-new-time') {
      setScheduleFor(r.candidateId); return;
    }
    if (id === 'confirm-new-time') { setConfirmFor(r.candidateId); return; }
    if (id === 'reconnect-calendar') { store.reconnectCalendar(); return; }
    if (id === 'join-call') { toast('Opening Google Meet.'); return; }
    if (id === 'add-sender') { setSendersOpen(true); return; }
    if (id === 'view-other-search') { toast('Opening “Staff Backend — EMEA”.'); return; }
    if (id === 'reconnect') { store.reconnectSender(r.senderId); return; }
    store.act(r.candidateId, id);
  };

  const headerActions = (
    <>
      <div className="relative">
        <Button size="sm" variant="secondary" color="altBrand" icon={<Users size={14} />} onClick={() => setSendersOpen((o) => !o)}>
          Senders
        </Button>
        {sendersOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setSendersOpen(false)} />
            <div className="absolute right-0 top-full mt-1.5 z-50 w-[320px] bg-white border border-[var(--beige-400)] rounded-lg shadow-[var(--shadow-md)] p-3 animate-[emaIn_150ms_var(--ease-out-quint)]">
              <div className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)] mb-2">Connected accounts</div>
              <div className="space-y-2.5">
                {senders.map((s) => (
                  <div key={s.id} className="text-sm">
                    <div className="flex items-center gap-1.5">
                      {s.channel === 'email' ? <EnvelopeSimple size={13} className="text-[var(--fg3)]" /> : <LinkedinLogo size={13} className="text-[var(--fg3)]" />}
                      <span className="text-[var(--fg1)] truncate flex-1">{s.handle}</span>
                      {!s.connected && (
                        <button onClick={() => store.reconnectSender(s.id)}
                          className="text-xs font-medium text-[var(--error-text)] underline cursor-pointer shrink-0">
                          Reconnect
                        </button>
                      )}
                    </div>
                    {s.connected && (
                      <div className="mt-1 ml-[19px]">
                        <div className="h-1 rounded-full bg-[var(--beige-500)] overflow-hidden">
                          <div className={cx('h-full rounded-full', s.usedToday / s.dailyCap > 0.8 ? 'bg-[var(--warning)]' : 'bg-[var(--green-800)]')}
                            style={{ width: `${(s.usedToday / s.dailyCap) * 100}%` }} />
                        </div>
                        <div className="text-xs text-[var(--fg3)] mt-1">{s.usedToday}/{s.dailyCap} {s.periodLabel}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-[var(--beige-300)]">
                <div className="flex items-center gap-1.5 text-sm">
                  <CalendarBlank size={13} className="text-[var(--fg3)]" />
                  <span className="text-[var(--fg1)] flex-1 truncate">Google Calendar</span>
                  {store.calendar.connected
                    ? <span className="text-xs text-[var(--fg3)]">connected</span>
                    : <button onClick={store.reconnectCalendar}
                        className="text-xs font-medium text-[var(--error-text)] underline cursor-pointer">Reconnect</button>}
                </div>
                <div className="text-xs text-[var(--fg3)] ml-[19px] mt-0.5">
                  {store.calendar.workingHours} {store.calendar.timezone} · invites send from here
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[var(--beige-300)] flex items-center justify-between gap-2">
                <div className="text-xs text-[var(--fg2)] flex-1">
                  Daily candidate limit
                  <div className="text-[var(--fg3)]">At most {dailyLimit} new people a day.</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => store.setDailyLimit(Math.max(1, dailyLimit - 5))}
                    className="size-6 rounded-xs border border-[var(--beige-500)] bg-white cursor-pointer text-[var(--fg2)]">−</button>
                  <span className="w-6 text-center text-sm font-bold tabular-nums">{dailyLimit}</span>
                  <button onClick={() => store.setDailyLimit(Math.min(50, dailyLimit + 5))}
                    className="size-6 rounded-xs border border-[var(--beige-500)] bg-white cursor-pointer text-[var(--fg2)]">+</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <Button size="sm" variant="secondary" color="altBrand" icon={<Pause size={14} />}
        onClick={() => toast('Outreach paused. Nothing will send until you resume.', { label: 'Resume', onClick: () => {} })}>
        Pause
      </Button>
    </>
  );

  if (!outreach.length) {
    return (
      <AppShell screen="outreach" breadcrumbs={['Searches', SEARCH.name, 'Outreach']}>
        <EmptyState
          icon={<PaperPlaneTilt size={22} />}
          title="No outreach yet."
          body="Shortlist candidates, then start outreach from the candidate list."
        />
      </AppShell>
    );
  }

  return (
    <AppShell screen="outreach" breadcrumbs={['Searches', SEARCH.name, 'Outreach']} actions={headerActions}>
      <div className="h-full flex flex-col">
        {/* Arrival — what just landed here and what it wants. */}
        {arrivals.length > 0 && (
          // The wrapper clips; the padded strip inside is what travels, so the
          // banner reads as coming out of the chrome rather than blinking into
          // existence above the table. Rare event, so it gets a real entrance.
          <div className="shrink-0 overflow-hidden">
            <div className="px-5 pt-3 animate-[emaDrop_280ms_var(--ease-out-quint)_backwards]">
              <ArrivalBanner
                arrivals={arrivals}
                byId={byId}
                onOpen={setSelectedId}
                onDismiss={store.acknowledgeArrivals}
              />
            </div>
          </div>
        )}

        {/* Stat strip — doubles as a filter */}
        <div data-usage="stats" className="shrink-0 px-5 pt-3.5 pb-3 border-b border-[var(--beige-300)]">
          <div className="flex items-center gap-2 flex-wrap">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setStatFilter(statFilter === g.id ? null : g.id)}
                className={cx(
                  'flex items-baseline gap-1.5 px-3 py-1.5 rounded-md border cursor-pointer transition-colors duration-150',
                  statFilter === g.id
                    ? 'bg-[var(--beige-200)] border-[var(--beige-600)]'
                    : 'bg-white border-[var(--beige-400)] hover:border-[var(--beige-600)]',
                  g.id === 'needs-you' && g.total > 0 && statFilter !== g.id && 'border-[var(--brand-primary)]',
                )}
              >
                <span className={cx('text-base font-bold tabular-nums',
                  g.id === 'needs-you' && g.total > 0 ? 'text-[var(--brand-ink)]' : 'text-[var(--fg1)]')}>
                  {g.total}
                </span>
                <span className="text-xs text-[var(--fg2)]">{g.label}</span>
              </button>
            ))}
            {statFilter && (
              <Button size="xs" variant="ghost" color="altBrand" onClick={() => setStatFilter(null)}>Clear filter</Button>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-2.5 text-xs text-[var(--fg2)]">
            <Check size={12} weight="bold" className="text-[var(--success)]" />
            Ema stops all follow-ups the moment someone replies.
          </div>
        </div>

        {!store.calendar.connected && (
          <div className="px-5 pt-3">
            <Banner
              variant="error"
              icon={<CalendarBlank size={15} weight="bold" />}
              title="Google Calendar is disconnected."
              action={<Button size="xs" onClick={store.reconnectCalendar}>Reconnect</Button>}
            >
              Invites cannot be sent and calendar changes will not reach you until it is reconnected.
            </Banner>
          </div>
        )}

        {disconnected && forced === 'sender-disconnected' && (
          <div className="px-5 pt-3">
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

        <div className="flex-1 min-h-0 flex">
          {/* Left: the table */}
          <div className="flex-1 min-w-0 overflow-y-auto" data-usage="next-action">
            <table className="w-full border-collapse table-fixed">
              <colgroup>
                <col style={{ width: 44 }} />
                <col style={{ width: '32%' }} />
                <col style={{ width: 152 }} />
                <col style={{ width: '30%' }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 92 }} />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-[var(--beige-50)]">
                <tr className="border-b border-[var(--beige-400)]">
                  <th className="pl-5 py-2.5"><span className="sr-only">Select</span></th>
                  {['Candidate', 'Stage', 'Next action', 'Sender', 'Last activity'].map((h) => (
                    <th key={h} className="py-2.5 pr-3 text-left text-xs font-bold uppercase tracking-[0.4px] text-[var(--fg3)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.filter((g) => g.rows.length > 0).map((g) => {
                  const open = openGroups.has(g.id);
                  return (
                    <React.Fragment key={g.id}>
                      <tr>
                        <td colSpan={6} className="bg-[var(--beige-100)] p-0 border-y border-[var(--beige-300)]">
                          <button
                            onClick={() => setOpenGroups((prev) => {
                              const n = new Set(prev); n.has(g.id) ? n.delete(g.id) : n.add(g.id); return n;
                            })}
                            className={cx(
                              'w-full flex items-center gap-1.5 px-5 py-1.5 text-xs font-bold uppercase tracking-[1.2px] cursor-pointer',
                              g.id === 'needs-you' ? 'text-[var(--fg1)]' : 'text-[var(--fg3)] hover:text-[var(--fg1)]',
                            )}
                          >
                            {open ? <CaretDown size={11} weight="bold" /> : <CaretRight size={11} weight="bold" />}
                            {g.label} ({g.rows.length})
                          </button>
                        </td>
                      </tr>
                      {open && g.rows.map((r) => (
                        <Row
                          key={r.candidateId}
                          r={r}
                          candidate={byId.get(r.candidateId)}
                          sender={senderById.get(r.senderId)}
                          selected={selected?.candidateId === r.candidateId}
                          checked={checked.has(r.candidateId)}
                          emphasise={g.id === 'needs-you' || g.id === 'blocked'}
                          onCheck={() => setChecked((p) => {
                            const n = new Set(p); n.has(r.candidateId) ? n.delete(r.candidateId) : n.add(r.candidateId); return n;
                          })}
                          onSelect={() => setSelectedId(r.candidateId)}
                        />
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Right: the one thing this row needs */}
          {selected && (
            <aside aria-label="Selected candidate" data-usage="detail" className="w-[400px] shrink-0 border-l border-[var(--beige-300)] bg-[var(--beige-50)] overflow-y-auto">
              <DetailPane record={selected} onAction={runAction} />
            </aside>
          )}
        </div>

        {checked.size > 0 && (
          <div className="shrink-0 bg-[var(--surface-dark)] text-[var(--surface-dark-fg-strong)] px-4 py-2.5 flex items-center gap-3 animate-[emaRise_200ms_var(--ease-out-quint)]">
            <span className="text-sm font-medium">{checked.size} selected</span>
            <button onClick={() => setChecked(new Set())} className="text-xs text-[var(--surface-dark-fg)] hover:text-white cursor-pointer">Clear</button>
            <div className="w-px h-5 bg-[var(--surface-dark-line)]" />
            {([
              ['Approve and send', 'review-and-send'],
              ['Pause', null],
              ['Assign sender', null],
              ['Cancel outreach', 'close-out'],
            ] as [string, ActionId | null][]).map(([label, id]) => (
              <button
                key={label}
                onClick={() => {
                  if (id) checked.forEach((cid) => store.act(cid, id));
                  else toast(`${label} applied to ${checked.size} candidates`, { label: 'Undo', onClick: () => {} });
                  setChecked(new Set());
                }}
                className={cx('text-sm px-2.5 py-1 rounded-sm cursor-pointer transition-colors',
                  label === 'Cancel outreach' ? 'text-[var(--red-600)] hover:bg-[var(--surface-dark-hover)]' : 'hover:bg-[var(--surface-dark-hover)]')}
              >
                {label}
              </button>
            ))}
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
            onSend={(meeting) => {
              store.act(scheduleFor, 'send-invite', { meeting });
              setScheduleFor(null);
            }}
          />
        );
      })()}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <UsageOverlay screen="outreach" />
    </AppShell>
  );
}

/* --------------------------------- row ----------------------------------- */

function Row({ r, candidate, sender, selected, checked, onCheck, onSelect, emphasise }: any) {
  const meta = STATES[r.state as OutreachState];
  const action = nextAction(r, sender);
  if (!candidate) return null;

  return (
    <tr
      onClick={onSelect}
      className={cx(
        'border-b border-[var(--beige-200)] cursor-pointer transition-colors duration-150 relative',
        selected ? 'bg-[var(--beige-200)]' : r.isNew ? 'bg-[var(--success-bg-subtle)]' : 'hover:bg-[var(--beige-100)]',
      )}
    >
      <td className="pl-5 py-2.5 relative" onClick={(e) => e.stopPropagation()}>
        {/* Arrival accent — persists until the rows are actually looked at. */}
        {r.isNew && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--brand-primary)]" />}
        <Checkbox checked={checked} onChange={onCheck} label={`Select ${candidate.name}`} />
      </td>
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={candidate.name} size={26} tone={candidate.avatarTone} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); onSelect(); }}
                className="text-sm font-medium text-[var(--fg1)] truncate text-left hover:underline cursor-pointer"
              >
                {candidate.name}
              </button>
              {r.isNew && (
                <span className="text-[10px] uppercase tracking-wide font-bold text-[var(--success-text)] shrink-0">New</span>
              )}
            </div>
            <div className="text-xs text-[var(--fg3)] truncate">{candidate.title} · {candidate.company}</div>
          </div>
        </div>
      </td>
      <td className="py-2.5 pr-3">
        <Badge variant={meta.tone as any} size="sm">{meta.label}</Badge>
      </td>
      <td className="py-2.5 pr-3">
        <div className={cx('text-sm truncate flex items-center gap-1.5',
          emphasise ? 'text-[var(--fg1)] font-medium' : 'text-[var(--fg2)]')}>
          {r.asks?.length > 0 && <Question size={12} weight="bold" className="text-[var(--fg3)] shrink-0" />}
          {action.primary ? action.primary.label : action.label}
        </div>
        {action.primary && (
          <div className="text-xs text-[var(--fg3)] truncate">{action.label}</div>
        )}
      </td>
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-1.5 text-xs text-[var(--fg2)]">
          {sender?.channel === 'email' ? <EnvelopeSimple size={12} /> : <LinkedinLogo size={12} />}
          <span className="truncate">{sender?.name ?? '—'}</span>
        </div>
      </td>
      <td className="py-2.5 pr-5 text-xs text-[var(--fg3)] whitespace-nowrap">{r.lastActivity}</td>
    </tr>
  );
}

/* ------------------------------ detail pane ------------------------------- */

function DetailPane({
  record, onAction,
}: { record: OutreachRecord; onAction: (r: OutreachRecord, id: ActionId) => void }) {
  const store = useStore();
  const candidate = store.candidates.find((x) => x.id === record.candidateId);
  const sender = store.senders.find((s) => s.id === record.senderId);
  const action = nextAction(record, sender);
  const meta = STATES[record.state];
  if (!candidate) return null;

  const halted = isHalted(record);
  const criterionName = (id: string) => store.criteria.find((c) => c.id === id)?.name ?? id;

  return (
    <div className="p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <Avatar name={candidate.name} size={32} tone={candidate.avatarTone} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-[var(--fg1)] truncate">{candidate.name}</div>
          <div className="text-xs text-[var(--fg3)] truncate">{candidate.title}</div>
        </div>
        <Badge variant={meta.tone as any} size="sm">{meta.label}</Badge>
      </div>

      <div className="text-xs text-[var(--fg2)] mb-3 leading-[17px]">{meta.means}</div>

      {/* Replied gets the full read-and-classify surface instead of a button. */}
      {record.state === 'replied' ? (
        <ClassifyPanel
          record={record}
          candidate={candidate}
          criteria={store.criteria}
          onClassify={(outcome) => store.act(record.candidateId, 'read-and-classify', { outcome })}
          onResolveCell={(criterionId, score, quote) => {
            store.setCellOverride({
              candidateId: record.candidateId,
              criterionId,
              score,
              via: 'reply',
              by: candidate.name,
              at: '16 Mar',
              quote,
              originalScore: candidate.scores.find((s) => s.criterionId === criterionId)?.score ?? null,
            });
            store.toast(`${criterionName(criterionId)} recorded from the reply.`);
          }}
        />
      ) : (
        <Card className="p-3 mb-3">
          <div className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)] mb-1.5">Next action</div>
          <div className="text-sm text-[var(--fg1)] mb-2.5">{action.label}</div>
          {(action.primary || action.secondary) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {action.primary && (
                <Button size="sm" onClick={() => onAction(record, action.primary!.id)}>
                  {action.primary.label}
                </Button>
              )}
              {action.secondary && (
                <Button size="sm" variant="secondary" color="altBrand" onClick={() => onAction(record, action.secondary!.id)}>
                  {action.secondary.label}
                </Button>
              )}
            </div>
          )}
        </Card>
      )}

      {record.note && record.state !== 'replied' && (
        <div className={cx(
          'flex items-start gap-2 text-xs px-2.5 py-2 rounded-md border mb-3 mt-3',
          meta.tone === 'error'
            ? 'bg-[var(--error-bg-subtle)] border-[var(--error-border)] text-[var(--error-text)]'
            : 'bg-[var(--beige-100)] border-[var(--beige-400)] text-[var(--fg2)]',
        )}>
          <ArrowCounterClockwise size={12} className="mt-px shrink-0" />
          <span>{record.note}</span>
        </div>
      )}

      {/* The meeting, once one exists. */}
      {record.meeting && <MeetingCard record={record} candidate={candidate} onAction={onAction} />}

      {/* Sequence — every message readable, every unsent one editable */}
      <div className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)] mb-2 mt-4">Sequence</div>
      <div className="mb-4">
        <SequenceEditor
          record={record}
          firstName={candidate.name.split(' ')[0]}
          onEdit={(n, body) => {
            store.setStepBody(record.candidateId, n, body);
            store.toast(`Step ${n} updated for ${candidate.name.split(' ')[0]}.`);
          }}
        />
      </div>

      {/* Thread */}
      <div className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)] mb-2">Messages</div>
      <div className="space-y-2">
        {record.messages.length === 0 && (
          <div className="text-xs text-[var(--fg3)] py-3">Nothing sent yet.</div>
        )}
        {record.messages.map((m, i) => (
          <div key={i} className={cx(
            'rounded-lg border p-3',
            m.draft ? 'border-[var(--ai-magic-border)] bg-[var(--ai-magic-bg-subtle)]'
              : m.direction === 'in' ? 'border-[var(--success-border)] bg-[var(--success-bg-subtle)]'
              : 'border-[var(--beige-400)] bg-white',
          )}>
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              {m.draft && <Sparkle size={12} weight="fill" className="text-[var(--ai-magic-text)]" />}
              <span className={cx(
                'text-xs font-bold uppercase tracking-[1.2px]',
                m.draft ? 'text-[var(--ai-magic-text)]' : m.direction === 'in' ? 'text-[var(--success-text)]' : 'text-[var(--fg3)]',
              )}>
                {m.draft ? 'Drafted by Ema · Review before sending'
                  : m.direction === 'in' ? `${candidate.name.split(' ')[0]} replied`
                  : m.channel === 'email' ? 'Email sent' : 'LinkedIn sent'}
              </span>
              <span className="text-xs text-[var(--fg3)] ml-auto">{m.at}</span>
            </div>

            {/* What this message asks about, shown before it goes out. */}
            {m.asks && m.asks.length > 0 && (
              <div className="flex items-start gap-1.5 text-xs text-[var(--fg2)] mb-2 px-2 py-1.5 rounded-sm bg-white/60 border border-[var(--beige-400)]">
                <Question size={12} weight="bold" className="mt-px shrink-0" />
                <span>Asks about <span className="font-medium">{m.asks.map(criterionName).join(', ')}</span> — unknown on the scorecard.</span>
              </div>
            )}

            {m.subject && <div className="text-sm font-medium text-[var(--fg1)] mb-1">{m.subject}</div>}
            {!m.draft && (
              <div className="text-sm text-[var(--fg2)] whitespace-pre-line leading-[20px]">{m.body}</div>
            )}
            {m.opened && <div className="text-xs text-[var(--fg3)] mt-1.5">Opened</div>}

            {m.draft && (
              <div className="mt-2.5">
                <DraftEditor
                  body={m.body}
                  onSave={(bodyText) => {
                    store.setDraftBody(record.candidateId, bodyText);
                    store.toast('Draft updated.');
                  }}
                  onSend={() => store.act(record.candidateId, 'review-and-send')}
                  onSkip={() => store.act(record.candidateId, 'skip')}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ the meeting ------------------------------- */

function MeetingCard({
  record, candidate, onAction,
}: {
  record: OutreachRecord;
  candidate: { name: string; timezone: string };
  onAction: (r: OutreachRecord, id: ActionId) => void;
}) {
  const m = record.meeting!;
  const moved = record.state === 'reschedule-requested';
  const byThem = m.lastChangedBy === 'candidate';
  const first = candidate.name.split(' ')[0];

  return (
    <Card className={cx('p-3 mt-3', moved && 'border-[var(--warning-border)] bg-[var(--warning-bg-subtle)]')}>
      <div className="flex items-center gap-1.5 mb-2">
        <CalendarBlank size={13} weight="bold" className={moved ? 'text-[var(--warning-text)]' : 'text-[var(--fg3)]'} />
        <span className={cx('text-xs font-bold uppercase tracking-[1.2px]',
          moved ? 'text-[var(--warning-text)]' : 'text-[var(--fg3)]')}>
          {moved ? `${first} moved this` : m.booked ? 'On both calendars' : 'Waiting on them to pick'}
        </span>
        <span className="ml-auto text-xs text-[var(--fg3)]">{m.durationMins} min</span>
      </div>

      {/* What moved — you cannot confirm a change you cannot see. */}
      {moved && m.previous && m.booked && (
        <div className="flex items-center gap-2 text-sm mb-2">
          <span className="line-through text-[var(--fg3)]">{m.previous.theirs}</span>
          <ArrowRight size={12} className="text-[var(--fg3)] shrink-0" />
          <span className="font-medium text-[var(--fg1)]">{m.booked.theirs}</span>
        </div>
      )}

      {m.booked && !moved && (
        <div>
          <div className="text-sm font-medium text-[var(--fg1)]">
            {m.booked.theirs} <span className="text-[var(--fg3)] font-normal">{candidate.timezone}</span>
          </div>
          <div className="text-xs text-[var(--fg2)]">{m.booked.yours} your time</div>
        </div>
      )}

      {m.proposed && (
        <div className="space-y-1">
          {m.proposed.map((s) => (
            <div key={s.id} className="text-sm text-[var(--fg1)]">
              {s.theirs} <span className="text-[var(--fg3)] text-xs">· {s.yours.split(' · ')[1]} your time</span>
            </div>
          ))}
        </div>
      )}

      {m.changeNote && (
        <div className="text-xs text-[var(--warning-text)] mt-1.5">{m.changeNote}</div>
      )}

      {m.joinUrl && m.booked && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--fg2)] mt-2">
          <VideoCamera size={12} className="text-[var(--fg3)]" />
          {m.joinUrl}
        </div>
      )}

      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
        {record.state === 'call-booked' && (
          <>
            <Button size="xs" onClick={() => onAction(record, 'join-call')}>Join</Button>
            <Button size="xs" variant="secondary" color="altBrand" onClick={() => onAction(record, 'mark-call-done')}>
              Mark done
            </Button>
            <Button size="xs" variant="ghost" color="altBrand" onClick={() => onAction(record, 'reschedule')}>
              Reschedule
            </Button>
            <Button size="xs" variant="ghost" color="destructive" onClick={() => onAction(record, 'cancel-call')}>
              Cancel
            </Button>
          </>
        )}
        {record.state === 'times-proposed' && (
          <Button size="xs" variant="ghost" color="destructive" onClick={() => onAction(record, 'cancel-call')}>
            Withdraw times
          </Button>
        )}
      </div>

      {byThem && !moved && (
        <div className="text-xs text-[var(--fg3)] mt-2 pt-2 border-t border-[var(--beige-300)]">
          {first} booked this from their side.
        </div>
      )}
    </Card>
  );
}

/* ------------------------------ arrivals ---------------------------------- */

/**
 * What landed here since you last looked. A calendar change made from the
 * candidate's side is the same class of event as a new draft — it arrived
 * without you, so it has to announce itself rather than sit in a row.
 */
function ArrivalBanner({
  arrivals, byId, onOpen, onDismiss,
}: {
  arrivals: OutreachRecord[];
  byId: Map<string, { name: string; avatarTone?: 'green' | 'purple' | 'beige' }>;
  onOpen: (id: string) => void;
  onDismiss: () => void;
}) {
  const calendarChanges = arrivals.filter((r) => r.meeting?.lastChangedBy === 'candidate');
  const drafts = arrivals.filter((r) => !calendarChanges.includes(r));
  const lead = calendarChanges[0] ?? drafts[0];
  const leadName = byId.get(lead.candidateId)?.name ?? '';
  const first = (id: string) => byId.get(id)?.name.split(' ')[0] ?? 'They';
  const moved = calendarChanges.length > 0;

  const title = moved
    ? calendarChanges.length === 1
      ? `${first(calendarChanges[0].candidateId)} moved your call`
      : `${calendarChanges.length} calls were moved from the candidates' side`
    : `${drafts.length} candidate${drafts.length === 1 ? '' : 's'} added to outreach`;

  // One moved call can show exactly what moved; anything else gets the sentence.
  const single = moved && calendarChanges.length === 1 ? calendarChanges[0].meeting : undefined;
  const body = moved
    ? 'Nothing is confirmed until you accept.'
    : `${drafts.length === 1 ? 'A draft is' : 'Drafts are'} ready for you to review. Nothing sends until you approve.`;

  return (
    <div className={cx(
      'flex items-center gap-3 rounded-lg border bg-white pl-3 pr-2 py-2.5 shadow-[var(--shadow-sm)]',
      moved ? 'border-[var(--warning-border)]' : 'border-[var(--ai-magic-border)]',
    )}>
      <span
        aria-hidden
        className={cx('w-1 self-stretch rounded-full shrink-0', moved ? 'bg-[var(--warning)]' : 'bg-[var(--ai-magic)]')}
      />
      {calendarChanges.length === 1 || drafts.length === 1
        ? <Avatar name={leadName} size={32} tone={byId.get(lead.candidateId)?.avatarTone ?? 'beige'} />
        : moved
          ? <CalendarBlank size={18} weight="bold" className="text-[var(--warning-text)] shrink-0" />
          : <Sparkle size={18} weight="fill" className="text-[var(--ai-magic-text)] shrink-0" />}

      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-[var(--fg1)] truncate">{title}</div>
        <div className="mt-0.5">
          {single?.booked
            ? <TimeChange from={single.previous} to={single.booked} />
            : <span className="text-sm text-[var(--fg2)]">{body}</span>}
        </div>
      </div>

      <Button
        size="sm"
        color={moved ? 'brand' : 'aiMagic'}
        iconRight={<ArrowRight size={13} />}
        className="shrink-0"
        onClick={() => onOpen(lead.candidateId)}
      >
        {moved ? 'Review the change' : 'Review the first draft'}
      </Button>
      <IconButton icon={<X size={14} />} onClick={onDismiss} title="Dismiss" className="shrink-0" />
    </div>
  );
}
