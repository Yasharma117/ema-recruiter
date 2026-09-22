import React from 'react';
import { CaretDown, Check, X, DotsSixVertical, Sparkle, Warning, Plus } from '@phosphor-icons/react';
import type { Criterion } from '../lib/types';
import type { FilterMode } from '../data/search';
import { Button, IconButton, InfoPopover, Input, cx } from './ui';
import { weightShares } from '../lib/scoring';

/**
 * Shared search controls.
 *
 * These live here rather than inside one screen so every layout variant gets
 * the same editing affordances. A variant may choose a different *arrangement*;
 * it may not quietly drop the ability to change a filter or a weight.
 */

/** The word, and what it actually does to the pool. Never abbreviated. */
export const MODE_COPY: Record<FilterMode, { label: string; does: string }> = {
  must: { label: 'Must have', does: 'Only people who match stay in the pool' },
  preferred: { label: 'Preferred', does: 'Narrows nothing — pushes matches up the ranking' },
  exclude: { label: 'Exclude', does: 'Removes anyone who matches' },
};

export const MODES: FilterMode[] = ['must', 'preferred', 'exclude'];

export const MODE_DOT: Record<FilterMode, string> = {
  must: 'bg-[var(--success)]',
  preferred: 'bg-[var(--beige-700)]',
  exclude: 'bg-[var(--error)]',
};

// Same 4.5:1 rule as the badges: -800 on a -200 tint is only 4.04:1.
export const MODE_CHIP: Record<FilterMode, string> = {
  must: 'bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success-text)]',
  preferred: 'bg-[var(--beige-100)] border-[var(--beige-500)] text-[var(--fg2)]',
  exclude: 'bg-[var(--error-bg-subtle)] border-[var(--error-border)] text-[var(--error-text)]',
};

/**
 * A filter's mode, named in full, with a menu that says what each choice does.
 * This was three letters with the meaning hidden in a tooltip — unreadable at a
 * glance, and you cannot hover a screenshot.
 */
export function ModePicker({
  value, onChange, name, compact,
}: { value: FilterMode; onChange: (m: FilterMode) => void; name: string; compact?: boolean }) {
  const [open, setOpen] = React.useState(false);

  // Every other popover in the app closes on Escape; this one used to hold you
  // until you found somewhere harmless to click.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  return (
    <span className="relative shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        aria-label={`${name}: ${MODE_COPY[value].label}. Change`}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cx(
          'inline-flex items-center gap-1 h-6 rounded-sm border text-xs font-medium cursor-pointer transition-colors',
          compact
            ? cx('px-2', MODE_CHIP[value], 'hover:brightness-[0.97] active:brightness-95')
            : 'pl-2 pr-1.5 border-current/25 bg-white/60 hover:bg-white/90 active:bg-white',
          // Open has to look different from hover, or the menu reads as detached.
          open && (compact ? 'ring-2 ring-[var(--focus-ring)]' : 'border-current/50 bg-white'),
        )}
      >
        {MODE_COPY[value].label}
        <CaretDown size={9} weight="bold" className={cx('opacity-60 transition-transform duration-150', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <span role="menu" className="absolute left-0 top-full mt-1 z-50 w-[248px] bg-white border border-[var(--beige-400)] rounded-lg shadow-[var(--shadow-md)] p-1 block animate-[emaIn_150ms_var(--ease-out-quint)]">
            {MODES.map((m) => (
              <button
                key={m}
                role="menuitemradio"
                aria-checked={m === value}
                onClick={() => { onChange(m); setOpen(false); }}
                className={cx(
                  'w-full text-left px-2 py-1.5 rounded-sm cursor-pointer transition-colors block active:bg-[var(--beige-300)]',
                  m === value ? 'bg-[var(--beige-100)]' : 'hover:bg-[var(--beige-100)]',
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span className={cx('size-2 rounded-full shrink-0', MODE_DOT[m])} />
                  <span className="text-sm font-medium text-[var(--fg1)]">{MODE_COPY[m].label}</span>
                  {m === value && <Check size={11} weight="bold" className="ml-auto text-[var(--brand-primary)]" />}
                </span>
                <span className="block text-xs text-[var(--fg2)] mt-0.5 ml-3.5 leading-[16px]">
                  {MODE_COPY[m].does}
                </span>
              </button>
            ))}
          </span>
        </>
      )}
    </span>
  );
}

