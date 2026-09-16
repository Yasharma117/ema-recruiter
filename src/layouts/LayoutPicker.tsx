import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, X, Info } from '@phosphor-icons/react';
import { cx } from '../components/ui';
import { REGION_USAGE, SCREEN_USAGE, VARIANTS, type ScreenId, type VariantId } from './usage';

/** Variant lives in the URL, like the existing ?state= switches, so it is shareable. */
export function useVariant(screen: ScreenId): VariantId {
  const [params] = useSearchParams();
  const v = params.get('layout');
  return v === 'b' || v === 'c' ? v : 'a';
}

export function useUsageOverlay(): boolean {
  const [params] = useSearchParams();
  return params.get('usage') === '1';
}

/** Segmented A/B/C plus the usage toggle. Mounts into the AppShell header. */
export function LayoutPicker({ screen }: { screen: ScreenId }) {
  const [params, setParams] = useSearchParams();
  const active = useVariant(screen);
  const overlayOn = useUsageOverlay();
  const variants = VARIANTS[screen];

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  // ⌥U toggles the overlay, per the plan.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        set('usage', overlayOn ? null : '1');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [overlayOn, params]);

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 inline-flex items-center gap-0.5 p-0.5 bg-[var(--beige-100)] border border-[var(--beige-300)] rounded-sm">
        {variants.map((v) => (
          <button
            key={v.id}
            onClick={() => set('layout', v.id === 'a' ? null : v.id)}
            title={`${v.name} — ${v.bet}`}
            className={cx(
              'flex-1 h-7 rounded-xs text-xs font-medium cursor-pointer transition-all duration-150 uppercase tracking-wide',
              active === v.id
                ? 'bg-white text-[var(--fg1)] border border-[var(--beige-300)] shadow-[var(--shadow-xs)]'
                : 'text-[var(--fg2)] border border-transparent hover:text-[var(--fg1)]',
            )}
          >
            {v.id}
          </button>
        ))}
      </div>
      <button
        onClick={() => set('usage', overlayOn ? null : '1')}
        title="Usage overlay (⌥U)"
        className={cx(
          'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-sm border text-xs font-medium cursor-pointer transition-colors duration-150',
          overlayOn
            ? 'bg-[var(--beige-960)] border-[var(--beige-960)] text-white'
            : 'bg-white border-[var(--beige-500)] text-[var(--fg2)] hover:border-[var(--beige-700)]',
        )}
      >
        <Eye size={13} weight={overlayOn ? 'fill' : 'regular'} />
        Usage
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Usage overlay                                                             */
/* -------------------------------------------------------------------------- */

function Dots({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-[3px]" role="img" aria-label={`Frequency ${n} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cx('size-[6px] rounded-full', i <= n ? 'bg-[var(--brand-primary)]' : 'bg-[var(--beige-500)]')} />
      ))}
    </span>
  );
}

/**
 * Annotates each region with the hypothesis it was designed against, by reading
 * `data-usage="<id>"` off the live DOM and positioning a card over it. Reading
 * the real layout rather than a hardcoded map means the overlay cannot drift
 * out of sync with the variant it is describing.
 */
export function UsageOverlay({ screen }: { screen: ScreenId }) {
  const on = useUsageOverlay();
  const [, setParams] = useSearchParams();
  const [boxes, setBoxes] = React.useState<{ r: DOMRect; usage: (typeof REGION_USAGE)[ScreenId][number] }[]>([]);
  const meta = SCREEN_USAGE[screen];

  React.useEffect(() => {
    if (!on) { setBoxes([]); return; }
    const measure = () => {
      const found: typeof boxes = [];
      for (const usage of REGION_USAGE[screen]) {
        const el = document.querySelector(`[data-usage="${usage.id}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 40 || r.height < 20) continue;
        found.push({ r, usage });
      }
      setBoxes(found);
    };
    measure();
    const t = setInterval(measure, 400);
    window.addEventListener('resize', measure);
    return () => { clearInterval(t); window.removeEventListener('resize', measure); };
  }, [on, screen]);

  if (!on) return null;

  const close = () => setParams((p) => { const n = new URLSearchParams(p); n.delete('usage'); return n; }, { replace: true });

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none">
      <div className="absolute inset-0 bg-[rgba(35,33,25,0.55)]" />

      {boxes.map(({ r, usage }) => {
        const right = r.left > window.innerWidth * 0.55;
        return (
          <React.Fragment key={usage.id}>
            <div
              className="absolute border-2 border-[var(--brand-primary)] rounded-md bg-[rgba(251,250,247,0.10)]"
              style={{ left: r.left, top: r.top, width: r.width, height: r.height }}
            />
            <div
              className="absolute w-[260px] bg-white border border-[var(--beige-400)] rounded-lg shadow-[var(--shadow-lg)] p-2.5 pointer-events-auto"
              style={{
                left: right ? Math.max(8, r.left - 272) : Math.min(window.innerWidth - 268, r.right + 12),
                top: Math.min(window.innerHeight - 190, Math.max(8, r.top)),
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-sm font-medium text-[var(--fg1)] flex-1 truncate">{usage.label}</span>
                <Dots n={usage.frequency} />
              </div>
              <div className="text-xs text-[var(--fg2)] tabular-nums mb-1.5">
                {usage.touches} · {usage.dwell}
              </div>
              <div className="text-xs text-[var(--fg1)] leading-[16px]">
                <span className="text-[var(--fg3)]">For: </span>{usage.optimisedFor}
              </div>
              <div className="text-xs text-[var(--warning-text)] leading-[16px] mt-1 pt-1 border-t border-[var(--beige-300)]">
                <span className="opacity-70">If wrong: </span>{usage.costIfWrong}
              </div>
            </div>
          </React.Fragment>
        );
      })}

      {/* Screen-level hypothesis */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-6 w-[620px] max-w-[92vw] bg-white border border-[var(--beige-400)] rounded-lg shadow-[var(--shadow-xl)] p-4 pointer-events-auto">
        <div className="flex items-start gap-2.5">
          <Info size={15} weight="bold" className="text-[var(--brand-primary)] mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-[var(--fg1)]">
              <span className="font-medium">Unit of work:</span> {meta.unit} ·{' '}
              <span className="font-medium">{meta.touches}</span> · {meta.dwell} ·{' '}
              <span className="font-medium">dominant verb: {meta.verb}</span>
            </div>
            <p className="text-xs text-[var(--fg2)] mt-1.5 leading-[17px]">{meta.stake}</p>
          </div>
          <button onClick={close} aria-label="Close usage overlay"
            className="shrink-0 text-[var(--fg3)] hover:text-[var(--fg1)] cursor-pointer">
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
