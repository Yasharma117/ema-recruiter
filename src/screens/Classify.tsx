import React from 'react';
import { Sparkle, ArrowRight, Check, Question } from '@phosphor-icons/react';
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

const OUTCOMES: { id: Outcome; label: string; consequence: string; tone: string }[] = [
  {
    id: 'interested',
    label: 'Interested',
    consequence: 'Moves to scheduling a call',
    tone: 'data-[on=true]:bg-[var(--brand-primary)] data-[on=true]:border-[var(--brand-primary)] data-[on=true]:text-white',
  },
  {
    id: 'maybe-later',
    label: 'Maybe later',
    consequence: 'Snoozes, keeps them in the search',
    tone: 'data-[on=true]:bg-[var(--pending)] data-[on=true]:border-[var(--pending)] data-[on=true]:text-white',
  },
  {
    id: 'not-interested',
    label: 'Not interested',
    consequence: 'Closes and stops all follow-ups',
    tone: 'data-[on=true]:bg-[var(--beige-960)] data-[on=true]:border-[var(--beige-960)] data-[on=true]:text-white',
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
    <div className="space-y-3">
      {/* The reply, in full. */}
      <div className="rounded-lg border border-[var(--success-border)] bg-[var(--success-bg-subtle)] p-3">
        <div className="flex items-center gap-2 mb-2">
          <Avatar name={candidate.name} size={22} tone={candidate.avatarTone} />
          <span className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--success-text)]">
            {first} replied
          </span>
          <span className="text-xs text-[var(--fg3)] ml-auto">{reply?.at}</span>
        </div>
        <div className="text-sm text-[var(--fg1)] whitespace-pre-line leading-[21px]">
          {reply?.body ?? 'No reply body found.'}
        </div>
      </div>

      {/* Ema's reading — proposed, with its reasoning exposed. */}
      {proposed && (
        <div className="rounded-lg border border-[var(--ai-magic-border)] bg-[var(--ai-magic-bg-subtle)] p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkle size={13} weight="fill" className="text-[var(--ai-magic-text)]" />
            <span className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--ai-magic-text)]">
              Ema reads this as {OUTCOMES.find((o) => o.id === proposed.outcome)?.label.toLowerCase()}
            </span>
          </div>
          <p className="text-sm text-[var(--fg1)] leading-[20px]">{proposed.because}</p>
        </div>
      )}

      {/* Your call. */}
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--fg2)] mb-2">
          Your call
        </div>
        <div className="space-y-1.5">
          {OUTCOMES.map((o) => (
            <button
              key={o.id}
              data-on={choice === o.id}
              onClick={() => setChoice(o.id)}
              className={cx(
                'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md border text-left cursor-pointer',
                'transition-colors duration-150',
                'bg-white border-[var(--beige-500)] hover:border-[var(--focus-border)]',
                o.tone,
              )}
            >
              <span className={cx(
                'size-3.5 rounded-full border flex items-center justify-center shrink-0',
                choice === o.id ? 'border-current' : 'border-[var(--beige-600)]',
              )}>
                {choice === o.id && <span className="size-1.5 rounded-full bg-current" />}
              </span>
              <span className="text-sm font-medium">{o.label}</span>
              <ArrowRight size={11} className="opacity-50 shrink-0" />
              <span className="text-xs truncate">{o.consequence}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Second job: the reply answers a question we asked about an unknown cell. */}
      {resolvable.length > 0 && (
        <div className="rounded-lg border border-[var(--beige-500)] bg-[var(--bg3)] p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Question size={13} weight="bold" className="text-[var(--fg2)]" />
            <span className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--fg2)]">
              This answers what you asked
            </span>
          </div>
          {resolvable.map((r) => {
            const crit = criteria.find((c) => c.id === r.criterionId);
            if (!crit) return null;
            return (
              <div key={r.criterionId} className="mt-2 first:mt-0">
                <div className="text-sm text-[var(--fg1)]">{crit.name}</div>
                <div className="text-xs text-[var(--fg2)] mt-1 pl-2 border-l-2 border-[var(--success-border)]">
                  “{r.quote}”
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    size="xs"
                    icon={<Check size={11} weight="bold" />}
                    onClick={() => {
                      onResolveCell(r.criterionId, r.score, r.quote);
                      setResolved((prev) => new Set(prev).add(r.criterionId));
                    }}
                  >
                    Record as {r.score} of 5
                  </Button>
                  <button
                    onClick={() => setResolved((prev) => new Set(prev).add(r.criterionId))}
                    className="text-xs text-[var(--fg2)] hover:text-[var(--fg1)] cursor-pointer"
                  >
                    Leave unknown
                  </button>
                </div>
              </div>
            );
          })}
          <div className="text-xs text-[var(--fg3)] mt-2.5 pt-2.5 border-t border-[var(--beige-400)]">
            Recorded answers are kept as your judgement and survive a re-run.
          </div>
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
