import React from 'react';
import { CaretDown, Check, X, DotsSixVertical, Sparkle, Warning } from '@phosphor-icons/react';
import type { Criterion } from '../lib/types';
import type { FilterMode } from '../data/search';
import { IconButton, InfoPopover, cx } from './ui';

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
  return (
    <span className="relative shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        aria-label={`${name}: ${MODE_COPY[value].label}. Change`}
        className={cx(
          'inline-flex items-center gap-1 h-6 rounded-sm border text-xs font-medium cursor-pointer transition-colors',
          compact
            ? 'px-1.5 border-[var(--beige-500)] bg-white text-[var(--fg2)] hover:border-[var(--focus-border)]'
            : 'pl-2 pr-1.5 border-current/25 bg-white/60 hover:bg-white/90',
        )}
      >
        {MODE_COPY[value].label}
        <CaretDown size={9} weight="bold" className="opacity-60" />
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <span className="absolute left-0 top-full mt-1 z-50 w-[248px] bg-white border border-[var(--beige-400)] rounded-lg shadow-[var(--shadow-md)] p-1 block animate-[emaIn_150ms_var(--ease-out-quint)]">
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => { onChange(m); setOpen(false); }}
                className={cx(
                  'w-full text-left px-2 py-1.5 rounded-sm cursor-pointer transition-colors block',
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
  value, onChange, share, name,
}: { value: number; onChange: (n: number) => void; /** Whole percent, already apportioned to sum to 100. */ share?: number; name: string }) {
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
                ? 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-accent)]'
                : 'bg-[var(--beige-300)] hover:bg-[var(--beige-500)]',
            )}
          />
        ))}
      </div>
      {share !== undefined && (
        <span className="text-xs text-[var(--fg3)] tabular-nums whitespace-nowrap">
          {share}% of the score
        </span>
      )}
    </div>
  );
}

/** One editable scorecard criterion: type toggle, weight control, remove. */
export function ScorecardRow({
  criterion, onChange, onRemove, compact, weightControl = 'stepper', share,
}: {
  criterion: Criterion;
  onChange: (next: Criterion) => void;
  onRemove?: () => void;
  compact?: boolean;
  /** A layout may choose a different control; it may not remove the ability to weight. */
  weightControl?: 'stepper' | 'scale';
  share?: number;
}) {
  const c = criterion;

  if (weightControl === 'scale') {
    return (
      <div className="rounded-lg border border-[var(--beige-400)] bg-[var(--beige-50)] p-3">
        <div className="flex items-start gap-2.5">
          <DotsSixVertical size={15} className="text-[var(--beige-700)] shrink-0 mt-0.5 cursor-grab" />
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
                ? 'bg-[var(--success-bg)] text-[var(--success-text)] hover:bg-[var(--green-300)]'
                : 'bg-[var(--beige-200)] text-[var(--fg2)] hover:bg-[var(--beige-300)]',
            )}
          >
            {c.type}
          </button>
          {onRemove && (
            <IconButton icon={<X size={12} />} className="size-6 shrink-0" onClick={onRemove} title={`Remove ${c.name}`} />
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
    <div className={cx(
      'flex items-start gap-2.5 rounded-lg border border-[var(--beige-400)] bg-[var(--beige-50)]',
      compact ? 'p-2' : 'p-2.5',
    )}>
      {!compact && <DotsSixVertical size={15} className="text-[var(--beige-700)] shrink-0 mt-1 cursor-grab" />}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--fg1)] leading-[18px]">{c.name}</div>
        {!compact && <div className="text-xs text-[var(--fg3)] mt-0.5">Bar for a 5: {c.bar}</div>}
      </div>
      <button
        onClick={() => onChange({ ...c, type: c.type === 'required' ? 'preferred' : 'required' })}
        aria-label={`${c.name} is ${c.type}. Toggle required or preferred`}
        title="Toggle required / preferred"
        className={cx(
          'shrink-0 text-[10px] uppercase tracking-[1px] font-bold px-2 py-1 rounded-xs cursor-pointer transition-colors',
          c.type === 'required'
            ? 'bg-[var(--success-bg)] text-[var(--success-text)] hover:bg-[var(--green-300)]'
            : 'bg-[var(--beige-200)] text-[var(--fg2)] hover:bg-[var(--beige-300)]',
        )}
      >
        {c.type}
      </button>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onChange({ ...c, weight: Math.max(1, c.weight - 1) })}
          aria-label={`Decrease weight for ${c.name}`}
          className="size-6 rounded-xs border border-[var(--beige-500)] bg-white text-[var(--fg2)] hover:border-[var(--focus-border)] cursor-pointer"
        >−</button>
        <span className="w-5 text-center text-sm font-bold tabular-nums text-[var(--fg1)]">{c.weight}</span>
        <button
          onClick={() => onChange({ ...c, weight: Math.min(5, c.weight + 1) })}
          aria-label={`Increase weight for ${c.name}`}
          className="size-6 rounded-xs border border-[var(--beige-500)] bg-white text-[var(--fg2)] hover:border-[var(--focus-border)] cursor-pointer"
        >+</button>
      </div>
      {onRemove && (
        <IconButton icon={<X size={12} />} className="size-6 shrink-0" onClick={onRemove} title={`Remove ${c.name}`} />
      )}
    </div>
  );
}

/** The Ema-suggested marker, used wherever a parsed value is shown unconfirmed. */
export function SuggestedMark() {
  return <Sparkle size={11} weight="fill" className="text-[var(--ai-magic-text)] shrink-0" />;
}
