import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, CalendarBlank, CaretRight, X } from '@phosphor-icons/react';
import { useStore, type Notif } from '../store';
import { Avatar, Button, IconButton, cx } from './ui';

/**
 * The on-demand half of the notification model.
 *
 * The ambient half lives on the Outreach nav item, which turns warning-toned
 * while anything is unread — that is what you catch out of the corner of your
 * eye. This panel is what you open once you have. Nothing here opens itself,
 * takes focus, or covers the page: an event you did not cause has no right to
 * interrupt the thing you did.
 *
 * Read and done are different: opening the panel marks everything read and
 * settles the nav item, but the row stays until the record is actually acted
 * on, and the nav count keeps counting it either way. Someone who never opens
 * this is still served — the work never stops being counted.
 */
/**
 * What the notification is actually about, read from the record rather than
 * from the notification's own strings: who moved, from when, to when, and
 * whether the new time lands outside the recruiter's working day.
 *
 * Both surfaces render from this, so the strip and the panel row can never
 * describe the same event differently.
 */
function useEvent(candidateId: string) {
  const { candidates, outreach } = useStore();
  const record = outreach.find((r) => r.candidateId === candidateId);
  const candidate = candidates.find((c) => c.id === candidateId);
  return {
    candidate,
    from: record?.meeting?.previous,
    to: record?.meeting?.booked,
    note: record?.meeting?.changeNote,
  };
}

/** Old time struck through, new time in full. The change is the content. */
export function TimeChange({ from, to, size = 'sm' }: {
  from?: { yours: string }; to?: { yours: string; theirs: string; outsideCoreHours?: boolean };
  size?: 'sm' | 'xs';
}) {
  if (!to) return null;
  const text = size === 'sm' ? 'text-sm' : 'text-xs';
  return (
    <span className={cx('flex items-center gap-1.5 flex-wrap', text)}>
      {from && (
        <>
          <span className="text-[var(--fg3)] line-through">{from.yours}</span>
          <ArrowRight size={11} weight="bold" className="text-[var(--fg3)] shrink-0" />
        </>
      )}
      <span className="font-medium text-[var(--fg1)] tabular-nums">{to.yours}</span>
      {to.outsideCoreHours && (
        <span className="inline-flex items-center h-5 px-1.5 rounded-pill text-xs font-medium bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)]">
          Before your working day
        </span>
      )}
    </span>
  );
}

