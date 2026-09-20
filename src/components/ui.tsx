// Primitives ported from the Ema UI kit (ui_kits/web_app/Primitives.jsx).
// Same size matrix and variant/color palette; inline styles converted to tokens.
import React from 'react';

export const cx = (...v: (string | false | null | undefined)[]) => v.filter(Boolean).join(' ');

/* ---------------------------------- Button --------------------------------- */

type BtnVariant = 'primary' | 'secondary' | 'ghost';
type BtnColor = 'brand' | 'altBrand' | 'aiMagic' | 'destructive';
type BtnSize = 'xs' | 'sm' | 'md' | 'lg';

const BTN_SIZE: Record<BtnSize, string> = {
  xs: 'h-6 px-2.5 text-xs rounded-xs gap-1',
  sm: 'h-7 px-3 text-xs rounded-sm gap-1.5',
  md: 'h-9 px-4 text-sm rounded-sm gap-1.5',
  lg: 'h-11 px-4 text-base rounded-md gap-2',
};

const BTN_PALETTE: Record<string, string> = {
  'primary/brand': 'bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] hover:bg-[var(--brand-primary-accent)] active:bg-[var(--brand-primary-active)]',
  'primary/altBrand': 'bg-[var(--beige-200)] text-[var(--beige-960)] hover:bg-[var(--beige-300)] active:bg-[var(--beige-400)]',
  'primary/aiMagic': 'bg-[var(--ai-magic)] text-white hover:bg-[var(--purple-900)] active:bg-[var(--purple-960)]',
  'primary/destructive': 'bg-[var(--error-bg-subtle)] text-[var(--error-text)] border border-[var(--error-border)] hover:bg-[var(--error-bg)] active:bg-[var(--red-300)]',
  'secondary/brand': 'bg-white text-[var(--fg1)] border border-[var(--beige-500)] hover:bg-[var(--beige-50)] active:bg-[var(--beige-200)]',
  'secondary/altBrand': 'bg-white text-[var(--beige-960)] border border-[var(--beige-500)] hover:bg-[var(--beige-100)] active:bg-[var(--beige-300)]',
  'secondary/aiMagic': 'bg-white text-[var(--ai-magic-text)] border border-[var(--ai-magic-border)] hover:bg-[var(--ai-magic-bg-subtle)] active:bg-[var(--ai-magic-bg)]',
  'secondary/destructive': 'bg-white text-[var(--error-text)] border border-[var(--error-border)] hover:bg-[var(--error-bg-subtle)] active:bg-[var(--error-bg)]',
  'ghost/brand': 'bg-transparent text-[var(--fg1)] hover:bg-[var(--beige-100)] active:bg-[var(--beige-300)]',
  'ghost/altBrand': 'bg-transparent text-[var(--fg2)] hover:bg-[var(--beige-100)] active:bg-[var(--beige-300)]',
  'ghost/aiMagic': 'bg-transparent text-[var(--ai-magic-text)] hover:bg-[var(--ai-magic-bg-subtle)] active:bg-[var(--ai-magic-bg)]',
  'ghost/destructive': 'bg-transparent text-[var(--error-text)] hover:bg-[var(--error-bg-subtle)] active:bg-[var(--error-bg)]',
};

/** In-button progress. A button that stays idle-looking after a click reads as broken. */
export function Spinner({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} className={cx('animate-spin shrink-0', className)}
      fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="8" cy="8" r="6" className="opacity-25" />
      <path d="M14 8a6 6 0 0 0-6-6" strokeLinecap="round" />
    </svg>
  );
}

export function Button({
  children, variant = 'primary', color = 'brand', size = 'md',
  icon, iconRight, block, loading, className, disabled, ...rest
}: {
  variant?: BtnVariant; color?: BtnColor; size?: BtnSize;
  icon?: React.ReactNode; iconRight?: React.ReactNode; block?: boolean;
  /** Swaps the leading icon for a spinner and blocks further clicks. */
  loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center font-bold whitespace-nowrap select-none',
        'transition-[background-color,border-color,color] duration-150 ease-[var(--ease-out-quint)]',
        BTN_SIZE[size],
        // Loading keeps the button's own colour: work in progress is not the
        // same state as "you cannot do this".
        disabled && !loading
          ? 'bg-[var(--beige-100)] text-[var(--beige-800)] border border-[var(--beige-300)] cursor-not-allowed hover:bg-[var(--beige-100)]'
          : BTN_PALETTE[`${variant}/${color}`] ?? BTN_PALETTE['primary/brand'],
        block && 'w-full',
        !(disabled || loading) && 'cursor-pointer',
        loading && 'cursor-wait',
        className,
      )}
    >
      {loading ? <Spinner size={size === 'lg' ? 16 : 13} /> : icon}
      {children}
      {iconRight}
    </button>
  );
}

