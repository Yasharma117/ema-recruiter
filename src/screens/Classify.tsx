import React from 'react';
import { Sparkle, Check } from '@phosphor-icons/react';
import type { Candidate, Criterion, OutreachRecord, Outcome } from '../lib/types';
import { Avatar, Button, cx } from '../components/ui';

/**
 * Read and classify.
 *
 * You cannot classify what you have not read, so the reply comes first and in
 * full. Ema's reading is pre-selected but never pre-applied, and it shows its
 * reasoning on one line so you can disagree with the reasoning rather than
 * just the label. Each option states its consequence before you commit.
 *
 * When the outreach carried a question about an unknown criterion, this screen
 * does a second job: resolving that cell from the reply.
 */

/* Choosing is not committing.
   A selected option used to take the solid brand fill — the same green as the
   button that actually sends the thing, sitting directly above it. Two filled
   green blocks on one card, only one of which does anything. A selection now
   reads as a selection: its own tint, its own border, its own ink, and the
   fill stays reserved for the single action on the card. */
const OUTCOMES: { id: Outcome; label: string; consequence: string; tone: string; dot: string }[] = [
  {
    id: 'interested',
    label: 'Interested',
    consequence: 'Moves to scheduling a call',
    tone: 'data-[on=true]:bg-[var(--success-bg-subtle)] data-[on=true]:border-[var(--brand-primary)]',
    dot: 'border-[var(--brand-primary)] text-[var(--brand-primary)]',
  },
  {
    id: 'maybe-later',
    label: 'Maybe later',
    consequence: 'Snoozes, keeps them in the search',
    tone: 'data-[on=true]:bg-[var(--warning-bg-subtle)] data-[on=true]:border-[var(--warning-border)]',
    dot: 'border-[var(--warning)] text-[var(--warning)]',
  },
  {
    id: 'not-interested',
    label: 'Not interested',
    consequence: 'Closes and stops all follow-ups',
    tone: 'data-[on=true]:bg-[var(--bg3)] data-[on=true]:border-[var(--beige-800)]',
    dot: 'border-[var(--fg2)] text-[var(--fg2)]',
  },
];

