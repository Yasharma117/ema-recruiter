import React from 'react';
import {
  Sparkle, PencilSimple, PaperPlaneTilt, EnvelopeSimple, LinkedinLogo,
  Check, Warning, Lock,
} from '@phosphor-icons/react';
import { SEARCH } from '../data/search';
import { STATES, isHalted } from '../lib/outreach';
import { resolveBody } from '../components/SequenceEditor';
import {
  Avatar, Badge, Button, Card, Checkbox, EmptyState, Tabs, Textarea, ToastStack, cx,
} from '../components/ui';
import { AppShell } from '../components/AppShell';
import { useStore } from '../store';

/**
 * Messages — one place for everything Ema has written and not yet sent.
 *
 * Per-candidate editing answers "fix this one message". It does not answer
 * "the intro email is wrong for everybody", which is the actual time sink and
 * the thing the category is repeatedly criticised for burying. So this screen
 * has two halves:
 *
 *   Templates — edit once, applies to every unsent copy.
 *   Drafts    — the individual messages waiting on your approval.
 *
 * A template edit never touches a message already sent, and never silently
 * overwrites a per-candidate rewrite; those are listed as exceptions.
 */

type Tab = 'drafts' | 'templates';

export function MessagesScreen() {
  const store = useStore();
  const { candidates, outreach, sequence, toasts, dismissToast, toast } = store;
  const [tab, setTab] = React.useState<Tab>('drafts');
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const byId = React.useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);

  // Everything Ema wrote that has not gone out.
  const drafts = outreach.filter((r) => r.messages.some((m) => m.draft));

  const headerActions = drafts.length > 0 ? (
    <Button
      size="sm"
      icon={<PaperPlaneTilt size={14} />}
      disabled={!selected.size}
      onClick={() => {
        selected.forEach((id) => store.act(id, 'review-and-send'));
        toast(`${selected.size} message${selected.size === 1 ? '' : 's'} sent.`);
        setSelected(new Set());
      }}
    >
      {selected.size ? `Approve ${selected.size} and send` : 'Select messages to approve'}
    </Button>
  ) : undefined;

  return (
    <AppShell breadcrumbs={['Searches', SEARCH.name, 'Messages']} actions={headerActions}>
      <div className="h-full flex flex-col">
        <div className="shrink-0 px-5 pt-3.5 pb-2.5 border-b border-[var(--beige-400)]">
          {/* Same measure and same centre as the cards below, so the tabs sit
              on the column they control rather than on the window. */}
          <div className="max-w-[860px] mx-auto w-full">
          <Tabs
            variant="segmented"
            value={tab}
            onChange={setTab}
            items={[
              { id: 'drafts', label: 'Awaiting your review', count: drafts.length },
              { id: 'templates', label: 'Sequence templates', count: sequence.length },
            ]}
          />
          <div className="text-xs text-[var(--fg2)] mt-2">
            {tab === 'drafts'
              ? 'Nothing here has been sent. Edit any message, or approve several at once.'
              : 'Editing a template rewrites every unsent copy. Messages already sent are never touched.'}
          </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {tab === 'drafts' ? (
            drafts.length ? (
              <div className="space-y-2.5 max-w-[860px] mx-auto">
                {drafts.map((r) => {
                  const c = byId.get(r.candidateId);
                  const draft = r.messages.find((m) => m.draft);
                  if (!c || !draft) return null;
                  return (
                    <DraftCard
                      key={r.candidateId}
                      name={c.name}
                      tone={c.avatarTone}
                      company={c.company}
                      state={r.state}
                      channel={draft.channel}
                      subject={draft.subject}
                      body={draft.body}
                      asks={draft.asks?.map((id) => store.criteria.find((x) => x.id === id)?.name ?? id)}
                      checked={selected.has(r.candidateId)}
                      onCheck={() => setSelected((p) => {
                        const n = new Set(p);
                        n.has(r.candidateId) ? n.delete(r.candidateId) : n.add(r.candidateId);
                        return n;
                      })}
                      onSave={(t: string) => { store.setDraftBody(r.candidateId, t); toast(`Draft for ${c.name.split(' ')[0]} updated.`); }}
                      onSend={() => store.act(r.candidateId, 'review-and-send')}
                    />
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={<Check size={22} />}
                title="Nothing waiting on you."
                body="Every drafted message has been sent or skipped. New drafts appear here as candidates enter outreach."
              />
            )
          ) : (
            <div className="space-y-3 max-w-[860px] mx-auto">
              {sequence.map((step) => {
                // Who this template still applies to, and who has diverged.
                const unsent = outreach.filter((r) => step.n > r.step && !isHalted(r));
                const overridden = unsent.filter((r) => r.stepBodies?.[step.n] !== undefined);
                return (
                  <TemplateCard
                    key={step.n}
                    n={step.n}
                    label={step.label}
                    channel={step.channel}
                    subject={step.subject}
                    delayDays={step.delayDays}
                    body={step.template}
                    appliesTo={unsent.length}
                    overridden={overridden.length}
                    onSave={(t: string) => {
                      store.setSequenceTemplate(step.n, t);
                      toast(`Step ${step.n} updated for ${unsent.length - overridden.length} unsent message${unsent.length - overridden.length === 1 ? '' : 's'}.`);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </AppShell>
  );
}

function DraftCard({
  name, tone, company, state, channel, subject, body, asks, checked, onCheck, onSave, onSend,
}: any) {
  const [editing, setEditing] = React.useState(false);
  const [buffer, setBuffer] = React.useState(body);
  React.useEffect(() => { setBuffer(body); }, [body]);

  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-2.5 mb-2.5">
        <Checkbox checked={checked} onChange={onCheck} label={`Select message to ${name}`} />
        <Avatar name={name} size={26} tone={tone} />
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold text-[var(--fg1)] truncate">{name}</div>
          <div className="text-xs text-[var(--fg3)] truncate">{company}</div>
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-[var(--fg3)]">
          {channel === 'email' ? <EnvelopeSimple size={12} /> : <LinkedinLogo size={12} />}
          {channel === 'email' ? 'Email' : 'LinkedIn'}
        </span>
        <Badge variant={STATES[state as keyof typeof STATES].tone as any} size="sm">
          {STATES[state as keyof typeof STATES].label}
        </Badge>
      </div>

      <div className="rounded-lg border border-[var(--ai-magic-border)] bg-[var(--ai-magic-bg-subtle)] p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkle size={12} weight="fill" className="text-[var(--ai-magic-text)]" />
          <span className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--ai-magic-text)]">
            Drafted by Ema · Review before sending
          </span>
        </div>

        {asks?.length > 0 && (
          <div className="text-xs text-[var(--fg2)] mb-2 px-2 py-1.5 rounded-sm bg-white/60 border border-[var(--beige-400)]">
            Asks about <span className="font-medium">{asks.join(', ')}</span> — unknown on the scorecard.
          </div>
        )}

        {subject && <div className="text-sm font-bold text-[var(--fg1)] mb-1">{subject}</div>}

        {editing ? (
          <>
            <Textarea autoFocus value={buffer} onChange={(e) => setBuffer(e.target.value)} rows={8} className="text-sm" />
            <div className="flex items-center gap-1.5 mt-2">
              <Button size="xs" onClick={() => { onSave(buffer); setEditing(false); }}>Save</Button>
              <Button size="xs" variant="ghost" color="altBrand" onClick={() => { setBuffer(body); setEditing(false); }}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm text-[var(--fg2)] whitespace-pre-line leading-[20px]">{body}</div>
            <div className="flex items-center gap-1.5 mt-2.5">
              <Button size="xs" color="aiMagic" icon={<PaperPlaneTilt size={11} />} onClick={onSend}>
                Approve and send
              </Button>
              <Button size="xs" variant="secondary" color="aiMagic" icon={<PencilSimple size={11} />}
                onClick={() => setEditing(true)}>
                Edit
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

function TemplateCard({
  n, label, channel, subject, delayDays, body, appliesTo, overridden, onSave,
}: any) {
  const [editing, setEditing] = React.useState(false);
  const [buffer, setBuffer] = React.useState(body);
  React.useEffect(() => { setBuffer(body); }, [body]);

  const affected = appliesTo - overridden;

  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="size-6 rounded-full bg-[var(--beige-200)] text-[var(--fg2)] text-xs font-bold flex items-center justify-center shrink-0">
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold text-[var(--fg1)]">{label}</div>
          <div className="text-xs text-[var(--fg3)]">
            {channel === 'email' ? 'Email' : 'LinkedIn'}
            {delayDays > 0 && ` · waits ${delayDays}d after the previous step`}
          </div>
        </div>
        <span className={cx('text-xs tabular-nums', affected ? 'font-bold text-[var(--fg1)]' : 'text-[var(--fg3)]')}>
          {affected} unsent
        </span>
      </div>

      {subject && (
        <div className="text-sm font-bold text-[var(--fg1)] mb-1.5">{subject}</div>
      )}

      {editing ? (
        <>
          <Textarea autoFocus value={buffer} onChange={(e) => setBuffer(e.target.value)} rows={9} className="text-sm" />
          <div className="flex items-center gap-2 mt-2">
            <Button size="xs" onClick={() => { onSave(buffer); setEditing(false); }}>
              Save for {affected} message{affected === 1 ? '' : 's'}
            </Button>
            <Button size="xs" variant="ghost" color="altBrand" onClick={() => { setBuffer(body); setEditing(false); }}>
              Cancel
            </Button>
            <span className="text-xs text-[var(--fg3)] ml-auto">
              <code className="font-mono">{'{first}'}</code> becomes their preferred name
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="text-sm text-[var(--fg2)] whitespace-pre-line leading-[20px] rounded-md bg-[var(--bg3)] border border-[var(--border-color)] p-2.5">
            {body}
          </div>
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            {/* "Edit for everyone" named the blast radius, and named it wrong:
                it reads as reaching every copy including the ones already sent.
                Naming the object instead — the template — says the same thing
                without the alarm, and the counterpart on a single candidate is
                already "Applies to this candidate only". */}
            <Button size="xs" variant="secondary" color="altBrand" icon={<PencilSimple size={11} />}
              onClick={() => setEditing(true)}>
              Edit template
            </Button>
            {overridden > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-[var(--warning-text)]">
                <Warning size={11} weight="bold" />
                {overridden} candidate{overridden === 1 ? ' has' : 's have'} a rewritten version — those keep theirs
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-[var(--fg3)] ml-auto">
              <Lock size={10} /> Already-sent copies are unaffected
            </span>
          </div>
        </>
      )}
    </Card>
  );
}
