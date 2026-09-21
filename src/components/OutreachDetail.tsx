import React from 'react';
import {
  X, EnvelopeSimple, LinkedinLogo, Sparkle, ArrowRight, ArrowDown, ArrowUp,
} from '@phosphor-icons/react';
import type { Candidate, OutreachRecord, OutreachState, Sender } from '../lib/types';
import { STATES, nextAction, isHalted, CHANNEL_LABEL, type ActionId } from '../lib/outreach';
import { Avatar, Badge, Button, Drawer, IconButton, LabelText, cx } from './ui';

/**
 * Outreach detail — the read surface for *anyone* in the pipeline.
 *
 * The queue only holds records that need a decision, which left everything
 * waiting on a clock or a candidate unopenable: you could see that Priya was
 * "Sent" and nothing else. This pane closes that hole without inventing work.
 * It states what the record is doing, what it is waiting for and until when,
 * where it sits in the sequence, who is sending, and the whole message history.
 *
 * Actions are whatever `nextAction` already offers and nothing more — a waiting
 * record shows a sentence where a needs-you record shows a button, because that
 * is the truth about it.
 */

/** Same shape as the one in lib/outreach — four lines, not worth a coupling. */
function untilLabel(hours: number | null): string {
  if (hours === null) return 'No timer running';
  if (hours <= 1) return 'Within the hour';
  if (hours < 24) return `In about ${Math.round(hours)} hours`;
  return `In about ${Math.round(hours / 24)} days`;
}

/**
 * Who or what the record is actually waiting on. `nextAction` says what is
 * happening; it does not say whose move it is, and that is the question the
 * queue never had to answer because it only ever held your own moves.
 */
const WAITING_ON: Partial<Record<OutreachState, string>> = {
  scheduled: 'A clock',
  sent: 'A reply from them',
  'send-limit': 'The sender’s weekly cap',
  'times-proposed': 'Them, to pick a time',
  'call-booked': 'The call itself',
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 border-b border-[var(--beige-400)] last:border-b-0">
      <div className="w-[104px] shrink-0 text-xs text-[var(--fg3)] pt-px">{label}</div>
      <div className="flex-1 min-w-0 text-sm text-[var(--fg1)]">{children}</div>
    </div>
  );
}

