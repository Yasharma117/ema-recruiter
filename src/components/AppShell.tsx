import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  MagnifyingGlass, UsersThree, PaperPlaneTilt, PlugsConnected, Gear, ChatText,
  SidebarSimple, Question, CaretRight, ArrowCounterClockwise, FileText,
} from '@phosphor-icons/react';
import { Avatar, IconButton, cx } from './ui';
import { nextAction } from '../lib/outreach';
import { useStore } from '../store';
import { NotificationAlert, NotificationBell } from './Notifications';
import { LayoutPicker, useMode, type Mode } from '../layouts/LayoutPicker';
import type { ScreenId } from '../layouts/usage';

/**
 * The rail's own state, kept outside React.
 *
 * Every screen renders its own AppShell, so each navigation unmounts this
 * component and mounts a new one — which reset the rail to full width on every
 * click. Collapsing it was therefore something you had to do again on each
 * page, which is the same module-cache-plus-sessionStorage shape `useMode`
 * already uses in LayoutPicker for exactly this reason.
 */
type NavState = 'full' | 'icons';
const NAV_KEY = 'ema.nav';
let navCached: NavState | null = null;

function readNav(): NavState {
  if (navCached) return navCached;
  try {
    const v = sessionStorage.getItem(NAV_KEY);
    if (v === 'full' || v === 'icons') navCached = v;
  } catch { /* private window — the module cache still works */ }
  return navCached ?? 'full';
}

function writeNav(v: NavState) {
  navCached = v;
  try { sessionStorage.setItem(NAV_KEY, v); } catch { /* see readNav */ }
}

const NAV = [
  { to: '/search', icon: MagnifyingGlass, label: 'Searches' },
  { to: '/candidates', icon: UsersThree, label: 'Candidates' },
  { to: '/outreach', icon: PaperPlaneTilt, label: 'Outreach' },
  { to: '/messages', icon: ChatText, label: 'Messages' },
];

const NAV_SECONDARY = [
  { to: '/integrations', icon: PlugsConnected, label: 'Integrations' },
  { to: '/settings', icon: Gear, label: 'Settings' },
];

/**
 * IconButton's beige hovers are invisible on the rail, and its --fg2 ink is
 * 1.6:1 there. Same geometry, rail palette.
 */
function RailIconButton({
  icon, onClick, title, className,
}: { icon: React.ReactNode; onClick?: () => void; title: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cx(
        'inline-flex items-center justify-center size-9 rounded-sm shrink-0 cursor-pointer',
        'text-[var(--rail-fg)] hover:text-[var(--white)] hover:bg-[var(--rail-hover)]',
        'active:bg-[rgba(255,255,255,0.12)] transition-colors duration-150',
        className,
      )}
    >
      {icon}
    </button>
  );
}

