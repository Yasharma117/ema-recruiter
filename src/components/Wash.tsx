import React from 'react';
import { cx } from './ui';
/**
 * Ema's hero motif — a dry-brush diagonal wash, sampled from ema.co.
 *
 * Shared by the two screens with no work on them: the landing page and the
 * search cold start. Everywhere else the app is a dense table and atmosphere
 * would just be noise behind data.
 *
 * Absolutely positioned, so the parent needs `relative`. The bands sweep in
 * once and resolve; nothing here loops. Styles live in src/styles/index.css.
 *
 * `tone` repaints the same composition in another key — used by the outreach
 * board, where the key tracks the selected stage's place in the funnel.
 * `ambient` drops the centre veil and measures the bands against the container
 * rather than the viewport, for sitting behind real work rather than an empty
 * page; `strength` sets how far down it is turned — the search screen keeps the
 * same painting through all three acts and only fades it.
 */
export function Wash({
  tone, ambient, strength, leaving, drift,
}: {
  tone?: string | null; ambient?: boolean; strength?: number;
  leaving?: boolean; drift?: boolean;
} = {}) {
  return (
    <div
      className={cx(
        ambient ? 'wash wash-ambient' : 'wash',
        leaving && 'wash-leaving',
        drift && 'wash-drift',
      )}
      data-tone={tone ?? undefined}
      style={strength !== undefined ? ({ ['--wash-strength' as string]: strength }) : undefined}
      aria-hidden
    >
      <span className="wash-base" />
      <span className="wash-s wash-1"><span className="wash-i" /></span>
      <span className="wash-s wash-2"><span className="wash-i" /></span>
      <span className="wash-s wash-3"><span className="wash-i" /></span>
      <span className="wash-s wash-4"><span className="wash-i" /></span>
      <span className="wash-veil" />
      <span className="wash-grain" />
    </div>
  );
}

/**
 * The wash, cross-faded when its tone changes.
 *
 * A keyed <Wash> alone is a cut, not a fade: React drops the old element on the
 * same frame the new one mounts, so the page blinks to bare canvas and the new
 * hue arrives from nothing — which reads as a glitch rather than a change. Two
 * layers are kept for the length of the transition, the outgoing one fading out
 * under the incoming one, so the colour is never absent.
 *
 * Only ever two: a fast run through the queue would otherwise stack a layer per
 * keypress, and each one is a filtered, masked composite.
 */
export function StageWash({ tone, strength }: { tone: string | null; strength: number }) {
  const [layers, setLayers] = React.useState(() => [{ id: 0, tone }]);
  const nextId = React.useRef(1);

  React.useEffect(() => {
    setLayers((prev) => (
      prev[prev.length - 1].tone === tone
        ? prev
        : [...prev.slice(-1), { id: nextId.current++, tone }]
    ));
  }, [tone]);

  // Once the incoming layer is fully in, the one beneath it has nothing to say.
  React.useEffect(() => {
    if (layers.length < 2) return;
    const t = setTimeout(() => setLayers((l) => l.slice(-1)), WASH_FADE_MS);
    return () => clearTimeout(t);
  }, [layers]);

  return (
    <>
      {layers.map((l, i) => (
        <Wash
          key={l.id}
          ambient
          tone={l.tone}
          strength={strength}
          leaving={i < layers.length - 1}
          /* Only while a change is in flight. A settled wash that kept drifting
             would be movement behind a screen you are reading. */
          drift={layers.length > 1}
        />
      ))}
    </>
  );
}

/** Matches the washIn / washOut duration in index.css. */
const WASH_FADE_MS = 700;