/**
 * How the scorecard works, for someone meeting it for the first time.
 *
 * Four things are non-obvious and all four change what a number means: required
 * counts double, a low required score caps rather than hides, importance is a
 * share of the whole, and a missing signal is not a negative one.
 */
export function ScorecardInfo() {
  return (
    <InfoPopover label="How the scorecard works" title="How the scorecard works" width={360}>
      <span className="block">
        Filters decide <span className="font-medium text-[var(--fg1)]">who</span> comes back.
        The scorecard decides <span className="font-medium text-[var(--fg1)]">what order</span> they
        come back in. Every candidate who passes your filters is scored{' '}
        <span className="font-medium text-[var(--fg1)]">1 to 5 on each criterion</span>.
      </span>

      <span className="block pt-2 mt-2 border-t border-[var(--beige-300)]">
        <span className="block font-medium text-[var(--fg1)] mb-0.5">Required vs preferred</span>
        A required criterion counts double. If someone scores 1 or 2 on one, their overall
        score is capped at “Not a match” — but they stay in the list, because the more likely
        explanation is that Ema read the profile wrong, and you can override it.
      </span>

      <span className="block pt-2 mt-2 border-t border-[var(--beige-300)]">
        <span className="block font-medium text-[var(--fg1)] mb-0.5">Importance</span>
        The bar sets how much a criterion matters relative to the others. The percentage is
        what it actually controls, so the six always add up to 100.
      </span>

      <span className="block pt-2 mt-2 border-t border-[var(--beige-300)]">
        <span className="block font-medium text-[var(--fg1)] mb-0.5">When Ema finds nothing</span>
        An unscored criterion is left out of the average rather than counted as zero — a missing
        signal is not a negative one. You will see it as lower{' '}
        <span className="font-medium text-[var(--fg1)]">coverage</span> (“4 of 6”) instead, and you
        can ask about it in the outreach message.
      </span>

      <span className="block pt-2 mt-2 border-t border-[var(--beige-300)]">
        <span className="block font-medium text-[var(--fg1)] mb-0.5">Every score cites a source</span>
        Open a candidate to see the quote behind each one, and correct it if Ema got it wrong.
        Your corrections stay put when the search re-runs.
      </span>
    </InfoPopover>
  );
}

/** The three modes, as an explainer rather than a list that mimics the filters. */
export function FiltersInfo() {
  return (
    <InfoPopover label="How filters work" title="How filters work" width={340}>
      <span className="block">
        Filters decide <span className="font-medium text-[var(--fg1)]">who is eligible</span>.
        The scorecard below decides what order the survivors come back in.
      </span>
      {MODES.map((m) => (
        <span key={m} className="block pt-2 mt-2 border-t border-[var(--beige-300)]">
          <span className="flex items-center gap-1.5 mb-0.5">
            <span className={cx('size-2 rounded-full shrink-0', MODE_DOT[m])} />
            <span className="font-medium text-[var(--fg1)]">{MODE_COPY[m].label}</span>
          </span>
          <span className="block ml-3.5">{MODE_COPY[m].does}.</span>
        </span>
      ))}
    </InfoPopover>
  );
}

/**
 * Says where the configuration came from. Without this the filters read as
 * something the product decided, rather than something read out of the role
 * description the hiring manager wrote.
 */
export function DerivedFrom({ stale, onReparse }: { stale?: boolean; onReparse?: () => void }) {
  if (stale) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--warning-text)]">
        <Warning size={11} weight="bold" />
        The role description changed — Ema has not re-read it.
        {onReparse && (
          <button onClick={onReparse} className="font-medium underline hover:no-underline cursor-pointer">
            Re-read
          </button>
        )}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--fg3)]">
      <Sparkle size={11} weight="fill" className="text-[var(--ai-magic-text)]" />
      Read from your role description
    </span>
  );
}