export function IconButton({
  icon, size = 'sm', active, className, ...rest
}: { icon: React.ReactNode; size?: 'sm' | 'md' | 'lg'; active?: boolean } &
  React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const s = { sm: 'size-7 rounded-sm', md: 'size-9 rounded-sm', lg: 'size-11 rounded-md' }[size];
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex items-center justify-center shrink-0 transition-colors duration-150',
        'text-[var(--fg2)] hover:bg-[var(--beige-100)] hover:text-[var(--fg1)] active:bg-[var(--beige-300)]',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[var(--fg2)] disabled:active:bg-transparent',
        !rest.disabled && 'cursor-pointer',
        active && 'bg-[var(--beige-200)] text-[var(--fg1)]',
        s, className,
      )}
    >
      {icon}
    </button>
  );
}

/* ---------------------------------- Badge ---------------------------------- */

export type BadgeVariant =
  | 'default' | 'success' | 'error' | 'info' | 'warning' | 'pending' | 'muted' | 'magic';

// Semantic tokens throughout: a status badge is "success", not "green-900 on
// green-200". Changing what success looks like is then a one-line token edit.
const BADGE: Record<BadgeVariant, string> = {
  default: 'text-[var(--fg2)] border-[var(--border-color)] bg-[var(--bg3)]',
  success: 'text-[var(--success-text)] border-[var(--success-border)] bg-[var(--success-bg)]',
  error: 'text-[var(--error-text)] border-[var(--error-border)] bg-[var(--error-bg)]',
  info: 'text-[var(--info-text)] border-[var(--info-border)] bg-[var(--info-bg)]',
  warning: 'text-[var(--warning-text)] border-[var(--warning-border)] bg-[var(--warning-bg)]',
  pending: 'text-[var(--pending-text)] border-[var(--pending-border)] bg-[var(--pending-bg)]',
  muted: 'text-[var(--muted-text)] border-[var(--muted-border)] bg-[var(--muted-bg)]',
  magic: 'text-[var(--ai-magic-text)] border-[var(--ai-magic-border)] bg-[var(--ai-magic-bg)]',
};

export function Badge({
  children, variant = 'default', size = 'md', shape = 'pill', icon, className,
}: {
  children: React.ReactNode; variant?: BadgeVariant; size?: 'sm' | 'md' | 'lg';
  shape?: 'pill' | 'rounded'; icon?: React.ReactNode; className?: string;
}) {
  const s = { sm: 'h-5 text-xs', md: 'h-6 text-xs', lg: 'h-7 text-sm' }[size];
  return (
    <span className={cx(
      'inline-flex items-center gap-1 w-fit border font-medium whitespace-nowrap max-w-full',
      shape === 'pill' ? 'rounded-pill px-2' : 'rounded-sm px-1.5',
      s, BADGE[variant], className,
    )}>
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}

const DOT: Record<string, string> = {
  success: 'bg-[var(--success)]', pending: 'bg-[var(--pending)]',
  error: 'bg-[var(--error)]', info: 'bg-[var(--info)]',
  magic: 'bg-[var(--ai-magic)]', idle: 'bg-[var(--beige-700)]',
  warning: 'bg-[var(--warning)]', muted: 'bg-[var(--muted)]',
  default: 'bg-[var(--beige-700)]',
};

export function StatusDot({ tone = 'idle', className }: { tone?: string; className?: string }) {
  return <span className={cx('size-2 rounded-full shrink-0', DOT[tone] ?? DOT.idle, className)} />;
}

/* ---------------------------------- Avatar --------------------------------- */

export function Avatar({
  name, size = 28, tone = 'green', className,
}: { name: string; size?: number; tone?: 'green' | 'purple' | 'beige'; className?: string }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const tones = {
    green: 'bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]',
    purple: 'bg-[var(--ai-magic)] text-white',
    beige: 'bg-[var(--beige-300)] text-[var(--beige-960)]',
  };
  return (
    <span
      className={cx('inline-flex items-center justify-center rounded-full shrink-0 font-bold select-none', tones[tone], className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

/* ----------------------------------- Card ---------------------------------- */

export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cx('bg-white border border-[var(--beige-400)] rounded-lg', className)} />;
}

/* ---------------------------------- Input ---------------------------------- */

export function Input({
  icon, className, wrapClassName, ...rest
}: { icon?: React.ReactNode; wrapClassName?: string } &
  React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cx(
      'flex items-center gap-2 h-9 px-3 bg-white rounded-md border border-[var(--beige-500)]',
      'transition-[box-shadow,border-color] duration-150',
      // The wrapper is the focus target; the inner field suppresses its own ring.
      'focus-within:border-[var(--focus-border)] focus-within:shadow-focus',
      wrapClassName,
    )}>
      {icon && <span className="text-[var(--fg3)] shrink-0">{icon}</span>}
      <input
        {...rest}
        className={cx(
          'flex-1 min-w-0 bg-transparent border-0 outline-none text-sm text-[var(--fg1)]',
          'placeholder:text-[var(--fg3)] placeholder:font-normal focus-visible:shadow-none',
          className,
        )}
      />
    </div>
  );
}

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...rest}
      className={cx(
        'w-full bg-white rounded-md border border-[var(--beige-500)] px-3 py-2.5 text-sm text-[var(--fg1)]',
        'outline-none resize-y transition-shadow duration-150',
        'placeholder:text-[var(--fg3)]',
        'focus:border-[var(--focus-border)] focus:shadow-focus focus-visible:shadow-focus',
        className,
      )}
    />
  );
}

