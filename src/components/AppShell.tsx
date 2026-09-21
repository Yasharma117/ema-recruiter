import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  MagnifyingGlass, UsersThree, PaperPlaneTilt, PlugsConnected, Gear, ChatText,
  SidebarSimple, Question, CaretRight, ArrowCounterClockwise, FileText, CaretDoubleLeft,
} from '@phosphor-icons/react';
import { Avatar, IconButton, cx } from './ui';
import { nextAction } from '../lib/outreach';
import { useStore } from '../store';
import { NotificationAlert, NotificationBell } from './Notifications';
import { LayoutPicker, useMode, type Mode } from '../layouts/LayoutPicker';
import type { ScreenId } from '../layouts/usage';

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

function Sidebar({
  collapsed, onToggle, onHide, screen, mode,
}: {
  collapsed: boolean; onToggle: () => void; onHide: () => void;
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
  return (
    <aside
      aria-label="Primary"
      /* The width snaps. Easing it animated layout — 200ms of the whole page
         re-flowing beside a table, on the one control where an instant answer
         is the better answer anyway: you pressed it, and the labels inside
         appear and disappear outright regardless, so the eased width was
         sliding a rail around content that had already finished changing. */
      className="relative shrink-0 h-full bg-[var(--beige-50)] border-r border-[var(--beige-300)] flex flex-col"
      style={{ width: w }}
    >
      <div className={cx(
        'h-14 flex items-center border-b border-[var(--beige-300)] shrink-0',
        collapsed ? 'justify-center px-0' : 'justify-between px-4',
      )}>
        {/* The mark is the way back to the overview, from either section. */}
        <NavLink to="/" title="Overview" className="inline-flex rounded-sm">
          <img src={collapsed ? '/logo-mark.svg' : '/logo.svg'} alt="Ema" height={collapsed ? 24 : 22} style={{ height: collapsed ? 24 : 22 }} />
        </NavLink>
        {!collapsed && <IconButton icon={<SidebarSimple size={16} />} onClick={onToggle} title="Collapse to icons" />}
      </div>

      {collapsed && (
        <div className="flex items-center justify-center gap-0.5 pt-2 pb-1 shrink-0">
          <IconButton icon={<SidebarSimple size={14} />} onClick={onToggle} title="Expand sidebar" className="size-7" />
          <IconButton icon={<CaretDoubleLeft size={13} />} onClick={onHide} title="Hide sidebar" className="size-7" />
        </div>
      )}

      <nav className="p-3 flex-1 overflow-y-auto">
        {!collapsed && <div className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)] px-2.5 pt-2 pb-1">Recruiter</div>}
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} title={collapsed ? label : undefined}
            className={({ isActive }) => cx(
              'flex items-center gap-3 rounded-md mb-0.5 text-sm transition-colors duration-150 relative',
              collapsed ? 'h-10 justify-center' : 'px-2.5 py-2',
              isActive ? 'bg-[var(--beige-200)] text-[var(--fg1)] font-medium' : 'text-[var(--fg2)] hover:bg-[var(--beige-100)]',
            )}>
            {({ isActive }) => (
              <>
                <span className="relative inline-flex shrink-0">
                  <Icon size={18} weight={isActive ? 'bold' : 'regular'} className={isActive ? 'text-[var(--brand-primary)]' : 'text-[var(--fg3)]'} />
                  {collapsed && badges[to] > 0 && (
                    <span
                      key={to === '/outreach' && urgent ? 'urgent' : 'calm'}
                      className={cx(
                        'absolute -top-1 -right-1.5 size-2.5 rounded-full ring-2 ring-[var(--beige-50)]',
                        to === '/outreach' && urgent
                          ? 'bg-[var(--warning)] animate-[emaPop_200ms_var(--ease-out-quint)]'
                          : 'bg-[var(--brand-primary)]',
                      )}
                    />
                  )}
                </span>
                {!collapsed && <span className="flex-1">{label}</span>}
                {!collapsed && badges[to] > 0 && (
                  // Keyed on the tone so the badge remounts — and so plays its
                  // one entrance — at the moment urgency arrives, and not again.
                  <span
                    key={to === '/outreach' && urgent ? 'urgent' : 'calm'}
                    className={cx(
                      'inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-pill text-xs font-bold tabular-nums',
                      to === '/outreach' && urgent
                        ? 'bg-[var(--warning-bg)] text-[var(--warning-text)] border border-[var(--warning-border)] animate-[emaPop_200ms_var(--ease-out-quint)]'
                        : 'bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]',
                    )}
                  >
                    {badges[to]}
                  </span>
                )}
                {!collapsed && to === '/outreach' && urgent && (
                  <span className="sr-only">, needs attention</span>
                )}
                {!collapsed && isActive && !badges[to] && <span className="size-1.5 rounded-full bg-[var(--brand-primary)]" />}
              </>
            )}
          </NavLink>
        ))}

        {!collapsed && <div className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)] px-2.5 pt-5 pb-1">Workspace</div>}
        {collapsed && <div className="h-px bg-[var(--beige-300)] my-3 mx-2" />}
        {NAV_SECONDARY.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} title={collapsed ? label : undefined}
            className={({ isActive }) => cx(
              'flex items-center gap-3 rounded-md mb-0.5 text-sm transition-colors duration-150',
              collapsed ? 'h-10 justify-center' : 'px-2.5 py-2',
              isActive ? 'bg-[var(--beige-200)] text-[var(--fg1)] font-medium' : 'text-[var(--fg2)] hover:bg-[var(--beige-100)]',
            )}>
            <Icon size={18} className="text-[var(--fg3)]" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {mode === 'variants' && screen && !collapsed && (
        <div className="px-3 pb-3 pt-2 border-t border-[var(--beige-300)] shrink-0">
          <div className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)] mb-1.5">Layout</div>
          <LayoutPicker screen={screen} />
        </div>
      )}

      {!collapsed && (
        <div className="px-3 pb-3 pt-2 border-t border-[var(--beige-300)] shrink-0">
          <div className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)] mb-1.5">Docs</div>
          {['NOTES.md', 'LAYOUTS.md'].map((f) => (
            <NavLink key={f} to={`/docs/${f}`}
              className={({ isActive }) => cx(
                'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150',
                isActive ? 'bg-[var(--beige-200)] text-[var(--fg1)] font-medium' : 'text-[var(--fg2)] hover:bg-[var(--beige-100)]',
              )}>
              <FileText size={16} className="text-[var(--fg3)]" />
              {f}
            </NavLink>
          ))}
        </div>
      )}

      <div className={cx('border-t border-[var(--beige-300)] flex items-center gap-2.5 shrink-0', collapsed ? 'justify-center py-3' : 'p-3')}>
        <Avatar name="Sarah Chen" size={28} tone="green" />
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-[var(--fg1)] truncate leading-4">Sarah Chen</div>
            <div className="text-xs text-[var(--fg3)] truncate leading-4">Talent, Risk Platform</div>
          </div>
        )}
      </div>
    </aside>
  );
}

