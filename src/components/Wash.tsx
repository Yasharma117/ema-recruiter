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
 * `ambient` halves it and drops the centre veil, for sitting behind real work
 * rather than behind an empty page.
 */
export function Wash({ tone, ambient }: { tone?: string | null; ambient?: boolean } = {}) {
  return (
    <div
      className={ambient ? 'wash wash-ambient' : 'wash'}
      data-tone={tone ?? undefined}
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