export function Checkbox({
  checked, indeterminate, onChange, className, label, disabled,
}: {
  checked: boolean; indeterminate?: boolean; onChange: (v: boolean) => void;
  className?: string; label?: string; disabled?: boolean;
}) {
  return (
    <button
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={cx(
        'size-4 rounded-xs border shrink-0 inline-flex items-center justify-center',
        'transition-colors duration-150',
        checked || indeterminate
          ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-[var(--brand-primary-foreground)] hover:bg-[var(--brand-primary-accent)] active:bg-[var(--brand-primary-active)]'
          : 'bg-white border-[var(--beige-600)] hover:border-[var(--focus-border)] hover:bg-[var(--beige-50)] active:bg-[var(--beige-200)]',
        disabled
          ? 'opacity-40 cursor-not-allowed hover:bg-white hover:border-[var(--beige-600)]'
          : 'cursor-pointer',
        className,
      )}
    >
      {indeterminate
        ? <span className="block w-2 h-0.5 bg-white rounded-full" />
        : checked && (
          <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-6.5" /></svg>
        )}
    </button>
  );
}

/* ---------------------------- Label / Section ------------------------------ */

export function LabelText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx('text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)]', className)}>
      {children}
    </div>
  );
}

/* --------------------------------- Tooltip --------------------------------- */

export function Tooltip({
  content, children, side = 'top', className, width,
}: {
  content: React.ReactNode; children: React.ReactNode;
  side?: 'top' | 'bottom' | 'right'; className?: string; width?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const pos = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[side];
  return (
    <span
      className={cx('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cx(
            'absolute z-50 pointer-events-none bg-white text-[var(--fg1)] rounded-md',
            'border border-[var(--beige-400)] shadow-[var(--shadow-md)] px-3 py-2 text-xs font-normal text-left',
            'animate-[emaIn_150ms_var(--ease-out-quint)]',
            pos,
          )}
          style={{ width: width ?? 'max-content', maxWidth: width ?? 320 }}
        >
          {content}
        </span>
      )}
    </span>
  );
}

/* ------------------------------ Info popover ------------------------------- */

/**
 * A "how does this work" affordance for a concept the product invented.
 *
 * Click-to-open rather than hover: the research on source presentation found
 * hover gets the least engagement, and an explanation nobody opens is not an
 * explanation. Escape and click-away both dismiss.
 */