export function ClassifyPanel({
  record, candidate, criteria, onClassify, onResolveCell,
}: {
  record: OutreachRecord;
  candidate: Candidate;
  criteria: Criterion[];
  onClassify: (outcome: Outcome) => void;
  onResolveCell: (criterionId: string, score: number, quote: string) => void;
}) {
  const proposed = record.proposedRead;
  const [choice, setChoice] = React.useState<Outcome | null>(proposed?.outcome ?? null);
  const [resolved, setResolved] = React.useState<Set<string>>(new Set());

  const reply = [...record.messages].reverse().find((m) => m.direction === 'in');
  const first = candidate.name.split(' ')[0];
  const resolvable = (proposed?.resolves ?? []).filter((r) => !resolved.has(r.criterionId));

  return (
    <div className="space-y-4">
      {/* The reply, in full. */}
      <div className="rounded-lg border border-[var(--success-border)] bg-[var(--success-bg-subtle)] p-3">
        <div className="flex items-center gap-2 mb-2">
          <Avatar name={candidate.name} size={22} tone={candidate.avatarTone} />
          <span className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--success-text-strong)]">
            {first} replied
          </span>
          <span className="text-xs text-[var(--fg3)] ml-auto">{reply?.at}</span>
        </div>
        <div className="text-sm text-[var(--fg1)] whitespace-pre-line leading-[21px]">
          {reply?.body ?? 'No reply body found.'}
        </div>
      </div>

      {/* Your call.
          Ema's reading used to get its own purple panel above three
          equal-weight options, so the card said "interested" three times — in
          the panel, in the selected row, and on the button — in three
          different colours, and the decision that was already made outweighed
          the reply it came from.

          The reading now belongs to the option it proposes. That row carries
          the tag and the reasoning; every other row is a single line. The tag
          stays on Ema's row when you pick a different one, so disagreeing with
          Ema looks like disagreeing with Ema. */}
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--fg2)] mb-2">
          Your call
        </div>
        {/* A grid, not a flex row. The label, the consequence and the tag
            were three inline items with a `truncate` between them — and
            `truncate` means `white-space: nowrap`, so that item's min-content
            width is the whole sentence. It never shrank, `ml-auto` collapsed
            to nothing, and the tag came to rest wherever each sentence
            happened to end. Three rows, three different ragged middles.

            Columns fix the alignment for good: the marker, the text, the tag.
            Every row is label over consequence, so the three read as one block
            and the eye only has to learn the shape once. */}
        <div className="space-y-1.5">
          {OUTCOMES.map((o) => {
            const on = choice === o.id;
            const emas = proposed?.outcome === o.id;
            return (
              <button
                key={o.id}
                data-on={on}
                onClick={() => setChoice(o.id)}
                className={cx(
                  'w-full grid grid-cols-[14px_minmax(0,1fr)_auto] items-start gap-x-2.5 gap-y-1',
                  'px-3 py-2.5 rounded-md border text-left cursor-pointer press',
                  'transition-colors duration-150',
                  'bg-white border-[var(--beige-500)] hover:border-[var(--focus-border)]',
                  o.tone,
                )}
              >
                <span className={cx(
                  'size-3.5 mt-[3px] rounded-full border flex items-center justify-center',
                  on ? o.dot : 'border-[var(--beige-600)]',
                )}>
                  {on && <span className="size-1.5 rounded-full bg-current" />}
                </span>

                <span className="text-sm font-medium text-[var(--fg1)]">{o.label}</span>

                {emas ? (
                  <span className="inline-flex items-center gap-1 mt-[3px] text-[11px] font-bold uppercase tracking-[0.5px] text-[var(--ai-magic-text)]">
                    <Sparkle size={10} weight="fill" />
                    Ema&rsquo;s read
                  </span>
                ) : <span />}

                {/* Descriptive either way, so it keeps its own ink rather than
                    turning green with the row — the selection is carried by the
                    label, the border and the tint, and does not need a fourth voice. */}
                <span className="col-start-2 col-span-2 text-xs leading-[17px] text-[var(--fg2)]">
                  {o.consequence}
                </span>

                {/* Ema's sentence sits on a purple rule, the same purple as the
                    tag above it, so what Ema contributed is one visible thread
                    — and stays legible as such when you pick a different row.
                    The rule is --ai-magic-text, not --ai-magic-border: the
                    border step is 1.66:1 on this tint, close enough to the
                    beige rule on the quote below that the two marks said
                    nothing. A rail this small has to be the ink, not the edge. */}
                {emas && proposed?.because && (
                  <span className="col-start-2 col-span-2 text-xs leading-[17px] text-[var(--fg2)] pl-2.5 border-l-2 border-[var(--ai-magic-text)]">
                    {proposed.because}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Second job: the outreach carried a question about a blank scorecard
          cell, and the reply answered it.

          This block was reported as broken three times and rebuilt three times
          as a layout problem. It was not one. "Record as 4 of 5" never said
          four of five *what*, on what scale, replacing what — so the block was
          incomprehensible however well its rails lined up. What it needed was
          the bar — which is what turns "4 of 5" from a number into a
          judgement you can agree or disagree with. */}
      {resolvable.length > 0 && (
        <div className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg3)] p-3">
          <div className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--fg2)] mb-2.5">
            Your outreach asked about this
          </div>
          {resolvable.map((r) => {
            const crit = criteria.find((c) => c.id === r.criterionId);
            if (!crit) return null;
            return (
              <div key={r.criterionId} className="mt-4 first:mt-0">
                {/* The criterion is what this block is about, so it leads. */}
                <div className="text-sm font-medium text-[var(--fg1)]">{crit.name}</div>
                {/* Same phrasing the scorecard itself uses, so the number is
                    read against the same bar in both places. */}
                <div className="text-xs text-[var(--fg3)] leading-[17px] mt-1">
                  Bar for a 5: {crit.bar}
                </div>
                {/* Their words, set as a quotation rather than as more body
                    copy. The rule was --success-border, a pale mint that both
                    disappeared against this panel and implied the quote was a
                    pass mark rather than evidence. */}
                <blockquote className="text-xs text-[var(--fg2)] leading-[17px] mt-2 pl-2.5 border-l-2 border-[var(--border-color)] m-0">
                  &ldquo;{r.quote}&rdquo;
                </blockquote>
                {/* Two answers to one question, so two buttons of the same
                    height. A bare text link beside a filled button read as a
                    caption, not as the other option. */}
                <div className="flex items-center gap-1.5 mt-2.5 pl-2.5">
                  <Button
                    size="xs"
                    variant="secondary"
                    icon={<Check size={11} weight="bold" />}
                    onClick={() => {
                      onResolveCell(r.criterionId, r.score, r.quote);
                      setResolved((prev) => new Set(prev).add(r.criterionId));
                    }}
                  >
                    Record as {r.score} of 5
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    color="altBrand"
                    onClick={() => setResolved((prev) => new Set(prev).add(r.criterionId))}
                  >
                    Leave unknown
                  </Button>
                </div>
              </div>
            );
          })}
          <p className="text-xs text-[var(--fg3)] leading-[17px] mt-3 mb-0">
            Recorded on the scorecard as your judgement, and it survives a re-run.
          </p>
        </div>
      )}

      <Button
        block
        disabled={!choice}
        onClick={() => choice && onClassify(choice)}
      >
        {choice
          ? `Mark ${OUTCOMES.find((o) => o.id === choice)!.label.toLowerCase()}`
          : 'Pick an outcome'}
      </Button>
    </div>
  );
}