export function NotificationBell() {
  const { notifications, markNotificationsRead, setFocusCandidate } = useStore();
  const [open, setOpen] = React.useState(false);
  const nav = useNavigate();
  // IconButton does not forward refs, and ui.tsx is not ours to change — the
  // wrapper is close enough to get focus back where it came from.
  const wrap = React.useRef<HTMLSpanElement>(null);
  const panel = React.useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;

  /* Assistive tech hears the arrival the same moment the dot appears — polite,
     so it waits for the user to finish what they were reading. */
  const latest = notifications[0];
  const [announced, setAnnounced] = React.useState('');
  const seen = React.useRef<number | null>(latest?.id ?? null);
  React.useEffect(() => {
    if (!latest || latest.id === seen.current) return;
    seen.current = latest.id;
    setAnnounced(
      `${latest.whileAway ? 'While you were away. ' : ''}${latest.title}. ${latest.detail}. In outreach.`,
    );
  }, [latest]);

  React.useEffect(() => {
    if (!open) return;
    markNotificationsRead();
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
      wrap.current?.querySelector('button')?.focus();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, markNotificationsRead]);

  const go = (candidateId: string) => {
    setFocusCandidate(candidateId);
    setOpen(false);
    nav(`/outreach?focus=${candidateId}`);
  };

  return (
    <span ref={wrap} className="relative inline-flex">
      <span aria-live="polite" className="sr-only">{announced}</span>

      <IconButton
        icon={<Bell size={16} />}
        onClick={() => setOpen((o) => !o)}
        active={open}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={unread ? `Notifications, ${unread} unread` : 'Notifications'}
      />
      {unread > 0 && (
        // Announces itself once, on the render where it appears, then holds
        // still. A badge that keeps moving is nagging on a screen kept open
        // all day.
        <span
          aria-hidden
          className={cx(
            'absolute -top-0.5 -right-0.5 size-2 rounded-full bg-[var(--warning)]',
            'ring-2 ring-[var(--beige-50)] animate-[emaPop_200ms_var(--ease-out-quint)]',
          )}
        />
      )}

      {open && (
        <>
          <span className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            ref={panel}
            role="dialog"
            aria-label="Notifications"
            tabIndex={-1}
            className={cx(
              'absolute right-0 top-full mt-2 z-50 w-[340px] bg-white rounded-xl outline-none',
              'border border-[var(--beige-400)] shadow-[var(--shadow-lg)] overflow-hidden',
              // Scales from the bell, not from its own centre — the panel came
              // from the thing you pressed.
              'origin-top-right animate-[emaPop_150ms_var(--ease-out-quint)]',
            )}
          >
            <div className="flex items-center justify-between px-3.5 h-10 border-b border-[var(--beige-400)]">
              <span className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--fg2)]">
                Notifications
              </span>
              <span className="text-xs text-[var(--fg3)] tabular-nums">{notifications.length}</span>
            </div>

            {notifications.length === 0 ? (
              <p className="px-3.5 py-5 text-xs text-[var(--fg3)]">
                Nothing new. Anything that changes from a candidate’s side lands here.
              </p>
            ) : (
              <ul className="max-h-[360px] overflow-y-auto">
                {notifications.map((n) => (
                  <li key={n.id} className="border-b border-[var(--beige-400)] last:border-b-0">
                    <button
                      onClick={() => go(n.candidateId)}
                      className={cx(
                        'w-full text-left flex items-start gap-2.5 px-3.5 py-3 cursor-pointer',
                        'transition-colors duration-150 ease-[var(--ease-out-quint)] hover:bg-[var(--beige-100)]',
                        // The panel clips its corners, which would clip the
                        // app's outer focus ring — so this one rings inward.
                        'focus-visible:bg-[var(--beige-100)]',
                        'focus-visible:[box-shadow:inset_0_0_0_2px_var(--focus-ring)]',
                      )}
                    >
                      <NotificationRow n={n} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </span>
  );
}

/** One event in the panel: who, what moved, and when it landed. */
function NotificationRow({ n }: { n: Notif }) {
  const { candidate, from, to } = useEvent(n.candidateId);
  return (
    <>
      {candidate
        ? <Avatar name={candidate.name} size={28} tone={candidate.avatarTone} />
        : <CalendarBlank size={16} className="text-[var(--warning-text)] mt-0.5 shrink-0" />}
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium text-[var(--fg1)] truncate">{n.title}</span>
          {!n.read && <span className="size-1.5 rounded-full bg-[var(--warning)] shrink-0" aria-label="Unread" />}
        </span>
        <span className="block mt-1"><TimeChange from={from} to={to} size="xs" /></span>
        <span className="block text-xs text-[var(--fg3)] mt-1">
          {/* The date is already in the line above; their clock is the new fact. */}
          {n.at}{to ? ` · ${to.theirs.split('·').pop()?.trim()} their time` : ''}
        </span>
      </span>
      <CaretRight size={12} className="text-[var(--fg3)] self-center shrink-0" />
    </>
  );
}

/** Event ids whose entrance has already played. Outlives the remount a route
 *  change causes, which a ref or a state flag would not. */
const entered = new Set<number>();

/**
 * The loud half of the notification model.
 *
 * A dot on a bell was not enough for a booked call moving to 06:30 without
 * anyone's agreement, so the event now takes a full-width strip under the
 * header the moment it lands: it says who, what, and what it costs you, and it
 * carries the one button that goes and deals with it.
 *
 * Loud once, then still. It plays a single entrance and never pulses, never
 * re-announces, and never takes focus — it renders where the caret is not, and
 * nothing in here calls focus(). Closing it is "I have seen this", not "this is
 * handled": the bell panel and the Outreach badge keep counting either way.
 */
export function NotificationAlert() {
  const { notifications, alertDismissed, dismissAlert, setFocusCandidate } = useStore();
  const nav = useNavigate();

  // The newest event whose strip has not been closed. Older ones are counted,
  // not stacked — five bars would be the interruption we are trying to avoid.
  const open = notifications.find((n) => !alertDismissed.includes(n.id));
  const alsoWaiting = open ? notifications.length - 1 : 0;

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismissAlert(open.id); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, dismissAlert]);

  // Each screen renders its own AppShell, so a navigation remounts this strip.
  // Without this it would re-announce itself on every page change, which is the
  // nagging we are trying not to do. The entrance belongs to the event, once.
  const fresh = !!open && !entered.has(open.id);
  React.useEffect(() => { if (open) entered.add(open.id); }, [open?.id]);

  // Hooks first, and unconditionally: an early return above this would change
  // the hook order on the render where the event lands.
  const { candidate, from, to } = useEvent(open?.candidateId ?? '');

  if (!open) return null;

  return (
    // The wrapper clips; the strip inside is what travels. Animating the
    // wrapper's height would be a layout animation, which is the one thing
    // that cannot run on the compositor.
    <div className="shrink-0 overflow-hidden bg-[var(--warning-bg-subtle)] border-b border-[var(--warning-border)]">
      <div className={cx('px-5 py-2.5', fresh && 'animate-[emaDrop_320ms_var(--ease-out-quint)_backwards]')}>
        <div className="max-w-[1180px] mx-auto flex items-center gap-3 bg-white border border-[var(--warning-border)] rounded-lg shadow-[var(--shadow-sm)] pl-3 pr-2 py-2.5">
          <span className="w-1 self-stretch rounded-full bg-[var(--warning)] shrink-0" aria-hidden />

          {candidate
            ? <Avatar name={candidate.name} size={32} tone={candidate.avatarTone} />
            : <CalendarBlank size={18} weight="bold" className="text-[var(--warning-text)] shrink-0" />}

          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-[var(--fg1)] truncate">
              {open.whileAway ? `While you were away · ${open.title}` : open.title}
            </div>
            <div className="mt-0.5"><TimeChange from={from} to={to} /></div>
          </div>

          {alsoWaiting > 0 && (
            <span className="text-xs text-[var(--fg3)] shrink-0 hidden lg:inline">
              {alsoWaiting} more in notifications
            </span>
          )}

          <Button
            size="sm"
            iconRight={<ArrowRight size={13} />}
            className="shrink-0"
            onClick={() => {
              setFocusCandidate(open.candidateId);
              dismissAlert(open.id);
              nav(`/outreach?focus=${open.candidateId}`);
            }}
          >
            Review in outreach
          </Button>
          <IconButton
            icon={<X size={14} />}
            onClick={() => dismissAlert(open.id)}
            title="Dismiss — it stays in notifications"
            className="shrink-0"
          />
        </div>
      </div>
    </div>
  );
}