function Sidebar({
  collapsed, onToggle, screen, mode,
}: {
  collapsed: boolean; onToggle: () => void;
  screen?: ScreenId; mode: Mode;
}) {
  const { outreach, notifications } = useStore();
  // The ambient half of the notification model. The count already said "there
  // is work"; urgency says "some of it arrived without you, and it is here".
  const urgent = notifications.some((n) => !n.read);
  const w = collapsed ? 72 : 240;
  // Count what is waiting on a person, not the total — a badge should mean "act".
  const needsYou = outreach.filter((r) => nextAction(r).kind === 'human').length;
  // Both badges count work waiting on a person, not totals.
  const drafts = outreach.filter((r) => r.messages.some((m) => m.draft)).length;
  const badges: Record<string, number> = { '/outreach': needsYou, '/messages': drafts };

  /* Outreach is a dot, not a count.
     A number there answered "how many", which is a question the queue itself
     answers the moment you open it. What the rail is for is "has something
     changed that I need to look at now" — one bit, so one dot, and yellow
     because that is the colour this product already uses for waiting work.
     Messages keeps its number: a draft count is a size you act on in bulk.

     The dot has to know its ground. Bright yellow is 10.2:1 on the rail and
     1.53:1 on the white pill of the selected row, which is exactly why the
     selected state looked washed out — so the fill darkens and the ring
     follows the surface underneath it rather than always punching rail. */
  const dotOnly = (to: string) => to === '/outreach';
  const dotTone = (active: boolean) => (active
    ? 'bg-[var(--yellow-930)] ring-[var(--rail-sel-bg)]'   /* 4.5:1 on white */
    : 'bg-[var(--yellow-800)] ring-[var(--rail-base)]');   /* 10.2:1 on rail */
  return (
    <aside
      aria-label="Primary"
      /* The width snaps. Easing it animated layout — 200ms of the whole page
         re-flowing beside a table, on the one control where an instant answer
         is the better answer anyway: you pressed it, and the labels inside
         appear and disappear outright regardless, so the eased width was
         sliding a rail around content that had already finished changing. */
      className="rail shrink-0 h-full flex flex-col rounded-lg overflow-hidden"
      style={{ width: w }}
    >
      <div className={cx(
        'h-14 flex items-center border-b border-[var(--rail-line)] shrink-0',
        collapsed ? 'justify-center px-0' : 'justify-between px-4',
      )}>
        {/* The mark is the way back to the overview, from either section. */}
        <NavLink to="/" title="Overview" className="inline-flex rounded-sm">
          <img src={collapsed ? '/logo-mark.svg' : '/logo.svg'} alt="Ema" height={collapsed ? 24 : 22} style={{ height: collapsed ? 24 : 22 }} className="rail-logo" />
        </NavLink>
        {!collapsed && <RailIconButton icon={<SidebarSimple size={16} />} onClick={onToggle} title="Collapse to icons" />}
      </div>

      {/* One control, and it is the way back out. Two buttons on a 72px rail
          made the narrow state feel like a settings panel. */}
      {collapsed && (
        <div className="flex items-center justify-center pt-2 pb-1 shrink-0">
          <RailIconButton icon={<SidebarSimple size={15} />} onClick={onToggle} title="Expand sidebar" className="size-8" />
        </div>
      )}

      <nav className="p-3 flex-1 overflow-y-auto">
        {!collapsed && <div className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--rail-fg-faint)] px-2.5 pt-2 pb-1">Recruiter</div>}
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} title={collapsed ? label : undefined}
            /* The rail is the one place in a table-dense product with room for
               colour, and it was carrying none: a beige pill on a beige rail on
               a beige page. The active row now sits in the brand's own tint with
               a green marker down its left edge, so "where am I" is answered by
               hue before it is answered by reading. */
            className={({ isActive }) => cx(
              'flex items-center gap-3 rounded-md mb-0.5 text-sm transition-colors duration-150 relative',
              collapsed ? 'size-10 mx-auto justify-center' : 'px-2.5 py-2',
              isActive
                ? 'bg-[var(--rail-sel-bg)] text-[var(--rail-sel-fg)] font-medium'
                : 'text-[var(--rail-fg)] hover:bg-[var(--rail-hover)] hover:text-[var(--white)]',
            )}>
            {({ isActive }) => (
              <>
                <span className="relative inline-flex shrink-0">
                  <Icon size={18} weight={isActive ? 'bold' : 'regular'} className={isActive ? 'text-[var(--rail-sel-fg)]' : 'text-[var(--rail-fg)]'} />
                  {collapsed && badges[to] > 0 && (
                    <span
                      key={to === '/outreach' && urgent ? 'urgent' : 'calm'}
                      className={cx(
                        'absolute -top-1 -right-1 size-2.5 rounded-full ring-2',
                        dotOnly(to)
                          ? dotTone(isActive)
                          : cx('bg-[var(--rail-fg)]', isActive ? 'ring-[var(--rail-sel-bg)]' : 'ring-[var(--rail-base)]'),
                        to === '/outreach' && urgent && 'animate-[emaPop_200ms_var(--ease-out-quint)]',
                      )}
                    />
                  )}
                </span>
                {!collapsed && <span className="flex-1">{label}</span>}
                {!collapsed && badges[to] > 0 && (
                  // Keyed on the tone so the badge remounts — and so plays its
                  // one entrance — at the moment urgency arrives, and not again.
                  dotOnly(to) ? (
                    <span
                      key={urgent ? 'urgent' : 'calm'}
                      className={cx(
                        'size-2.5 rounded-full ring-2 shrink-0',
                        dotTone(isActive),
                        urgent && 'animate-[emaPop_200ms_var(--ease-out-quint)]',
                      )}
                    />
                  ) : (
                    <span className={cx(
                      'inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-pill text-xs font-bold tabular-nums',
                      isActive
                        ? 'bg-[var(--rail-sel-fg)] text-[var(--rail-sel-bg)]'
                        : 'bg-[var(--rail-fg)] text-[var(--rail-base)]',
                    )}>
                      {badges[to]}
                    </span>
                  )
                )}
                {/* The dot replaced a number, so the number has to survive
                    somewhere: a marker with no text leaves a screen reader
                    hearing "Outreach" and nothing else. Rendered in both rail
                    widths, since the collapsed rail has no label either. */}
                {badges[to] > 0 && dotOnly(to) && (
                  <span className="sr-only">
                    , {badges[to]} waiting on you{urgent ? ', needs attention' : ''}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}

        {!collapsed && <div className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--rail-fg-faint)] px-2.5 pt-5 pb-1">Workspace</div>}
        {collapsed && <div className="h-px bg-[var(--rail-line)] my-3 mx-2" />}
        {NAV_SECONDARY.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} title={collapsed ? label : undefined}
            className={({ isActive }) => cx(
              'flex items-center gap-3 rounded-md mb-0.5 text-sm transition-colors duration-150',
              collapsed ? 'size-10 mx-auto justify-center' : 'px-2.5 py-2',
              isActive
                ? 'bg-[var(--rail-sel-bg)] text-[var(--rail-sel-fg)] font-medium'
                : 'text-[var(--rail-fg)] hover:bg-[var(--rail-hover)] hover:text-[var(--white)]',
            )}>
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-[var(--rail-sel-fg)]' : 'text-[var(--rail-fg)]'} />
                {!collapsed && <span>{label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {mode === 'variants' && screen && !collapsed && (
        <div className="px-3 pb-3 pt-2 border-t border-[var(--rail-line)] shrink-0">
          <div className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--rail-fg-faint)] mb-1.5">Layout</div>
          <LayoutPicker screen={screen} />
        </div>
      )}

      {!collapsed && (
        <div className="px-3 pb-3 pt-2 border-t border-[var(--rail-line)] shrink-0">
          <div className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--rail-fg-faint)] mb-1.5">Docs</div>
          {['NOTES.md', 'LAYOUTS.md'].map((f) => (
            <NavLink key={f} to={`/docs/${f}`}
              className={({ isActive }) => cx(
                'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150',
                isActive
                  ? 'bg-[var(--rail-sel-bg)] text-[var(--rail-sel-fg)] font-medium'
                  : 'text-[var(--rail-fg)] hover:bg-[var(--rail-hover)] hover:text-[var(--white)]',
              )}>
              {({ isActive }) => (
                <>
                  <FileText size={16} className={isActive ? 'text-[var(--rail-sel-fg)]' : 'text-[var(--rail-fg-faint)]'} />
                  {f}
                </>
              )}
            </NavLink>
          ))}
        </div>
      )}

      <div className={cx('border-t border-[var(--rail-line)] flex items-center gap-2.5 shrink-0', collapsed ? 'justify-center py-3' : 'p-3')}>
        <Avatar name="Sarah Chen" size={28} tone="railMark" />
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-[var(--rail-fg)] truncate leading-4">Sarah Chen</div>
            <div className="text-xs text-[var(--rail-fg-faint)] truncate leading-4">Talent, Risk Platform</div>
          </div>
        )}
      </div>
    </aside>
  );
}