/** Defines the three modes once, wherever filters are shown. */
export function FilterLegend({ className }: { className?: string }) {
  return (
    <div className={cx('flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--fg2)]', className)}>
      {MODES.map((m) => (
        <span key={m} className="inline-flex items-center gap-1.5">
          <span className={cx('size-2 rounded-full shrink-0', MODE_DOT[m])} />
          <span className="font-medium text-[var(--fg1)]">{MODE_COPY[m].label}</span>
          <span className="text-[var(--fg3)]">{MODE_COPY[m].does.toLowerCase()}</span>
        </span>
      ))}
    </div>
  );
}

/**
 * Weight as a scale rather than a stepper.
 *
 * A stepper shows a number, but a scorecard is about *relative* importance —
 * you cannot compare a column of numbers at a glance, and going 1→5 costs four
 * clicks. Five segments are comparable down the column and settable in one.
 *
 * The share readout is the part a stepper hides entirely: required criteria
 * count double, so "3" means something different depending on the type. This
 * says what the criterion actually controls.
 */
export function WeightScale({
  value, onChange, share, name, shareShort,
}: {
  value: number; onChange: (n: number) => void;
  /** Whole percent, already apportioned to sum to 100. */ share?: number; name: string;
  /** Drops "of the score" where the rail is too narrow to carry it. */ shareShort?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        role="radiogroup"
        aria-label={`Importance of ${name}`}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.min(5, value + 1)); }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(1, value - 1)); }
          if (e.key === 'Home') { e.preventDefault(); onChange(1); }
          if (e.key === 'End') { e.preventDefault(); onChange(5); }
        }}
        className="inline-flex items-center gap-[3px] rounded-sm p-0.5"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            role="radio"
            aria-checked={n === value}
            // Roving tabindex: the group is one tab stop, arrows move within it.
            tabIndex={n === value ? 0 : -1}
            onClick={() => onChange(n)}
            aria-label={`${n} of 5`}
            title={`${n} of 5`}
            className={cx(
              'h-5 w-[13px] rounded-xs cursor-pointer transition-colors duration-150',
              n <= value
                ? 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-accent)] active:bg-[var(--brand-primary-active)]'
                : 'bg-[var(--beige-400)] hover:bg-[var(--beige-600)] active:bg-[var(--beige-700)]',
            )}
          />
        ))}
      </div>
      {share !== undefined && (
        /* Keyed on the value, so a changed share re-mounts and cross-fades.
           The point is the coupling: raising one criterion lowers the other
           five, and until now the other five numbers changed in silence — the
           one consequence of this control that nothing on screen admitted to.
           Opacity only, and only when the number is genuinely different. */
        <span
          key={share}
          className="text-xs text-[var(--fg3)] tabular-nums whitespace-nowrap animate-[emaFade_160ms_var(--ease-out-quint)_backwards]"
        >
          {share}{shareShort ? '%' : '% of the score'}
        </span>
      )}
    </div>
  );
}

const STEPPER = 'size-6 rounded-sm border border-[var(--border-color)] bg-white text-[var(--fg2)] '
  + 'transition-colors duration-150 cursor-pointer '
  + 'hover:border-[var(--focus-border)] hover:bg-[var(--beige-100)] active:bg-[var(--beige-200)]';
/** At 1 and at 5 the button does nothing, so it stops offering. */
const STEPPER_OFF = 'opacity-40 cursor-not-allowed hover:border-[var(--border-color)] hover:bg-white active:bg-white';

/** One editable scorecard criterion: type toggle, weight control, remove. */
/**
 * Remove, in edit mode.
 *
 * This is the one control on the configuration screen that is only present
 * because you asked to change something — and it was hiding as a 12px ghost
 * glyph at the far edge of a wide row, which reads as decoration until you
 * hover it. It now carries its own outline at rest and turns destructive on
 * approach: the affordance is visible before the intent is.
 */
