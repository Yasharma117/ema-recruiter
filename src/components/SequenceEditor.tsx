import React from 'react';
import {
  Check, EnvelopeSimple, LinkedinLogo, PencilSimple, Sparkle, CaretDown, Lock,
} from '@phosphor-icons/react';
import type { OutreachRecord, SequenceStep } from '../lib/types';
import { useStore } from '../store';
import { isHalted } from '../lib/outreach';
import { Button, Textarea, cx } from './ui';

/**
 * The sequence, with every message readable and every unsent one editable.
 *
 * Approving the first message while steps 2–4 stay hidden means three more go
 * out in your name that you never read. So each step expands to its actual
 * body, pending steps can be rewritten, and sent ones are read-only with the
 * reason stated — you cannot recall an email.
 */

export function resolveBody(step: SequenceStep, record: OutreachRecord, firstName: string): string {
  return (record.stepBodies?.[step.n] ?? step.template).replace(/\{first\}/g, firstName);
}

export function SequenceEditor({
  record, firstName, onEdit,
}: {
  record: OutreachRecord;
  firstName: string;
  onEdit: (stepN: number, body: string) => void;
}) {
  const SEQUENCE = useStore().sequence;
  const [open, setOpen] = React.useState<number | null>(null);
  const [editing, setEditing] = React.useState<number | null>(null);
  const [buffer, setBuffer] = React.useState('');
  const halted = isHalted(record);

  const save = (n: number) => { onEdit(n, buffer); setEditing(null); };

  return (
    <div>
      {SEQUENCE.map((step, i) => {
        const sent = step.n <= record.step;
        const cancelled = halted && step.n > record.step;
        const active = !halted && step.n === record.step + 1;
        const expanded = open === step.n;
        const body = resolveBody(step, record, firstName);
        const edited = record.stepBodies?.[step.n] !== undefined;

        return (
          <div key={step.n} className="flex gap-2.5">
            <div className="flex flex-col items-center shrink-0">
              <span className={cx(
                'size-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                sent ? 'bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)]'
                  : active ? 'bg-white border-2 border-[var(--brand-primary)] text-[var(--brand-primary)]'
                  : 'bg-[var(--beige-200)] text-[var(--fg3)]',
              )}>
                {sent ? <Check size={10} weight="bold" /> : step.n}
              </span>
              {i < SEQUENCE.length - 1 && <span className="w-px flex-1 bg-[var(--beige-400)] min-h-5" />}
            </div>

            <div className={cx('pb-3 min-w-0 flex-1', cancelled && 'text-[var(--fg3)]')}>
              <button
                onClick={() => { setOpen(expanded ? null : step.n); setEditing(null); }}
                className="w-full flex items-center gap-1.5 text-left cursor-pointer group"
              >
                {step.channel === 'email'
                  ? <EnvelopeSimple size={12} className="text-[var(--fg3)] shrink-0" />
                  : <LinkedinLogo size={12} className="text-[var(--fg3)] shrink-0" />}
                <span className={cx('text-sm truncate', cancelled ? 'line-through text-[var(--fg3)]' : 'text-[var(--fg1)]')}>
                  {step.label}
                </span>
                {edited && (
                  <span className="text-[10px] uppercase tracking-wide font-bold text-[var(--success-text)] shrink-0">
                    Edited
                  </span>
                )}
                {sent && <Lock size={10} className="text-[var(--fg3)] shrink-0" />}
                <CaretDown
                  size={11}
                  weight="bold"
                  className={cx('ml-auto shrink-0 text-[var(--fg3)] transition-transform group-hover:text-[var(--fg1)]',
                    !expanded && '-rotate-90')}
                />
              </button>

              {step.delayDays > 0 && !expanded && (
                <div className="text-xs text-[var(--fg3)]">waits {step.delayDays}d after the previous step</div>
              )}

              {expanded && (
                <div className="mt-2 rounded-md border border-[var(--border-color)] bg-[var(--bg3)] p-2.5">
                  {step.delayDays > 0 && (
                    <div className="text-xs text-[var(--fg3)] mb-2">
                      Sends {step.delayDays} days after the previous step
                    </div>
                  )}
                  {step.subject && (
                    <div className="text-sm font-medium text-[var(--fg1)] mb-1.5">{step.subject}</div>
                  )}

                  {editing === step.n ? (
                    <>
                      <Textarea
                        autoFocus
                        value={buffer}
                        onChange={(e) => setBuffer(e.target.value)}
                        rows={7}
                        className="text-sm"
                      />
                      <div className="flex items-center gap-1.5 mt-2">
                        <Button size="xs" onClick={() => save(step.n)}>Save</Button>
                        <Button size="xs" variant="ghost" color="altBrand" onClick={() => setEditing(null)}>Cancel</Button>
                        <span className="text-xs text-[var(--fg3)] ml-auto">Applies to this candidate only</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-[var(--fg2)] whitespace-pre-line leading-[20px]">{body}</div>
                      <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-[var(--beige-300)]">
                        {sent ? (
                          <span className="text-xs text-[var(--fg3)]">
                            Already sent — this cannot be changed or recalled.
                          </span>
                        ) : cancelled ? (
                          <span className="text-xs text-[var(--fg3)]">
                            Cancelled — they replied, so this will not send.
                          </span>
                        ) : (
                          <>
                            <Button
                              size="xs"
                              variant="secondary"
                              color="altBrand"
                              icon={<PencilSimple size={11} />}
                              onClick={() => { setBuffer(body); setEditing(step.n); }}
                            >
                              Edit
                            </Button>
                            {edited && (
                              <Button size="xs" variant="ghost" color="altBrand"
                                onClick={() => onEdit(step.n, step.template)}>
                                Reset to Ema’s draft
                              </Button>
                            )}
                            <span className="inline-flex items-center gap-1 text-xs text-[var(--fg3)] ml-auto">
                              <Sparkle size={10} weight="fill" className="text-[var(--ai-magic-text)]" />
                              Drafted by Ema
                            </span>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Inline editor for the single pending draft, used where the full sequence is too much. */
export function DraftEditor({
  body, onSave, onSend, onSkip,
}: { body: string; onSave: (b: string) => void; onSend: () => void; onSkip: () => void }) {
  const [editing, setEditing] = React.useState(false);
  const [buffer, setBuffer] = React.useState(body);

  React.useEffect(() => { setBuffer(body); }, [body]);

  if (editing) {
    return (
      <>
        <Textarea autoFocus value={buffer} onChange={(e) => setBuffer(e.target.value)} rows={8} className="text-sm" />
        <div className="flex items-center gap-1.5 mt-2">
          <Button size="xs" onClick={() => { onSave(buffer); setEditing(false); }}>Save</Button>
          <Button size="xs" variant="ghost" color="altBrand" onClick={() => { setBuffer(body); setEditing(false); }}>
            Cancel
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="text-sm text-[var(--fg2)] whitespace-pre-line leading-[20px]">{body}</div>
      <div className="flex items-center gap-1.5 mt-2.5">
        <Button size="xs" color="aiMagic" onClick={onSend}>Approve and send</Button>
        <Button size="xs" variant="secondary" color="aiMagic" icon={<PencilSimple size={11} />}
          onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button size="xs" variant="ghost" color="altBrand" onClick={onSkip}>Skip</Button>
      </div>
    </>
  );
}
