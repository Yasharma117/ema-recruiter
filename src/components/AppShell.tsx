import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  MagnifyingGlass, UsersThree, PaperPlaneTilt, PlugsConnected, Gear, ChatText,
  SidebarSimple, Bell, Question, CaretRight, ArrowCounterClockwise, FileText,
} from '@phosphor-icons/react';
import { Avatar, IconButton, cx } from './ui';
import { nextAction } from '../lib/outreach';
import { useStore } from '../store';
import { LayoutPicker } from '../layouts/LayoutPicker';
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

function Sidebar({ collapsed, onToggle, screen }: { collapsed: boolean; onToggle: () => void; screen?: ScreenId }) {
  const { outreach } = useStore();
  const w = collapsed ? 72 : 240;
  // Count what is waiting on a person, not the total — a badge should mean "act".
  const needsYou = outreach.filter((r) => nextAction(r).kind === 'human').length;
  // Both badges count work waiting on a person, not totals.
  const drafts = outreach.filter((r) => r.messages.some((m) => m.draft)).length;
  const badges: Record<string, number> = { '/outreach': needsYou, '/messages': drafts };
  return (
    <aside
      aria-label="Primary"
      className="shrink-0 h-full bg-[var(--beige-50)] border-r border-[var(--beige-300)] flex flex-col transition-[width] duration-200 ease-[var(--ease-out-quint)]"
      style={{ width: w }}
    >
      <div className={cx(
        'h-14 flex items-center border-b border-[var(--beige-300)] shrink-0',
        collapsed ? 'justify-center px-0' : 'justify-between px-4',
      )}>
        <img src={collapsed ? '/logo-mark.svg' : '/logo.svg'} alt="Ema" height={collapsed ? 24 : 22} style={{ height: collapsed ? 24 : 22 }} />
        {!collapsed && <IconButton icon={<SidebarSimple size={16} />} onClick={onToggle} title="Collapse sidebar" />}
      </div>

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
                <Icon size={18} weight={isActive ? 'bold' : 'regular'} className={isActive ? 'text-[var(--brand-primary)]' : 'text-[var(--fg3)]'} />
                {!collapsed && <span className="flex-1">{label}</span>}
                {!collapsed && badges[to] > 0 && (
                  <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-pill bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] text-xs font-bold tabular-nums">
                    {badges[to]}
                  </span>
                )}
                {collapsed && badges[to] > 0 && (
                  <span className="absolute top-1.5 right-4 size-2 rounded-full bg-[var(--brand-primary)]" />
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

      {screen && !collapsed && (
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
  breadcrumbs, title, actions, children, onExpandSidebar, screen,
}: {
  breadcrumbs?: string[]; title?: string; actions?: React.ReactNode;
  children: React.ReactNode; onExpandSidebar?: () => void;
  /** Enables the A/B/C layout picker and the usage overlay for this screen. */
  screen?: ScreenId;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const { resetDemo } = useStore();
  const loc = useLocation();

  // Collapse the sidebar on the compare-heavy candidate screen at narrow widths.
  React.useEffect(() => { onExpandSidebar?.(); }, [loc.pathname]);

  return (
    <div className="flex h-full">
      {/* First tab stop on every page: 18 nav stops otherwise. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[80] focus:px-3 focus:py-2 focus:rounded-md focus:bg-white focus:border focus:border-[var(--focus-border)] focus:text-sm focus:font-medium focus:text-[var(--fg1)] focus:shadow-[var(--shadow-md)]"
      >
        Skip to content
      </a>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} screen={screen} />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 shrink-0 flex items-center gap-3.5 px-5 bg-[var(--beige-50)] border-b border-[var(--beige-300)]">
          {collapsed && <IconButton icon={<SidebarSimple size={16} />} onClick={() => setCollapsed(false)} title="Expand sidebar" />}
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
            <IconButton icon={<Bell size={16} />} title="Notifications" />
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
        <main id="main" tabIndex={-1} className="flex-1 min-h-0 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