export function OutreachDetail({
  record, candidate, sender, onClose, onAction, onJump,
}: {
  record: OutreachRecord;
  candidate: Candidate;
  sender?: Sender;
  onClose: () => void;
  onAction: (r: OutreachRecord, id: ActionId) => void;
  /** Present only when this record is in the queue — the decision lives there. */
  onJump?: () => void;
}) {
  const meta = STATES[record.state];
  const a = nextAction(record, sender);
  const halted = isHalted(record);
  const booked = record.meeting?.booked;
  const proposed = record.meeting?.proposed;

  return (
    <Drawer open onClose={onClose} width={520} label={`${candidate.name} — outreach detail`}>
      <div className="shrink-0 flex items-start gap-3 px-5 pt-4 pb-3 border-b border-[var(--beige-400)]">
        <Avatar name={candidate.name} size={36} tone={candidate.avatarTone} />
        <div className="flex-1 min-w-0">
          <div className="text-base font-medium text-[var(--fg1)] truncate">{candidate.name}</div>
          <div className="text-xs text-[var(--fg3)] truncate">{candidate.title} · {candidate.company}</div>
        </div>
        <Badge variant={meta.tone as any} size="md">{meta.label}</Badge>
        <IconButton icon={<X size={15} />} aria-label="Close" onClick={onClose} />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
        <div className="text-sm text-[var(--fg2)] mb-4 leading-[20px]">{meta.means}</div>

        <LabelText className="mb-1.5">Where this stands</LabelText>
        <div className="mb-5">
          <Row label="Waiting on">
            {a.kind === 'waiting' ? (
              <>
                {WAITING_ON[record.state] ?? 'A clock'}
                <div className="text-xs text-[var(--fg3)] mt-0.5">{a.label}</div>
              </>
            ) : a.kind === 'human' ? 'You. Nothing moves until you decide.'
              : 'Nothing. This one is finished.'}
          </Row>
          <Row label="Next step">
            <span className={cx(a.kind === 'waiting' ? 'text-[var(--fg1)]' : 'text-[var(--fg2)]')}>
              {a.kind === 'waiting' ? untilLabel(record.nextAt) : 'Not on a timer'}
            </span>
          </Row>
          <Row label="Sequence">
            {record.step} of {record.totalSteps} steps sent
            <span className="text-[var(--fg3)]">
              {halted
                ? ' · remaining steps cancelled'
                : record.totalSteps - record.step > 0
                  ? ` · ${record.totalSteps - record.step} still to go`
                  : ' · nothing left to send'}
            </span>
          </Row>
          <Row label="Sender">
            <span className="inline-flex items-center gap-1.5">
              {sender?.channel === 'linkedin'
                ? <LinkedinLogo size={13} className="text-[var(--fg3)]" />
                : <EnvelopeSimple size={13} className="text-[var(--fg3)]" />}
              {sender?.handle ?? 'Unassigned'}
              {sender && !sender.connected && (
                <span className="text-xs text-[var(--error-text)]">· disconnected</span>
              )}
            </span>
          </Row>
          <Row label="Last activity">
            <span className="text-[var(--fg2)]">{record.lastActivity}</span>
          </Row>
          {(booked || proposed?.length) && (
            <Row label="Call">
              {booked
                ? <>{booked.yours} <span className="text-[var(--fg3)]">· {booked.theirs} their time</span></>
                : `${proposed!.length} times sent, none picked yet`}
            </Row>
          )}
        </div>

        <LabelText className="mb-1.5">
          Messages · {record.messages.length}
        </LabelText>
        <div className="space-y-2">
          {record.messages.map((m, i) => (
            <div
              key={i}
              className={cx(
                'rounded-lg border p-3',
                m.draft
                  ? 'border-[var(--ai-magic-border)] bg-[var(--ai-magic-bg-subtle)]'
                  : m.direction === 'in'
                    ? 'border-[var(--border-color)] bg-[var(--bg3)]'
                    : 'border-[var(--beige-400)] bg-[var(--bg3)]',
              )}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                {m.draft
                  ? <Sparkle size={12} weight="fill" className="text-[var(--ai-magic-text)]" />
                  : m.direction === 'in'
                    ? <ArrowDown size={12} weight="bold" className="text-[var(--fg3)]" />
                    : <ArrowUp size={12} weight="bold" className="text-[var(--fg3)]" />}
                <span className={cx(
                  'text-xs font-bold uppercase tracking-[1.2px]',
                  m.draft ? 'text-[var(--ai-magic-text)]' : 'text-[var(--fg3)]',
                )}>
                  {m.draft ? 'Drafted by Ema · not sent' : m.direction === 'in' ? 'From them' : 'Sent'}
                </span>
                <div className="flex-1" />
                <span className="text-xs text-[var(--fg3)]">
                  {CHANNEL_LABEL[m.channel]} · {m.at}
                </span>
              </div>
              {m.subject && (
                <div className="text-sm font-medium text-[var(--fg1)] mb-1">{m.subject}</div>
              )}
              <div className="text-sm text-[var(--fg2)] whitespace-pre-line leading-[20px]">{m.body}</div>
            </div>
          ))}
          {!record.messages.length && (
            <div className="text-sm text-[var(--fg3)]">Nothing has been sent yet.</div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-[var(--beige-400)] px-5 py-3 flex items-center gap-2 flex-wrap">
        {a.primary && (
          <Button size="sm" onClick={() => onAction(record, a.primary!.id)}>{a.primary.label}</Button>
        )}
        {a.secondary && (
          <Button size="sm" variant="secondary" color="altBrand"
            onClick={() => onAction(record, a.secondary!.id)}>
            {a.secondary.label}
          </Button>
        )}
        {onJump && (
          <Button size="sm" variant="ghost" color="altBrand" iconRight={<ArrowRight size={13} />} onClick={onJump}>
            Decide in the queue
          </Button>
        )}
        {!a.primary && !a.secondary && !onJump && (
          <span className="text-xs text-[var(--fg3)]">
            Nothing for you to do here — this is a read-only view of what Ema is doing.
          </span>
        )}
      </div>
    </Drawer>
  );
}