export function RemoveButton({ onClick, title }: { onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cx(
        'inline-flex items-center justify-center size-7 shrink-0 rounded-sm cursor-pointer',
        'border border-[var(--border-color)] bg-white text-[var(--fg2)]',
        'hover:bg-[var(--error-bg-subtle)] hover:border-[var(--error-border)] hover:text-[var(--error-text)]',
        'active:bg-[var(--error-bg)] transition-colors duration-150',
      )}
    >
      <X size={13} weight="bold" />
    </button>
  );
}

/**
 * Whether this criterion just became more or less important, for one beat.
 *
 * Importance is weight x type: Required counts double in the score, so moving
 * a criterion from preferred to required at the same weight is a rise and has
 * to read as one. Returns a key alongside the direction so the row can remount
 * its animation — re-applying the same class on a second change in a row would
 * otherwise do nothing, and hammering the scale would light the card once.
 */
function useImportancePulse(c: Criterion) {
  const rank = c.weight * (c.type === 'required' ? 2 : 1);
  const prev = React.useRef(rank);
  const [pulse, setPulse] = React.useState<{ dir: 'up' | 'down'; key: number } | null>(null);
  const seq = React.useRef(0);

  React.useEffect(() => {
    if (rank === prev.current) return;
    const dir = rank > prev.current ? 'up' : 'down';
    prev.current = rank;
    setPulse({ dir, key: seq.current++ });
    // Matches the 1800ms .score-up / .score-down animation in index.css; if
    // this fires first the class is pulled mid-fade and the tint snaps off.
    const t = setTimeout(() => setPulse(null), 1800);
    return () => clearTimeout(t);
  }, [rank]);

  return pulse;
}

