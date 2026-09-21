import React from 'react';
import { X, Sparkle, BookmarkSimple, CaretDown, CaretRight } from '@phosphor-icons/react';
import type { Candidate, Criterion } from '../lib/types';
import { bandOfCriterion, effectiveScore, rank } from '../lib/scoring';
import { Avatar, Button, IconButton, Modal, cx } from '../components/ui';
import { BAND_TEXT, ScorePill } from '../components/Score';
import { useStore } from '../store';

/** Rows where the spread across candidates is this wide open under "Where they differ". */
const DIVERGENCE = 2;

export function CompareModal({
  open, onClose, candidates, criteria,
}: { open: boolean; onClose: () => void; candidates: Candidate[]; criteria: Criterion[] }) {
  const { shortlist, toggleShortlist, pass } = useStore();
  const [differencesFirst, setDifferencesFirst] = React.useState(true);
  const [sameOpen, setSameOpen] = React.useState(false);

  if (!open || candidates.length < 2) return null;

  const scoreFor = (c: Candidate, criterionId: string) => {
    const cs = c.scores.find((s) => s.criterionId === criterionId);
    return cs ? effectiveScore(cs) : null;
  };

  const rows = criteria.map((criterion) => {
    const values = candidates.map((c) => scoreFor(c, criterion.id));
    const present = values.filter((v): v is number => v !== null);
    const spread = present.length > 1 ? Math.max(...present) - Math.min(...present) : 0;
    return { criterion, values, spread, max: present.length ? Math.max(...present) : null };
  });

  const differing = rows.filter((r) => r.spread >= DIVERGENCE);
  const same = rows.filter((r) => r.spread < DIVERGENCE);
  const ordered = differencesFirst ? differing : rows;

  // Ema's read: name the tradeoff rather than declare a winner.
  const emaRead = (() => {
    if (candidates.length !== 2 || !differing.length) return null;
    const [a, b] = candidates;
    const ra = rank(a, criteria), rb = rank(b, criteria);
    const aWins = differing.filter((r) => (r.values[0] ?? 0) > (r.values[1] ?? 0));
    const bWins = differing.filter((r) => (r.values[1] ?? 0) > (r.values[0] ?? 0));
    if (!aWins.length || !bWins.length) return null;
    const close = Math.abs(ra.value - rb.value) < 0.35;
    return (
      <>
        {close ? `Both score around ${ra.value.toFixed(1)}.` : `${a.name.split(' ')[0]} scores higher overall, but the split matters.`}{' '}
        {a.name.split(' ')[0]} is stronger on {aWins[0].criterion.name.toLowerCase()} ({aWins[0].values[0]} vs {aWins[0].values[1] ?? '—'});{' '}
        {b.name.split(' ')[0]} is stronger on {bWins[0].criterion.name.toLowerCase()} ({bWins[0].values[1]} vs {bWins[0].values[0] ?? '—'}).{' '}
        If this is the first senior hire on the team, weight {bWins[0].criterion.name.toLowerCase()}. If it sits under an existing lead, weight {aWins[0].criterion.name.toLowerCase()}.
      </>
    );
  })();

  const colWidth = 200;

  const Row = ({ r }: { r: typeof rows[number] }) => (
    <tr className="border-t border-[var(--beige-300)]">
      <th scope="row" className="text-left align-top p-3 sticky left-0 bg-white z-10 border-r border-[var(--beige-300)]">
        <div className="text-sm font-medium text-[var(--fg1)]">{r.criterion.name}</div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={cx(
            'text-[10px] uppercase tracking-[1px] font-bold px-1.5 py-0.5 rounded-xs',
            r.criterion.type === 'required' ? 'bg-[var(--beige-200)] text-[var(--fg2)]' : 'bg-[var(--beige-100)] text-[var(--fg3)]',
          )}>
            {r.criterion.type}
          </span>
          <span className="text-xs text-[var(--fg3)] tabular-nums">×{r.criterion.weight}</span>
        </div>
      </th>
      {candidates.map((c, i) => {
        const v = r.values[i];
        const cs = c.scores.find((s) => s.criterionId === r.criterion.id);
        const best = v !== null && v === r.max && r.spread >= DIVERGENCE;
        return (
          <td key={c.id} className={cx('align-top p-3 border-l border-[var(--beige-200)]', best && 'bg-[var(--success-bg-subtle)]')}
            style={{ borderLeftWidth: best ? 2 : 1, borderLeftColor: best ? 'var(--success)' : undefined }}>
            <div className="flex items-baseline gap-2">
              <span className={cx('text-lg font-bold tabular-nums', v !== null ? BAND_TEXT[bandOfCriterion(v)!] : 'text-[var(--fg3)]')}>
                {v ?? '—'}
              </span>
              {cs?.confidence === 'low' && (
                <span className="text-[10px] uppercase tracking-wide text-[var(--warning-text)]">Inferred</span>
              )}
            </div>
            <div className="text-xs text-[var(--fg2)] mt-1 leading-[17px]">
              {cs?.summary ?? 'No evidence found'}
            </div>
          </td>
        );
      })}
    </tr>
  );

  return (
    <Modal label="Compare candidates" open={open} onClose={onClose} width={Math.min(240 + candidates.length * colWidth + 48, 1240)} className="max-h-[92vh]">
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 shrink-0">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-[var(--fg1)]">Compare {candidates.length} candidates</h2>
          <p className="text-sm text-[var(--fg2)] mt-0.5">
            Same evidence as the scorecard, side by side.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--fg2)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={differencesFirst}
            onChange={(e) => setDifferencesFirst(e.target.checked)}
            className="accent-[var(--brand-primary)] size-3.5 cursor-pointer"
          />
          Differences first
        </label>
        <IconButton icon={<X size={16} />} onClick={onClose} title="Close" />
      </div>

      {emaRead && (
        <div className="mx-5 mb-3 rounded-lg border border-[var(--ai-magic-border)] bg-[var(--ai-magic-bg-subtle)] p-3 shrink-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkle size={13} weight="fill" className="text-[var(--ai-magic-text)]" />
            <span className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--ai-magic-text)]">
              Ema's read · Review before deciding
            </span>
          </div>
          <p className="text-sm text-[var(--fg1)] leading-[21px]">{emaRead}</p>
        </div>
      )}

      <div className="flex-1 overflow-auto border-t border-[var(--beige-300)]">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 z-30 bg-[var(--beige-100)] border-b border-r border-[var(--beige-400)] p-3 text-left w-[240px]">
                <span className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--fg2)]">Criterion</span>
              </th>
              {candidates.map((c) => {
                const r = rank(c, criteria);
                return (
                  <th key={c.id} className="bg-[var(--beige-100)] border-b border-l border-[var(--beige-400)] p-3 text-left align-top"
                    style={{ width: colWidth, minWidth: colWidth }}>
                    <div className="flex items-start gap-2">
                      <Avatar name={c.name} size={28} tone={c.avatarTone} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[var(--fg1)] truncate">{c.name}</div>
                        <div className="text-xs text-[var(--fg3)] truncate font-normal">{c.title}</div>
                        <div className="text-xs text-[var(--fg3)] truncate font-normal">{c.company}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <ScorePill ranking={r} size="sm" />
                      <span className="text-xs text-[var(--fg3)] font-normal tabular-nums">{r.scored} of {r.total}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {differencesFirst && (
              <tr>
                <td colSpan={candidates.length + 1} className="sticky left-0 bg-[var(--beige-100)] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.6px] text-[var(--fg2)] border-t border-[var(--beige-300)]">
                  Where they differ ({differing.length})
                </td>
              </tr>
            )}
            {ordered.map((r) => <Row key={r.criterion.id} r={r} />)}

            {differencesFirst && same.length > 0 && (
              <>
                <tr>
                  <td colSpan={candidates.length + 1} className="sticky left-0 bg-[var(--beige-100)] border-t border-[var(--beige-300)] p-0">
                    <button onClick={() => setSameOpen((o) => !o)}
                      className="w-full flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.6px] text-[var(--fg2)] hover:text-[var(--fg1)] cursor-pointer">
                      {sameOpen ? <CaretDown size={11} weight="bold" /> : <CaretRight size={11} weight="bold" />}
                      Where they're the same ({same.length})
                    </button>
                  </td>
                </tr>
                {sameOpen && same.map((r) => <Row key={r.criterion.id} r={r} />)}
              </>
            )}

            {/* Coverage pinned at the bottom — equal scores on unequal evidence
                is a different situation, and nothing else reveals it. */}
            <tr className="border-t-2 border-[var(--beige-500)] bg-[var(--beige-100)]">
              <th scope="row" className="text-left p-3 sticky left-0 bg-[var(--beige-100)] border-r border-[var(--beige-300)]">
                <div className="text-sm font-medium text-[var(--fg1)]">Coverage</div>
                <div className="text-xs text-[var(--fg3)] mt-0.5">Criteria with evidence</div>
              </th>
              {candidates.map((c) => {
                const r = rank(c, criteria);
                return (
                  <td key={c.id} className="p-3 border-l border-[var(--beige-200)]">
                    <span className={cx('text-sm font-medium tabular-nums', r.lowCoverage ? 'text-[var(--warning-text)]' : 'text-[var(--fg1)]')}>
                      {r.scored} of {r.total}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tbody>

          <tfoot>
            <tr className="border-t border-[var(--beige-400)]">
              <td className="sticky left-0 bg-white border-r border-[var(--beige-300)]" />
              {candidates.map((c) => (
                <td key={c.id} className="p-3 border-l border-[var(--beige-200)] bg-white">
                  <div className="flex flex-col gap-1.5">
                    <Button
                      size="sm"
                      variant={shortlist.has(c.id) ? 'primary' : 'secondary'}
                      color={shortlist.has(c.id) ? 'brand' : 'altBrand'}
                      icon={<BookmarkSimple size={13} weight={shortlist.has(c.id) ? 'fill' : 'regular'} />}
                      onClick={() => toggleShortlist(c.id)}
                      block
                    >
                      {shortlist.has(c.id) ? 'Shortlisted' : 'Shortlist'}
                    </Button>
                    <Button size="sm" variant="ghost" color="altBrand" onClick={() => pass([c.id])} block>
                      Pass
                    </Button>
                  </div>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </Modal>
  );
}
