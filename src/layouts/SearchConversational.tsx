import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkle, Check, MagnifyingGlass, PaperPlaneTilt } from '@phosphor-icons/react';
import { SEARCH, FILTERS, type FilterChip, type FilterMode } from '../data/search';
import { Avatar, Badge, Button, Card, Textarea, ToastStack, cx } from '../components/ui';
import { ModePicker, ScorecardRow, ScorecardInfo, DerivedFrom, MODE_DOT } from '../components/SearchControls';
import { AppShell } from '../components/AppShell';
import { useStore } from '../store';
import { UsageOverlay } from './LayoutPicker';

/**
 * Search · B — Conversational setup.
 *
 * Built on the block-vs-refine rule: **block on anything that changes who is in
 * the pool, refine anything that only changes the order.** So Ema asks two or
 * three questions — the ones where getting it wrong makes people invisible —
 * and infers everything else, with the configuration accreting visibly beside
 * the thread as a reviewable artifact rather than a hidden prompt.
 *
 * Sacrifices fast revision: editing filter #7 means scrolling a thread.
 */

type Step = { id: string; ask: string; why: string; options: string[]; chosen?: string };

const BLOCKING: Step[] = [
  {
    id: 'seniority',
    ask: 'What level are you hiring at?',
    why: 'Getting this wrong excludes people rather than re-ordering them.',
    options: ['Staff or Principal', 'Senior', 'Any level'],
  },
  {
    id: 'location',
    ask: 'Where can they be based?',
    why: 'Location is a hard constraint — it decides eligibility, not ranking.',
    options: ['SF Bay Area or US remote', 'US only', 'Anywhere'],
  },
];