export function AppShell({
  breadcrumbs, title, actions, children, onExpandSidebar, screen, chrome = 'on',
}: {
  breadcrumbs?: string[]; title?: string; actions?: React.ReactNode;
  children: React.ReactNode; onExpandSidebar?: () => void;
  /** Enables the A/B/C layout picker and the usage overlay for this screen. */
  screen?: ScreenId;
  /**
   * 'hidden' drops the nav and header entirely — for a cold start that owns the
   * whole viewport. 'enter' is the same chrome as 'on', animated in once, for
   * the moment a screen earns its navigation back.
   */
  chrome?: 'on' | 'hidden' | 'enter';
}) {
  /** full → icons → hidden. Hiding is a real state: a demo gets screenshotted. */
  const [nav, setNav] = React.useState<'full' | 'icons' | 'hidden'>('full');
  const collapsed = nav === 'icons';
  const { resetDemo } = useStore();
  const loc = useLocation();
  const mode = useMode();

  // Collapse the sidebar on the compare-heavy candidate screen at narrow widths.
  React.useEffect(() => { onExpandSidebar?.(); }, [loc.pathname]);

  if (chrome === 'hidden') {
    return <main id="main" className="h-full overflow-hidden">{children}</main>;
  }

  return (
    <div className="flex h-full">
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
      {nav === 'hidden' && (
        <IconButton
          icon={<SidebarSimple size={16} />}
          onClick={() => setNav('full')}
          title="Show sidebar"
          className="fixed left-2.5 top-2.5 z-50 bg-white border border-[var(--beige-400)] shadow-[var(--shadow-sm)]"
        />
      )}
      <div className={cx('contents', nav === 'hidden' && 'hidden', chrome === 'enter' && cx(
        '[&>aside]:animate-[emaFade_200ms_var(--ease-out-quint)_backwards]',
        '[&>aside>*]:animate-[emaSlideL_260ms_var(--ease-out-quint)_backwards]',
      ))}>
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setNav(collapsed ? 'full' : 'icons')}
          onHide={() => setNav('hidden')}
          screen={screen}
          mode={mode}
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <header className={cx(
          'h-14 shrink-0 flex items-center gap-3.5 px-5 bg-[var(--beige-50)] border-b border-[var(--beige-300)]',
          chrome === 'enter' && 'animate-[emaIn_200ms_var(--ease-out-quint)_60ms_backwards]',
        )}>
          {collapsed && <IconButton icon={<SidebarSimple size={16} />} onClick={() => setNav('full')} title="Expand sidebar" />}
          {nav === 'hidden' && <span className="w-7 shrink-0" aria-hidden />}
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
              <h1 className="text-lg font-medium text-[var(--fg1)] truncate">{title}</h1>
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