export function ScorecardRow({
  criterion, onChange, onRemove, compact, weightControl = 'stepper', share, pending, note, nameNode,
}: {
  criterion: Criterion;
  onChange: (next: Criterion) => void;
  onRemove?: () => void;
  compact?: boolean;
  /** A layout may choose a different control; it may not remove the ability to weight. */
  weightControl?: 'stepper' | 'scale';
  share?: number;
  /**
   * Ema has the criterion but has not settled its type or weight yet. The
   * placeholders are the same size as the controls they stand in for, so the
   * row does not reflow when the verdict lands.
   */
  pending?: boolean;
  /** A qualifier on the name — where it came from, or that nothing did. */
  note?: React.ReactNode;
  /** Renders in place of the plain name — for a name being written out. */
  nameNode?: React.ReactNode;
}) {
  const c = criterion;
  const pulse = useImportancePulse(c);

  // The scale gets its own card shape at full size; compact keeps the row and
  // swaps only the control.
  if (weightControl === 'scale' && !compact) {
    return (
      <div
        key={pulse ? `p${pulse.key}` : 'idle'}
        className={cx(
          'rounded-lg border border-[var(--border-color)] bg-[var(--bg3)] p-3',
          pulse && (pulse.dir === 'up' ? 'score-up' : 'score-down'),
        )}
      >
        <div className="flex items-start gap-2.5">
          <DotsSixVertical size={15} className="text-[var(--fg3)] shrink-0 mt-0.5 cursor-grab" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-[var(--fg1)] leading-[18px]">{c.name}</div>
            <div className="text-xs text-[var(--fg3)] mt-0.5">Bar for a 5: {c.bar}</div>
          </div>
          <button
            onClick={() => onChange({ ...c, type: c.type === 'required' ? 'preferred' : 'required' })}
            aria-label={`${c.name} is ${c.type}. Toggle required or preferred`}
            title={c.type === 'required'
              ? 'Required — scoring 1 or 2 here caps the candidate. Counts double.'
              : 'Preferred — shapes the ranking, never excludes.'}
            className={cx(
              'shrink-0 text-[10px] uppercase tracking-[1px] font-bold px-2 py-1 rounded-xs cursor-pointer transition-colors',
              c.type === 'required'
                ? 'bg-[var(--success-bg)] border border-[var(--success-border)] text-[var(--success-text)] hover:bg-[var(--green-300)] active:bg-[var(--green-400)]'
                : 'bg-[var(--beige-200)] border border-[var(--beige-500)] text-[var(--fg2)] hover:bg-[var(--beige-300)] active:bg-[var(--beige-400)]',
            )}
          >
            {c.type}
          </button>
          {onRemove && (
            <RemoveButton onClick={onRemove} title={`Remove ${c.name}`} />
          )}
        </div>
        <div className="flex items-center gap-3 mt-2.5 pl-[25px]">
          <span className="text-xs text-[var(--fg3)] w-[68px] shrink-0">Importance</span>
          <WeightScale
            name={c.name}
            value={c.weight}
            share={share}
            onChange={(n) => onChange({ ...c, weight: n })}
          />
        </div>
      </div>
    );
  }

  return (
    // Compact wraps: in a 360px rail a long criterion name and four controls on
    // one line squeeze the stepper, so the name takes the first line alone.
    <div
      key={pulse ? `p${pulse.key}` : 'idle'}
      className={cx(
        'flex rounded-lg border border-[var(--border-color)] bg-[var(--bg3)]',
        compact ? 'flex-wrap items-center gap-x-2 gap-y-1.5 p-2' : 'items-start gap-2.5 p-2.5',
        pulse && (pulse.dir === 'up' ? 'score-up' : 'score-down'),
      )}
    >
      {!compact && <DotsSixVertical size={15} className="text-[var(--fg3)] shrink-0 mt-1 cursor-grab" />}
      <div className={cx('min-w-0', compact ? 'basis-full' : 'flex-1')}>
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0 text-sm font-medium text-[var(--fg1)] leading-[18px]">
            {nameNode ?? c.name}{note}
          </div>
          {/* Top right, on the name's line. At the end of the control row it
              sat after the weight scale, so removing a criterion meant
              reaching past the thing you were most likely to be adjusting. */}
          {onRemove && <RemoveButton onClick={onRemove} title={`Remove ${c.name}`} />}
        </div>
        {!compact && <div className="text-xs text-[var(--fg3)] mt-0.5">Bar for a 5: {c.bar}</div>}
      </div>
      {/* A placeholder measured by hand is a placeholder that is wrong: pending
          rows came out 8px shorter than resolved ones and the column grew as
          each verdict landed. The real control stays in the layout, hidden,
          with the skeleton laid over it — identical geometry by construction. */}
      <span className={cx('relative inline-flex shrink-0', pending && 'pointer-events-none')}>
      {pending && <span className="ema-skeleton absolute inset-0 rounded-xs z-10" aria-hidden />}
      <button
        tabIndex={pending ? -1 : undefined}
        aria-hidden={pending || undefined}
        onClick={() => onChange({ ...c, type: c.type === 'required' ? 'preferred' : 'required' })}
        aria-label={`${c.name} is ${c.type}. Toggle required or preferred`}
        title="Toggle required / preferred"
        className={cx(
          'shrink-0 text-[10px] uppercase tracking-[1px] font-bold px-2 py-1 rounded-xs cursor-pointer transition-colors',
          !pending && 'animate-[emaPop_160ms_var(--ease-out-quint)_backwards]',
          pending && 'invisible',
          c.type === 'required'
            ? 'bg-[var(--success-bg)] border border-[var(--success-border)] text-[var(--success-text)] hover:bg-[var(--green-300)] active:bg-[var(--green-400)]'
            : 'bg-[var(--beige-200)] border border-[var(--beige-500)] text-[var(--fg2)] hover:bg-[var(--beige-300)] active:bg-[var(--beige-400)]',
        )}
      >
        {c.type}
      </button>
      </span>
      {/* A level scale reads as "how much does this matter", which is the
          question; a stepper reads as a number to nudge. Layouts choose. */}
      {weightControl === 'scale' ? (
        <div className={cx('shrink-0', compact && 'ml-auto')}>
          <span className={cx('relative block', pending && 'pointer-events-none')}>
            {pending && <span className="ema-skeleton absolute inset-0 rounded-xs z-10" aria-hidden />}
            <span className={cx('block', !pending && 'animate-[emaPop_160ms_var(--ease-out-quint)_backwards]')}>
              <WeightScale name={c.name} value={c.weight} share={share} onChange={(n) => onChange({ ...c, weight: n })} />
            </span>
          </span>
        </div>
      ) : (
      <div className={cx('flex items-center gap-1 shrink-0', compact && 'ml-auto')}>
        <button
          onClick={() => onChange({ ...c, weight: Math.max(1, c.weight - 1) })}
          disabled={c.weight <= 1}
          aria-label={`Decrease weight for ${c.name}`}
          className={cx(STEPPER, c.weight <= 1 && STEPPER_OFF)}
        >−</button>
        <span className="w-5 text-center text-sm font-bold tabular-nums text-[var(--fg1)]">{c.weight}</span>
        <button
          onClick={() => onChange({ ...c, weight: Math.min(5, c.weight + 1) })}
          disabled={c.weight >= 5}
          aria-label={`Increase weight for ${c.name}`}
          className={cx(STEPPER, c.weight >= 5 && STEPPER_OFF)}
        >+</button>
      </div>
      )}
    </div>
  );
}