export function SearchConversational() {
  const navigate = useNavigate();
  const store = useStore();
  const { toasts, dismissToast } = store;

  const [brief, setBrief] = React.useState(SEARCH.brief);
  const [sent, setSent] = React.useState(false);
  const [draft, setDraft] = React.useState(SEARCH.brief);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [filters, setFilters] = React.useState<FilterChip[]>(FILTERS);

  const answered = BLOCKING.filter((s) => answers[s.id]).length;
  const ready = answered === BLOCKING.length;
  const inferred = filters.filter((f) => f.mode !== 'must').length;

  const begin = () => { store.runSearch(); navigate('/candidates'); };

  return (
    <AppShell breadcrumbs={['Searches', SEARCH.name]} screen="search">
      <div className="h-full flex">
        {/* Thread */}
        <div className="w-[560px] shrink-0 border-r border-[var(--beige-300)] overflow-y-auto">
          <div className="p-5 space-y-4">
            <div data-usage="role">
              <Bubble from="ema">
                What role are you hiring for? Describe it however you like — I only need to
                ask about the things that decide who is eligible.
              </Bubble>
              {sent ? (
                <>
                  <Bubble from="you">{brief}</Bubble>
                  <div className="flex justify-end mt-1">
                    <button
                      onClick={() => { setDraft(brief); setSent(false); }}
                      className="text-xs text-[var(--fg3)] hover:text-[var(--fg1)] cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-3">
                  <Textarea
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && draft.trim()) {
                        setBrief(draft.trim()); setSent(true);
                      }
                    }}
                    rows={5}
                    placeholder="Staff ML engineer for payments risk. Needs production model serving at real scale, 7+ years, fintech preferred…"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      size="sm"
                      icon={<PaperPlaneTilt size={13} />}
                      disabled={!draft.trim()}
                      onClick={() => { setBrief(draft.trim()); setSent(true); }}
                    >
                      Send
                    </Button>
                    <span className="text-xs text-[var(--fg3)]">⌘⏎ to send</span>
                  </div>
                </div>
              )}
            </div>

            {sent && (
              <div data-usage="filters">
                <Bubble from="ema">
                  Two things change <span className="font-medium">who is in the pool</span>, so I need you
                  to confirm them. Everything else I inferred only affects the order, and you can
                  change it any time.
                </Bubble>

                <div className="space-y-2.5 mt-3">
                  {BLOCKING.map((step) => (
                    <Card key={step.id} className="p-3">
                      <div className="text-sm font-medium text-[var(--fg1)]">{step.ask}</div>
                      <div className="text-xs text-[var(--fg3)] mt-0.5 mb-2">{step.why}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {step.options.map((o) => {
                          const on = answers[step.id] === o;
                          return (
                            <button
                              key={o}
                              onClick={() => setAnswers((a) => ({ ...a, [step.id]: o }))}
                              className={cx(
                                'h-7 px-2.5 rounded-pill border text-xs font-medium cursor-pointer transition-colors duration-150',
                                on
                                  ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-[var(--brand-primary-foreground)]'
                                  : 'bg-white border-[var(--beige-500)] text-[var(--fg2)] hover:border-[var(--focus-border)]',
                              )}
                            >
                              {on && <Check size={10} weight="bold" className="inline mr-1" />}
                              {o}
                            </button>
                          );
                        })}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {ready && (
              <Bubble from="ema">
                That is everything I need. I inferred <span className="font-medium">{inferred} more</span> signals
                from your description — they shape the ranking, not eligibility. Review them on the
                right, or just begin.
              </Bubble>
            )}
          </div>
        </div>

        {/* The artifact, accreting as the thread progresses */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-[var(--beige-50)]">
          <div className="p-5 space-y-3">
            <div className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)]">
              Live configuration
            </div>

            {/* Nothing exists until Ema has read the role. That is the whole point
                of this layout, and showing a filled-in config beforehand broke it. */}
            {!sent ? (
              <Card className="p-6 text-center">
                <Sparkle size={20} weight="fill" className="text-[var(--ai-magic-text)] mx-auto mb-2" />
                <div className="text-sm font-medium text-[var(--fg1)]">Nothing here yet</div>
                <div className="text-xs text-[var(--fg2)] mt-1 leading-[17px]">
                  Describe the role on the left. Ema reads it and builds the filters and
                  scorecard here, for you to review before anything runs.
                </div>
              </Card>
            ) : (
              <>
                <Card className="p-3.5" data-usage="filters">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-medium text-[var(--fg1)]">Filters</span>
                    <span className="text-xs text-[var(--fg3)]">
                      {filters.filter((f) => f.mode === 'must').length} must-have
                    </span>
                  </div>
                  <div className="mb-2"><DerivedFrom /></div>
                  <div className="space-y-1.5">
                    {filters.map((f) => (
                      <div key={f.id} className="flex items-center gap-2">
                        <span className={cx('size-2 rounded-full shrink-0', MODE_DOT[f.mode])} />
                        <span className="text-sm text-[var(--fg1)] truncate flex-1">{f.value}</span>
                        <ModePicker
                          compact
                          value={f.mode}
                          name={f.value}
                          onChange={(m) => setFilters((prev) => prev.map((x) => (x.id === f.id ? { ...x, mode: m, suggested: false } : x)))}
                        />
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-3.5" data-usage="scorecard">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[var(--fg1)]">Scorecard</span>
                    <ScorecardInfo />
                    <span className="text-xs text-[var(--fg3)]">{store.criteria.length} criteria</span>
                  </div>
                  <div className="mb-2"><DerivedFrom /></div>
                  <div className="space-y-1.5">
                    {store.criteria.map((c) => (
                      <ScorecardRow
                        key={c.id}
                        compact
                        criterion={c}
                        onChange={(next) => store.setCriteria(store.criteria.map((x) => (x.id === c.id ? next : x)))}
                      />
                    ))}
                  </div>
                </Card>

                <Card className="p-3.5" data-usage="reach">
                  <div className="text-xs font-bold uppercase tracking-[1.2px] text-[var(--fg3)] mb-1.5">Reach</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-[var(--fg1)] tabular-nums">≈ 1,180</span>
                    <span className="text-sm text-[var(--fg2)]">profiles</span>
                  </div>
                </Card>
              </>
            )}

            <Button size="lg" block disabled={!ready} icon={<MagnifyingGlass size={16} weight="bold" />} onClick={begin}>
              Begin search
            </Button>
            <div className="text-xs text-[var(--fg3)] text-center">
              {!sent ? 'Describe the role to begin'
                : ready ? 'About 2 minutes'
                : `Answer ${BLOCKING.length - answered} more to begin`}
            </div>
          </div>
        </div>
      </div>

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <UsageOverlay screen="search" />
    </AppShell>
  );
}

function Bubble({ from, children }: { from: 'ema' | 'you'; children: React.ReactNode }) {
  if (from === 'you') {
    return (
      <div className="flex justify-end mt-3">
        <div className="max-w-[80%] rounded-lg rounded-tr-sm bg-[var(--brand-primary)] text-[var(--brand-primary-foreground)] px-3 py-2 text-sm leading-[20px] whitespace-pre-line">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2.5 mt-3">
      <span className="size-7 rounded-full bg-[var(--ai-magic)] text-white flex items-center justify-center shrink-0">
        <Sparkle size={13} weight="fill" />
      </span>
      <div className="flex-1 min-w-0 rounded-lg rounded-tl-sm bg-white border border-[var(--beige-400)] px-3 py-2 text-sm text-[var(--fg1)] leading-[20px]">
        {children}
      </div>
    </div>
  );
}
