import React from 'react';
import { X, XCircle, Warning, Info, EnvelopeSimple, LinkedinLogo } from '@phosphor-icons/react';
import { Button, IconButton, Modal, cx } from '../components/ui';
import { useStore } from '../store';

/**
 * Start outreach never fires immediately. This is a resolvable checklist —
 * every blocker gets a decision, and the primary button restates the real
 * number rather than the number selected.
 */
export function PreflightSheet({
  open, onClose, candidateIds, onConfirm,
}: {
  open: boolean; onClose: () => void; candidateIds: string[];
  onConfirm: (ids: string[]) => void;
}) {
  const { candidates, dailyLimit, setDailyLimit, senders } = useStore();
  const [noEmailChoice, setNoEmailChoice] = React.useState<'skip' | 'linkedin'>('linkedin');
  const [recentChoice, setRecentChoice] = React.useState<'skip' | 'anyway'>('skip');

  const people = candidates.filter((c) => candidateIds.includes(c.id));

  const doNotContact = people.filter((c) => c.signals.some((s) => s.kind === 'do-not-contact'));
  const currentEmployees = people.filter((c) => c.signals.some((s) => s.kind === 'current-employee'));
  const noEmail = people.filter((c) => !c.email && !c.signals.some((s) => s.kind === 'current-employee'));
  const duplicates = people.filter((c) => c.signals.some((s) => s.kind === 'duplicate'));

  const blocked = new Set([...doNotContact, ...currentEmployees].map((c) => c.id));
  if (noEmailChoice === 'skip') noEmail.forEach((c) => blocked.add(c.id));
  if (recentChoice === 'skip') duplicates.forEach((c) => blocked.add(c.id));

  const eligible = people.filter((c) => !blocked.has(c.id));
  const todayCount = Math.min(eligible.length, dailyLimit);
  const tomorrowCount = Math.max(0, eligible.length - dailyLimit);

  const emailSender = senders.find((s) => s.channel === 'email' && s.connected);
  const liSender = senders.find((s) => s.channel === 'linkedin' && s.connected);

  if (!open) return null;

  const Line = ({
    tone, icon, children,
  }: { tone: 'block' | 'warn' | 'info'; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className={cx(
      'flex items-start gap-2.5 px-3 py-2.5 rounded-md border text-sm',
      tone === 'block' ? 'bg-[var(--error-bg-subtle)] border-[var(--error-border)] text-[var(--error-text)]'
        : tone === 'warn' ? 'bg-[var(--warning-bg-subtle)] border-[var(--warning-border)] text-[var(--warning-text)]'
        : 'bg-[var(--beige-100)] border-[var(--beige-400)] text-[var(--fg1)]',
    )}>
      <span className="shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );

  const Choice = ({
    value, active, onClick, children,
  }: { value: string; active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 cursor-pointer text-sm">
      <span className={cx(
        'size-3.5 rounded-full border flex items-center justify-center shrink-0',
        active ? 'border-[var(--brand-primary)]' : 'border-[var(--beige-600)]',
      )}>
        {active && <span className="size-1.5 rounded-full bg-[var(--brand-primary)]" />}
      </span>
      {children}
    </button>
  );

  return (
    <Modal label="Start outreach" open={open} onClose={onClose} width={560}>
      <div className="flex items-start gap-3 px-5 pt-4 pb-3">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-[var(--fg1)]">Start outreach</h2>
          {/* The heading said 9 and the button said 8, with nothing between
              them accounting for the difference — both numbers were right and
              the arithmetic was invisible. It is stated once, here, and every
              other number on the screen is one of these three. */}
          <p className="text-sm text-[var(--fg2)] mt-0.5 tabular-nums">
            {people.length} selected
            {blocked.size > 0 && ` · ${blocked.size} skipped`}
            {' · '}
            <span className="font-medium text-[var(--fg1)]">{todayCount} will send today</span>
          </p>
        </div>
        <IconButton icon={<X size={16} />} onClick={onClose} title="Close" />
      </div>

      <div className="px-5 pb-4 space-y-2 overflow-y-auto">
        {doNotContact.length > 0 && (
          <Line tone="block" icon={<XCircle size={15} weight="bold" />}>
            <span className="font-medium">{doNotContact.length} on the do-not-contact list.</span>{' '}
            Removed — this cannot be overridden.
          </Line>
        )}

        {currentEmployees.length > 0 && (
          <Line tone="block" icon={<XCircle size={15} weight="bold" />}>
            <span className="font-medium">
              {currentEmployees.length} current employee{currentEmployees.length === 1 ? '' : 's'}
              {' '}({currentEmployees.map((c) => c.name).join(', ')}).
            </span>{' '}
            Removed — route these through internal mobility instead.
          </Line>
        )}

        {noEmail.length > 0 && (
          <Line tone="warn" icon={<Warning size={15} weight="bold" />}>
            <div className="font-medium">{noEmail.length} have no email on file.</div>
            <div className="flex items-center gap-4 mt-1.5">
              <Choice value="linkedin" active={noEmailChoice === 'linkedin'} onClick={() => setNoEmailChoice('linkedin')}>
                Send LinkedIn only
              </Choice>
              <Choice value="skip" active={noEmailChoice === 'skip'} onClick={() => setNoEmailChoice('skip')}>
                Skip
              </Choice>
            </div>
          </Line>
        )}

        {duplicates.length > 0 && (
          <Line tone="warn" icon={<Warning size={15} weight="bold" />}>
            <div className="font-medium">
              {duplicates.length} contacted in the last 90 days by Daniel Okafor.
            </div>
            <div className="text-xs mt-0.5 opacity-90">Search: Staff Backend — EMEA</div>
            <div className="flex items-center gap-4 mt-1.5">
              <Choice value="skip" active={recentChoice === 'skip'} onClick={() => setRecentChoice('skip')}>
                Skip
              </Choice>
              <Choice value="anyway" active={recentChoice === 'anyway'} onClick={() => setRecentChoice('anyway')}>
                Contact anyway
              </Choice>
            </div>
          </Line>
        )}

        <Line tone="info" icon={<Info size={15} weight="bold" />}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">Daily candidate limit is {dailyLimit} for this search.</div>
              <div className="text-[var(--fg2)] mt-0.5">
                {tomorrowCount > 0
                  ? `${todayCount} send today, ${tomorrowCount} tomorrow at 09:00.`
                  : `All ${todayCount} send today.`}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setDailyLimit(Math.max(1, dailyLimit - 5))}
                className="size-6 rounded-xs border border-[var(--beige-500)] bg-white text-[var(--fg2)] hover:border-[var(--focus-border)] cursor-pointer">−</button>
              <span className="w-7 text-center text-sm font-bold tabular-nums">{dailyLimit}</span>
              <button onClick={() => setDailyLimit(Math.min(50, dailyLimit + 5))}
                className="size-6 rounded-xs border border-[var(--beige-500)] bg-white text-[var(--fg2)] hover:border-[var(--focus-border)] cursor-pointer">+</button>
            </div>
          </div>
        </Line>

        <Line tone="info" icon={<Info size={15} weight="bold" />}>
          <div className="font-medium">Sending as</div>
          <div className="mt-1 space-y-1 text-[var(--fg2)] text-xs">
            <div className="flex items-center gap-1.5">
              <EnvelopeSimple size={12} /> {emailSender?.handle} — {emailSender?.usedToday}/{emailSender?.dailyCap} today
            </div>
            <div className="flex items-center gap-1.5">
              <LinkedinLogo size={12} /> {liSender?.name} — {liSender?.usedToday}/{liSender?.dailyCap} invites this week
              {liSender && liSender.usedToday >= liSender.dailyCap - 2 && (
                <span className="text-[var(--warning-text)] font-medium">· near the cap</span>
              )}
            </div>
          </div>
        </Line>
      </div>

      <div className="flex items-center gap-2 px-5 py-3 border-t border-[var(--beige-300)] shrink-0">
        <span className="text-xs text-[var(--fg3)] flex-1">
          Ema stops all follow-ups the moment someone replies.
        </span>
        <Button variant="secondary" color="altBrand" onClick={() => onConfirm(eligible.map((c) => c.id))}>
          Review drafts first ({eligible.length})
        </Button>
        <Button disabled={todayCount === 0} onClick={() => onConfirm(eligible.map((c) => c.id))}>
          {/* Resolving a blocker changes nothing on the blocker itself — the
              only place the decision lands is this number, at the far corner
              from the radio you just pressed. Re-keyed so it replays. */}
          Start outreach for{' '}
          <span key={todayCount} className="inline-block tabular-nums animate-[emaPop_200ms_var(--ease-out-quint)_backwards]">
            {todayCount}
          </span>
          {' '}today
        </Button>
      </div>
    </Modal>
  );
}