export function InfoPopover({
  label, title, children, width = 340,
}: { label: string; title: string; children: React.ReactNode; width?: number }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <span className="relative inline-flex">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        aria-expanded={open}
        className={cx(
          'inline-flex items-center justify-center size-4 rounded-full border text-[10px] font-bold cursor-pointer transition-colors duration-150',
          open
            ? 'bg-[var(--fg2)] border-[var(--fg2)] text-white'
            : 'border-[var(--beige-600)] text-[var(--fg3)] hover:border-[var(--fg3)] hover:text-[var(--fg2)]',
        )}
      >
        i
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <span
            role="dialog"
            aria-label={title}
            className="absolute left-0 top-full mt-2 z-50 block bg-white border border-[var(--beige-400)] rounded-lg shadow-[var(--shadow-lg)] p-3.5 animate-[emaIn_150ms_var(--ease-out-quint)]"
            style={{ width }}
          >
            <span className="flex items-start gap-2 mb-2">
              <span className="text-sm font-medium text-[var(--fg1)] flex-1">{title}</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-[var(--fg3)] hover:text-[var(--fg1)] cursor-pointer shrink-0 leading-none"
              >
                ×
              </button>
            </span>
            <span className="block text-xs text-[var(--fg2)] leading-[17px]">{children}</span>
          </span>
        </>
      )}
    </span>
  );
}


/* ---------------------------------- Tabs ----------------------------------- */