export function AppShell({
  breadcrumbs, title, actions, children, screen, chrome = 'on',
}: {
  breadcrumbs?: string[]; title?: string; actions?: React.ReactNode;
  children: React.ReactNode;
  /** Enables the A/B/C layout picker and the usage overlay for this screen. */
  screen?: ScreenId;
  /**
   * 'hidden' drops the nav and header entirely — for a cold start that owns the
   * whole viewport. 'enter' is the same chrome as 'on', animated in once, for
   * the moment a screen earns its navigation back.
   */
  chrome?: 'on' | 'hidden' | 'enter';
}) {
  const [nav, setNavState] = React.useState<NavState>(readNav);
  const setNav = React.useCallback((v: NavState) => { setNavState(v); writeNav(v); }, []);
  const collapsed = nav === 'icons';
  const { resetDemo } = useStore();
  const loc = useLocation();
  const mode = useMode();

  if (chrome === 'hidden') {
    return <main id="main" className="h-full overflow-hidden">{children}</main>;
  }

  return (
    <div className="flex h-full gap-2 p-2 bg-[var(--app-frame)]">
      {/* First tab stop on every page: 18 nav stops otherwise. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[80] focus:px-3 focus:py-2 focus:rounded-md focus:bg-white focus:border focus:border-[var(--focus-border)] focus:text-sm focus:font-medium focus:text-[var(--fg1)] focus:shadow-[var(--shadow-md)]"
      >
        Skip to content
      </a>
      {/* The rail fades; its contents do the travelling. Sliding the <aside>
          itself leaves a sliver of page background at the left edge, because
          its layout width is reserved the moment it mounts. */}
      <div className={cx('contents', chrome === 'enter' && cx(
        '[&>aside]:animate-[emaFade_200ms_var(--ease-out-quint)_backwards]',
        '[&>aside>*]:animate-[emaSlideL_260ms_var(--ease-out-quint)_backwards]',
      ))}>
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setNav(collapsed ? 'full' : 'icons')}
          screen={screen}
          mode={mode}
        />
      </div>
      {/* The working area is its own panel, so the app reads as two objects on
          a surface rather than one edge-to-edge sheet. overflow-hidden is what
          makes the corners actually clip the header and the table inside. */}
      <div className="flex-1 min-w-0 flex flex-col rounded-lg border border-[var(--border-color)] bg-[var(--app-background)] overflow-hidden">
        <header className={cx(
          'h-14 shrink-0 flex items-center gap-3.5 px-5 bg-[var(--app-chrome)] border-b border-[var(--beige-400)]',
          chrome === 'enter' && 'animate-[emaIn_200ms_var(--ease-out-quint)_60ms_backwards]',
        )}>
          {collapsed && <IconButton icon={<SidebarSimple size={16} />} onClick={() => setNav('full')} title="Expand sidebar" />}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {breadcrumbs?.length ? (
              <div className="flex items-center gap-1.5 min-w-0">
                {breadcrumbs.map((b, i) => (
                  <React.Fragment key={b + i}>
                    {i > 0 && <CaretRight size={11} className="text-[var(--fg3)] shrink-0" />}
                    <span className={cx('text-[13px] truncate', i === breadcrumbs.length - 1 ? 'text-[var(--fg1)] font-medium' : 'text-[var(--fg2)]')}>
                      {b}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <h1 className="text-lg font-bold text-[var(--fg1)] truncate">{title}</h1>
            )}
            {/* Breadcrumbs render as spans, so the page still needs a real h1. */}
            {breadcrumbs?.length ? (
              <h1 className="sr-only">{breadcrumbs[breadcrumbs.length - 1]}</h1>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <NotificationBell />
            <IconButton icon={<Question size={16} />} title="Help" />
            {/* Replays the whole story from an empty draft — for walkthroughs. */}
            <IconButton
              icon={<ArrowCounterClockwise size={15} />}
              title="Reset the demo"
              onClick={resetDemo}
            />
            {actions}
          </div>
        </header>
        {/* Below the header, above the work: an event nobody asked for gets the
            full width, but never the keyboard and never the page. */}
        {/* Not on Outreach: the strip's whole call to action is "review this in
            outreach", and stacking it above that screen's own arrival banner
            makes two amber bars about two different people. The bell and the
            nav badge stay as the trail, and the record itself is on screen. */}
        {loc.pathname !== '/outreach' && <NotificationAlert />}
        <main id="main" tabIndex={-1} className="flex-1 min-h-0 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