/** The Ema-suggested marker, used wherever a parsed value is shown unconfirmed. */
export function SuggestedMark() {
  return <Sparkle size={11} weight="fill" className="text-[var(--ai-magic-text)] shrink-0" />;
}

/* -------------------------------------------------------------------------- */
/*  Manual additions                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Add a filter by hand.
 *
 * Ema reads most of these out of the role description, but the recruiter knows
 * things the description does not say. Both layouts that show filters get the
 * same affordance, from here, so neither can quietly lose it.
 */
export function AddFilter({
  categories, onAdd, className,
}: { categories: readonly string[]; onAdd: (category: string, value: string) => void; className?: string }) {
  const [draft, setDraft] = React.useState<{ category: string; value: string } | null>(null);

  const commit = () => {
    if (!draft?.value.trim()) return;
    onAdd(draft.category, draft.value.trim());
    setDraft(null);
  };

  if (!draft) {
    return (
      <Button size="sm" variant="ghost" color="altBrand" icon={<Plus size={13} />} className={className}
        onClick={() => setDraft({ category: categories[0] ?? 'Skills', value: '' })}>
        Add filter
      </Button>
    );
  }

  return (
    <div className={cx(
      'p-2.5 rounded-lg border border-[var(--focus-border)] bg-white flex items-center gap-2 flex-wrap',
      // Replaces a 28px ghost button with a full-width bordered row. Snapping
      // it in shifts everything below by 40px with no account of why.
      'animate-[emaIn_180ms_var(--ease-out-quint)_backwards]',
      className,
    )}>
      <select
        value={draft.category}
        onChange={(e) => setDraft({ ...draft, category: e.target.value })}
        aria-label="Filter category"
        className="h-9 px-3 rounded-md border border-[var(--border-color)] bg-white text-sm text-[var(--fg1)] outline-none cursor-pointer focus:border-[var(--focus-border)] focus:shadow-focus"
      >
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input
        autoFocus
        value={draft.value}
        onChange={(e) => setDraft({ ...draft, value: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setDraft(null);
          if (e.key === 'Enter') commit();
        }}
        placeholder="Value, e.g. Kubernetes"
        className="flex-1 min-w-[160px] h-9 px-3 rounded-md border border-[var(--border-color)] bg-white text-sm text-[var(--fg1)] outline-none placeholder:text-[var(--fg3)] focus:border-[var(--focus-border)] focus:shadow-focus"
      />
      <span className="text-xs text-[var(--fg3)]">Added as Preferred, so it will not shrink your pool.</span>
      <Button size="sm" variant="ghost" color="altBrand" onClick={() => setDraft(null)}>Cancel</Button>
      <Button size="sm" disabled={!draft.value.trim()} onClick={commit}>Add</Button>
    </div>
  );
}

/**
 * Add a scorecard criterion by hand, with its type and weight set before it
 * lands — and the share of the score it would take previewed while you decide,
 * because "weight 3" means different things depending on what else is there.
 */
export function AddCriterion({
  criteria, onAdd, className,
}: { criteria: Criterion[]; onAdd: (c: Omit<Criterion, 'id'>) => void; className?: string }) {
  const [draft, setDraft] = React.useState<Omit<Criterion, 'id'> | null>(null);

  const share = React.useMemo(
    () => draft && weightShares([...criteria, { ...draft, id: '__draft' }]).__draft,
    [criteria, draft],
  );

  const commit = () => {
    if (!draft?.name.trim()) return;
    onAdd({
      ...draft,
      name: draft.name.trim(),
      bar: draft.bar.trim() || 'Not set — Ema will infer a bar from the role',
    });
    setDraft(null);
  };

  if (!draft) {
    return (
      <Button size="sm" variant="ghost" color="altBrand" icon={<Plus size={13} />} className={className}
        onClick={() => setDraft({ name: '', bar: '', type: 'preferred', weight: 2 })}>
        Add criterion
      </Button>
    );
  }

  return (
    <form
      className={cx(
        'rounded-lg border border-[var(--focus-border)] bg-white shadow-[var(--shadow-sm)]',
        // Four fields where a button was: far more travel than AddFilter's row,
        // and once per search, so it gets the entrance rather than the snap.
        'animate-[emaRise_220ms_var(--ease-out-quint)_backwards]',
        className,
      )}
      onSubmit={(e) => { e.preventDefault(); commit(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') setDraft(null); }}
    >
      <div className="p-3 space-y-3">
        <div className="text-sm font-medium text-[var(--fg1)]">New criterion</div>
        <label className="block">
          <span className="block text-xs font-medium text-[var(--fg2)] mb-1">What are you looking for?</span>
          <Input
            autoFocus
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="e.g. Streaming data pipelines"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-[var(--fg2)] mb-1">
            Bar for a 5 <span className="font-normal text-[var(--fg3)]">· optional</span>
          </span>
          <Input
            value={draft.bar}
            onChange={(e) => setDraft({ ...draft, bar: e.target.value })}
            placeholder="e.g. Owned a Kafka or Flink pipeline at >1M events/sec"
          />
          <span className="block text-xs text-[var(--fg3)] mt-1">Leave blank and Ema infers a bar from the role.</span>
        </label>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--fg3)] w-[68px] shrink-0">Type</span>
            <div role="radiogroup" aria-label="Criterion type"
              className="inline-flex p-0.5 gap-0.5 bg-[var(--beige-100)] border border-[var(--beige-300)] rounded-sm">
              {(['preferred', 'required'] as const).map((t) => (
                <button key={t} type="button" role="radio" aria-checked={draft.type === t}
                  onClick={() => setDraft({ ...draft, type: t, weight: t === 'required' ? 3 : 2 })}
                  title={t === 'required'
                    ? 'Required — scoring 1 or 2 here caps the candidate. Counts double.'
                    : 'Preferred — shapes the ranking, never excludes.'}
                  className={cx(
                    'h-6 px-2.5 rounded-xs text-xs font-medium capitalize cursor-pointer transition-colors duration-150 border',
                    draft.type === t
                      ? 'bg-white text-[var(--fg1)] border-[var(--beige-300)] shadow-[var(--shadow-xs)]'
                      : 'text-[var(--fg2)] border-transparent hover:text-[var(--fg1)]',
                  )}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--fg3)] shrink-0">Importance</span>
            <WeightScale
              name={draft.name || 'new criterion'}
              value={draft.weight}
              share={share ?? undefined}
              onChange={(n) => setDraft({ ...draft, weight: n })}
            />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-[var(--border-color)] bg-[var(--bg3)] rounded-b-lg">
        <span className="text-xs text-[var(--fg3)]">
          {draft.type === 'required'
            ? 'Scoring 1 or 2 here caps a candidate.'
            : 'Shapes the ranking, never excludes anyone.'}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Button type="button" size="sm" variant="ghost" color="altBrand" onClick={() => setDraft(null)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" icon={<Plus size={13} />} disabled={!draft.name.trim()}>
            Add criterion
          </Button>
        </div>
      </div>
    </form>
  );
}