export function Tabs<T extends string>({
  value, onChange, items, variant = 'underline', className,
}: {
  value: T; onChange: (v: T) => void;
  items: { id: T; label: string; count?: number; icon?: React.ReactNode }[];
  variant?: 'underline' | 'segmented'; className?: string;
}) {
  if (variant === 'segmented') {
    return (
      <div className={cx('inline-flex items-center gap-0.5 p-0.5 bg-[var(--beige-100)] border border-[var(--beige-300)] rounded-sm', className)}>
        {items.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cx(
              'inline-flex items-center gap-1.5 h-7 px-3 rounded-xs text-xs font-medium cursor-pointer transition-all duration-150',
              value === t.id
                ? 'bg-white text-[var(--fg1)] border border-[var(--beige-300)] shadow-[var(--shadow-xs)]'
                : 'text-[var(--fg2)] border border-transparent hover:text-[var(--fg1)]',
            )}
          >
            {t.icon}{t.label}
            {t.count !== undefined && (
              <span className={cx('tabular-nums', value === t.id ? 'text-[var(--fg2)]' : 'text-[var(--fg3)]')}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className={cx('flex items-center gap-1 border-b border-[var(--beige-400)]', className)}>
      {items.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cx(
            'inline-flex items-center gap-1.5 px-3 py-2 text-sm cursor-pointer -mb-px border-b-2 transition-colors duration-150',
            value === t.id
              ? 'border-[var(--brand-primary)] text-[var(--fg1)] font-medium'
              : 'border-transparent text-[var(--fg2)] hover:text-[var(--fg1)]',
          )}
        >
          {t.icon}{t.label}
          {t.count !== undefined && <span className="text-[var(--fg3)] tabular-nums">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------- Overlays -------------------------------- */

export function Scrim({ onClick, className }: { onClick?: () => void; className?: string }) {
  return (
    <div
      onClick={onClick}
      className={cx('fixed inset-0 z-40 bg-[rgba(35,33,25,0.32)] animate-[emaFade_150ms_var(--ease-out-quint)]', className)}
    />
  );
}

/**
 * Shared dialog behaviour for Drawer and Modal.
 *
 * Escape to close, focus moved in on open and returned to the trigger on close,
 * and Tab cycled within the dialog. Without this an overlay is a keyboard trap:
 * you can open it but never leave it without a mouse.
 */
function useDialog(open: boolean, onClose: () => void) {
  const ref = React.useRef<HTMLElement | null>(null);
  const restoreTo = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    restoreTo.current = document.activeElement as HTMLElement | null;

    const focusables = () => Array.from(
      ref.current?.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((el) => el.offsetParent !== null);

    // Move focus in, so a screen reader lands inside the dialog.
    const first = focusables()[0];
    (first ?? ref.current)?.focus?.();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    };

    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      restoreTo.current?.focus?.();
    };
  }, [open, onClose]);

  return ref;
}

export function Drawer({
  open, onClose, width = 560, label = 'Details', children,
}: { open: boolean; onClose: () => void; width?: number; label?: string; children: React.ReactNode }) {
  const ref = useDialog(open, onClose);
  if (!open) return null;
  return (
    <>
      <Scrim onClick={onClose} />
      <aside
        ref={ref as React.RefObject<HTMLElement>}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="fixed right-0 top-0 bottom-0 z-50 bg-white border-l border-[var(--beige-400)] shadow-[var(--shadow-lg)] flex flex-col animate-[emaSlide_300ms_var(--ease-out-quint)]"
        style={{ width }}
      >
        {children}
      </aside>
    </>
  );
}

export function Modal({
  open, onClose, children, width = 560, className, label = 'Dialog',
}: {
  open: boolean; onClose: () => void; children: React.ReactNode;
  width?: number | string; className?: string; label?: string;
}) {
  const ref = useDialog(open, onClose);
  if (!open) return null;
  return (
    <>
      <Scrim onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
        <div
          ref={ref as React.RefObject<HTMLDivElement>}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          tabIndex={-1}
          className={cx(
            'bg-white border border-[var(--beige-400)] rounded-xl shadow-[var(--shadow-xl)] flex flex-col',
            'max-h-full w-full pointer-events-auto animate-[emaPop_150ms_var(--ease-out-quint)]',
            className,
          )}
          style={{ maxWidth: width }}
        >
          {children}
        </div>
      </div>
    </>
  );
}

/* --------------------------------- Feedback -------------------------------- */

export function Banner({
  variant = 'info', icon, title, children, action, onDismiss,
}: {
  variant?: 'info' | 'warning' | 'error' | 'success' | 'magic';
  icon?: React.ReactNode; title: string; children?: React.ReactNode;
  action?: React.ReactNode; onDismiss?: () => void;
}) {
  const v = {
    info: 'bg-[var(--info-bg-subtle)] border-[var(--info-border)] text-[var(--info-text)]',
    warning: 'bg-[var(--warning-bg-subtle)] border-[var(--warning-border)] text-[var(--warning-text)]',
    error: 'bg-[var(--error-bg-subtle)] border-[var(--error-border)] text-[var(--error-text)]',
    success: 'bg-[var(--success-bg-subtle)] border-[var(--success-border)] text-[var(--success-text)]',
    magic: 'bg-[var(--ai-magic-bg-subtle)] border-[var(--ai-magic-border)] text-[var(--purple-960)]',
  }[variant];
  return (
    <div className={cx('flex items-start gap-2.5 px-3.5 py-2.5 border rounded-md text-sm', v)}>
      {icon && <span className="shrink-0 mt-px">{icon}</span>}
      <div className="flex-1 min-w-0">
        <span className="font-medium">{title}</span>
        {children && <span className="opacity-90"> {children}</span>}
      </div>
      {action}
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 underline cursor-pointer text-xs font-medium">
          Dismiss
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon, title, body, action, secondary, children,
}: {
  icon?: React.ReactNode; title: string; body?: React.ReactNode;
  action?: React.ReactNode; secondary?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && (
        <div className="size-12 rounded-lg bg-[var(--beige-100)] border border-[var(--beige-300)] flex items-center justify-center text-[var(--fg3)] mb-4">
          {icon}
        </div>
      )}
      <div className="text-base font-medium text-[var(--fg1)]">{title}</div>
      {body && <div className="text-sm text-[var(--fg2)] mt-1.5 max-w-md">{body}</div>}
      {(action || secondary) && (
        <div className="flex items-center gap-2 mt-5">{action}{secondary}</div>
      )}
      {children}
    </div>
  );
}

/* ---------------------------------- Toast ---------------------------------- */

export interface ToastMsg { id: number; text: string; action?: { label: string; onClick: () => void } }

export function ToastStack({ toasts, onDismiss }: { toasts: ToastMsg[]; onDismiss: (id: number) => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[45] flex flex-col gap-2 items-center"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-3 bg-[var(--beige-960)] text-white rounded-md pl-3.5 pr-2 h-10 shadow-[var(--shadow-lg)] text-sm animate-[emaRise_200ms_var(--ease-out-quint)]"
        >
          <span>{t.text}</span>
          {t.action && (
            <button
              onClick={() => { t.action!.onClick(); onDismiss(t.id); }}
              /* Raw greens on purpose: this sits on a dark beige-960 toast, and
                 the DS has no on-dark brand tint — --brand-primary is tuned for
                 light surfaces and drops to 2.8:1 here. */
              className="font-bold text-[var(--green-400)] hover:text-[var(--green-300)] cursor-pointer px-1.5"
            >
              {t.action.label}
            </button>
          )}
          <button onClick={() => onDismiss(t.id)} className="opacity-50 hover:opacity-100 cursor-pointer px-1.5">×</button>
        </div>
      ))}
    </div>
  );
}

/* --------------------------------- Stepper --------------------------------- */

export function Separator({ className }: { className?: string }) {
  return <div className={cx('h-px bg-[var(--beige-400)]', className)} />;
}
