import React from 'react';
import { MagnifyingGlass, FunnelSimple, X, Check } from '@phosphor-icons/react';
import { cx } from './ui';
import { useStore } from '../store';

export type ListFilter = { id: string; label: string; hint: string };

/**
 * Narrowing the candidate pool.
 *
 * Search and filters are one control because they do one job: deciding which
 * rows exist. Sort is the other axis — what order they come in — and stays
 * separate, which is the Linear rule the rest of this screen already follows.
 * Merging them also stops the toolbar reading as four unrelated widgets.
 *
 * The filters were loose pills; at four they fit, but they were already
 * wrapping at narrow widths and there is no room to add a fifth. Behind a
 * trigger with a count, the control is fixed-width and the active set is still
 * legible without opening it.
 *
 * Lives here, not in a layout, because all three candidate layouts need the
 * search half and every regression in this build came from a variant
 * reimplementing something.
 */
export function CandidateSearch({
  resultCount, className, filters, active, onToggleFilter, onClearFilters,
}: {
  resultCount: number;
  className?: string;
  /** Omitted by the layouts that have no chips — they get search only. */
  filters?: ListFilter[];
  active?: Set<string>;
  onToggleFilter?: (id: string) => void;
  onClearFilters?: () => void;
}) {
  const { query, setQuery } = useStore();
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const activeCount = active?.size ?? 0;

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className={cx('relative flex items-center', className)}>
      <div className={cx(
        'flex items-center h-8 bg-white rounded-md border border-[var(--beige-500)]',
        'transition-[box-shadow,border-color] duration-150',
        // The shell is the focus target; the field suppresses its own ring.
        'focus-within:border-[var(--focus-border)] focus-within:shadow-focus',
      )}>
        <label htmlFor={id} className="sr-only">
          Find a candidate by name, company, title or location
        </label>
        <MagnifyingGlass size={14} className="text-[var(--fg3)] shrink-0 ml-3" />
        <input
          id={id}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a candidate"
          className={cx(
            'w-44 min-w-0 bg-transparent border-0 outline-none text-sm text-[var(--fg1)] px-2',
            'placeholder:text-[var(--fg3)] placeholder:font-normal focus-visible:shadow-none',
            // The browser's own clear affordance is unstyleable and inconsistent.
            '[&::-webkit-search-cancel-button]:hidden',
          )}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="text-[var(--fg3)] rounded-xs hover:text-[var(--fg1)] active:text-[var(--fg2)] cursor-pointer shrink-0 pr-2"
          >
            <X size={12} weight="bold" />
          </button>
        )}

        {filters && (
          <>
            <span className="w-px self-stretch my-1.5 bg-[var(--beige-400)] shrink-0" />
            <button
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label={activeCount ? `Filters, ${activeCount} active` : 'Filters'}
              className={cx(
                'flex items-center gap-1.5 h-full px-2.5 rounded-r-md text-xs font-medium cursor-pointer shrink-0',
                'transition-colors duration-150',
                activeCount || open
                  ? 'text-[var(--success-text)] bg-[var(--success-bg-subtle)] hover:bg-[var(--success-bg)]'
                  : 'text-[var(--fg2)] hover:text-[var(--fg1)] hover:bg-[var(--beige-100)]',
                'active:bg-[var(--beige-200)]',
              )}
            >
              <FunnelSimple size={13} weight={activeCount ? 'bold' : 'regular'} />
              Filters
              {activeCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-pill bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] text-[10px] font-bold tabular-nums">
                  {activeCount}
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {open && filters && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="Filter candidates"
            className="absolute right-0 top-full mt-2 z-50 w-[288px] bg-white border border-[var(--beige-400)] rounded-lg shadow-[var(--shadow-lg)] p-1.5 animate-[emaIn_150ms_var(--ease-out-quint)]"
          >
            <div className="flex items-center gap-2 px-2 pt-1.5 pb-2">
              <span className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)] flex-1">
                Narrow the list
              </span>
              {activeCount > 0 && (
                <button
                  onClick={() => onClearFilters?.()}
                  className="text-xs text-[var(--fg2)] rounded-xs px-1 hover:text-[var(--fg1)] hover:bg-[var(--beige-100)] active:bg-[var(--beige-200)] cursor-pointer"
                >
                  Clear all
                </button>
              )}
            </div>
            {filters.map((f) => {
              const on = active?.has(f.id) ?? false;
              return (
                <button
                  key={f.id}
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => onToggleFilter?.(f.id)}
                  className={cx(
                    'w-full flex items-start gap-2.5 px-2 py-2 rounded-md text-left cursor-pointer',
                    'transition-colors duration-150 hover:bg-[var(--beige-100)] active:bg-[var(--beige-200)]',
                  )}
                >
                  <span className={cx(
                    'size-4 rounded-xs border flex items-center justify-center shrink-0 mt-px',
                    'transition-colors duration-150',
                    on
                      ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-[var(--brand-primary-foreground)]'
                      : 'border-[var(--beige-600)] bg-white',
                  )}>
                    {on && <Check size={10} weight="bold" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-[var(--fg1)]">{f.label}</span>
                    {/* A filter you cannot explain is a filter nobody trusts. */}
                    <span className="block text-xs text-[var(--fg2)] mt-0.5 leading-[16px]">{f.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* The result count is the only feedback that a query did anything, so a
          screen reader has to hear it change. */}
      <span role="status" aria-live="polite" className="sr-only">
        {query ? `${resultCount} candidates match ${query}` : ''}
      </span>
    </div>
  );
}

/**
 * The no-match state, shared by all three candidate layouts.
 *
 * "Nothing here yet" is the wrong sentence when a query is active: it blames
 * the search when the cause is four characters in a text box. It also has to
 * say which fields were searched, because the failure is usually that someone
 * typed a skill into a box that only knows names, companies, titles and places.
 */
export function NoQueryMatch({ query, onClear, compact }: {
  query: string; onClear: () => void; compact?: boolean;
}) {
  return (
    <div className={cx('text-center', compact ? 'p-8' : 'p-10')}>
      <MagnifyingGlass size={22} className="mx-auto text-[var(--fg3)] mb-2" />
      <div className="text-sm font-medium text-[var(--fg1)]">No candidates match “{query}”.</div>
      <div className="text-sm text-[var(--fg2)] mt-1">
        Names, companies, titles and locations are searched.
      </div>
      <button
        onClick={onClear}
        className="mt-3 text-sm font-medium text-[var(--brand-primary)] hover:underline cursor-pointer"
      >
        Clear search
      </button>
    </div>
  );
}
