import React from 'react';
import {
  X, BookmarkSimple, PaperPlaneTilt, CaretUp, CaretDown, Sparkle, Lock,
  Warning, ArrowsMerge, Clock, ShieldWarning, Buildings,
} from '@phosphor-icons/react';
import type { Candidate, Criterion } from '../lib/types';
import { rank } from '../lib/scoring';
import { Avatar, Badge, Button, IconButton, Tabs, cx } from '../components/ui';
import { CriterionAudit, ScorePill } from '../components/Score';
import { useStore } from '../store';

type Tab = 'overview' | 'scorecard' | 'news' | 'activity' | 'contact';

export function CandidateDrawer({
  candidate, criteria, onClose, onPrev, onNext,
}: {
  candidate: Candidate; criteria: Criterion[];
  onClose: () => void; onPrev?: () => void; onNext?: () => void;
}) {
  const [tab, setTab] = React.useState<Tab>('overview');
  const store = useStore();
  const { shortlist, toggleShortlist, overrideGate, setCellOverride, askInOutreach, toast } = store;
  const askedFor = [
    ...(store.pendingAsks[candidate.id] ?? []),
    ...(store.outreach.find((r) => r.candidateId === candidate.id)?.asks ?? []),
  ];
  const r = rank(candidate, criteria);
  const isShortlisted = shortlist.has(candidate.id);
  const inOutreach = store.outreach.some((x) => x.candidateId === candidate.id);

  /* Correcting a cell happens at the bottom of the Scorecard tab; the number it
     moves is the pill at the top of the drawer, 300px away and behind your
     hand. Replaying its entrance is what connects the two.
     Keyed on a counter, not on the value, so that J/K — which changes the score
     dozens of times a session by changing the candidate — never triggers it. */
  const [correction, setCorrection] = React.useState(0);
  const lastScore = React.useRef<{ id: string; value: number } | null>(null);
  React.useEffect(() => {
    const prev = lastScore.current;
    lastScore.current = { id: candidate.id, value: r.value };
    if (prev && prev.id === candidate.id && prev.value !== r.value) setCorrection((n) => n + 1);
  }, [candidate.id, r.value]);

  // J/K move between candidates without leaving the drawer.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); onNext?.(); }
      if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); onPrev?.(); }
      if (e.key === 's') { e.preventDefault(); toggleShortlist(candidate.id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [candidate.id, onClose, onNext, onPrev, toggleShortlist]);

  const ordered = [...criteria].sort((a, b) => (a.type === b.type ? 0 : a.type === 'required' ? -1 : 1));

  // Activity is derived, not hardcoded — anything that happens to this
  // candidate anywhere in the product has to be visible on the candidate.
  const rec = store.outreach.find((x) => x.candidateId === candidate.id);
  const activity: { at: string; who: string; what: string }[] = [
    { at: '14 Mar, 09:11', who: 'Ema', what: 'Profile enriched from 3 sources' },
    { at: '14 Mar, 09:12', who: 'Ema', what: `Scored against scorecard v3 — ${r.value.toFixed(1)}` },
    ...(shortlist.has(candidate.id) ? [{ at: '15 Mar, 14:22', who: 'Sarah Chen', what: 'Added to shortlist' }] : []),
    ...(rec?.asks?.length
      ? [{ at: '15 Mar, 14:30', who: 'Sarah Chen', what: `Asked about ${rec.asks.map((id) => criteria.find((c) => c.id === id)?.name ?? id).join(', ')} in outreach` }]
      : []),
    ...(rec && rec.step > 0 ? [{ at: rec.messages[0]?.at ?? '—', who: 'Ema', what: `Outreach started · ${rec.step} of ${rec.totalSteps} steps sent` }] : []),
    ...(rec?.messages.some((m) => m.direction === 'in')
      ? [{ at: rec.messages.filter((m) => m.direction === 'in').slice(-1)[0].at, who: candidate.name, what: 'Replied' }]
      : []),
    ...(store.overrides
      .filter((o) => o.candidateId === candidate.id)
      .map((o) => ({
        at: o.at,
        who: o.via === 'reply' ? candidate.name : o.by,
        what: o.via === 'reply'
          ? `Answered ${criteria.find((c) => c.id === o.criterionId)?.name.toLowerCase() ?? 'a criterion'} in their reply`
          : `Set ${criteria.find((c) => c.id === o.criterionId)?.name.toLowerCase() ?? 'a criterion'} to ${o.score}`,
      }))),
    ...(rec?.meeting?.proposed
      ? [{ at: '16 Mar', who: 'Sarah Chen', what: `Proposed ${rec.meeting.proposed.length} times for a ${rec.meeting.durationMins} min call` }]
      : []),
    ...(rec?.meeting?.booked
      ? [
          {
            at: '16 Mar',
            who: (rec.meeting.movedBy ?? rec.meeting.lastChangedBy) === 'candidate' ? candidate.name : 'Sarah Chen',
            what: rec.meeting.previous
              ? `Moved the call from ${rec.meeting.previous.theirs} to ${rec.meeting.booked.theirs}`
              : `Booked a call for ${rec.meeting.booked.theirs}`,
          },
          ...(rec.meeting.confirmed
            ? [{ at: '16 Mar', who: 'Sarah Chen', what: 'Confirmed the new time' }]
            : []),
        ]
      : []),
  ];
  const currentEmployee = candidate.signals.some((s) => s.kind === 'current-employee');

  return (
    <>
      {/* Header */}
      <div className="shrink-0 border-b border-[var(--beige-400)]">
        <div className="flex items-start gap-3 p-4 pb-3">
          <Avatar name={candidate.name} size={44} tone={candidate.avatarTone} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-medium text-[var(--fg1)] truncate">{candidate.name}</h2>
              <span key={correction} className={cx(
                'inline-flex',
                correction > 0 && 'animate-[emaPop_200ms_var(--ease-out-quint)_backwards]',
              )}>
                <ScorePill ranking={r} size="sm" />
              </span>
            </div>
            <div className="text-sm text-[var(--fg2)] truncate">{candidate.title}</div>
            <div className="text-xs text-[var(--fg3)] mt-0.5">
              {candidate.company} · {candidate.companyTenure} · {candidate.location}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <IconButton icon={<CaretUp size={15} />} onClick={onPrev} disabled={!onPrev} title="Previous (K)" />
            <IconButton icon={<CaretDown size={15} />} onClick={onNext} disabled={!onNext} title="Next (J)" />
            <IconButton icon={<X size={16} />} onClick={onClose} title="Close (Esc)" />
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
          <Button
            size="sm"
            variant={isShortlisted ? 'primary' : 'secondary'}
            color={isShortlisted ? 'brand' : 'altBrand'}
            icon={<BookmarkSimple size={14} weight={isShortlisted ? 'fill' : 'regular'} />}
            onClick={() => toggleShortlist(candidate.id)}
          >
            {isShortlisted ? 'Shortlisted' : 'Shortlist'}
          </Button>
          {currentEmployee ? (
            <Button size="sm" variant="secondary" color="altBrand" icon={<Buildings size={14} />}
              onClick={() => toast('Internal mobility request sent to Anita Rao.')}>
              Refer to internal mobility
            </Button>
          ) : (
            <Button size="sm" variant="secondary" color="altBrand" icon={<PaperPlaneTilt size={14} />}
              disabled={inOutreach}
              onClick={() => {
                store.addToOutreach([candidate.id]);
                toast(`${candidate.name.split(' ')[0]} added to outreach. A draft is ready to review.`);
              }}>
              {inOutreach ? 'In outreach' : 'Start outreach'}
            </Button>
          )}
          <span className="ml-auto text-xs text-[var(--fg3)]">
            {candidate.source === 'internal'
              ? <span className="inline-flex items-center gap-1"><Lock size={11} /> Internal talent</span>
              : 'Public profile'}
          </span>
        </div>

        {/* Signals that change what you should do, surfaced before any tab. */}
        {candidate.signals.length > 0 && (
          <div className="px-4 pb-3 space-y-1.5">
            {candidate.signals.map((sig) => (
              <div key={sig.kind} className={cx(
                'flex items-start gap-2 text-xs px-2.5 py-2 rounded-md border',
                sig.kind === 'current-employee' || sig.kind === 'duplicate'
                  ? 'bg-[var(--info-bg-subtle)] border-[var(--info-border)] text-[var(--info-text)]'
                  : 'bg-[var(--warning-bg-subtle)] border-[var(--warning-border)] text-[var(--warning-text)]',
              )}>
                {sig.kind === 'stale' ? <Clock size={13} className="mt-px shrink-0" />
                  : sig.kind === 'duplicate' ? <ArrowsMerge size={13} className="mt-px shrink-0" />
                  : sig.kind === 'current-employee' ? <Buildings size={13} className="mt-px shrink-0" />
                  : <ShieldWarning size={13} className="mt-px shrink-0" />}
                <span><span className="font-medium">{sig.label}.</span> {sig.detail}</span>
              </div>
            ))}
          </div>
        )}

        <Tabs
          className="px-4 border-b-0"
          value={tab}
          onChange={setTab}
          items={[
            { id: 'overview', label: 'Overview' },
            { id: 'scorecard', label: 'Scorecard' },
            { id: 'news', label: 'News', count: candidate.news.length || undefined },
            { id: 'activity', label: 'Activity' },
            { id: 'contact', label: 'Contact' },
          ]}
        />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-[var(--ai-magic-border)] bg-[var(--ai-magic-bg-subtle)] p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkle size={13} weight="fill" className="text-[var(--ai-magic-text)]" />
                <span className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--ai-magic-text)]">
                  Written by Ema · Review before sending
                </span>
              </div>
              <p className="text-sm text-[var(--fg1)] leading-[21px]">{candidate.summary}</p>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--fg2)] mb-2">Experience</div>
              <div className="space-y-0">
                {candidate.roles.map((role, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0 pt-1">
                      <span className={cx('size-2 rounded-full', i === 0 ? 'bg-[var(--brand-primary)]' : 'bg-[var(--beige-600)]')} />
                      {i < candidate.roles.length - 1 && <span className="w-px flex-1 bg-[var(--beige-400)] min-h-6" />}
                    </div>
                    <div className="pb-4 min-w-0">
                      <div className="text-sm font-medium text-[var(--fg1)]">{role.title}</div>
                      <div className="text-xs text-[var(--fg2)]">
                        {role.company} · {role.start} – {role.end ?? 'present'}
                      </div>
                      {role.bullet && <div className="text-xs text-[var(--fg2)] mt-1 leading-[18px]">{role.bullet}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--fg2)] mb-1.5">Education</div>
              <div className="text-sm text-[var(--fg1)]">{candidate.education}</div>
            </div>
          </div>
        )}

        {tab === 'scorecard' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <ScorePill ranking={r} />
                <span className="text-[var(--fg2)]">
                  scored on {r.scored} of {r.total} criteria
                  {r.lowConfidenceCount > 0 && <span className="text-[var(--warning-text)]"> · {r.lowConfidenceCount} low confidence</span>}
                </span>
              </div>
            </div>

            {r.lowCoverage && (
              <div className="flex items-start gap-2 text-xs px-2.5 py-2 rounded-md bg-[var(--warning-bg-subtle)] border border-[var(--warning-border)] text-[var(--warning-text)]">
                <Warning size={13} className="mt-px shrink-0" />
                <span>
                  <span className="font-medium">Low coverage.</span> This score rests on {r.scored} of {r.total} criteria.
                  Unscored criteria are left out of the average rather than counted as zero.
                </span>
              </div>
            )}

            {r.gateFailed && (
              <div className={cx(
                'flex items-start gap-2 text-xs px-2.5 py-2 rounded-md border',
                r.gateOverridden
                  ? 'bg-[var(--success-bg-subtle)] border-[var(--success-border)] text-[var(--success-text)]'
                  : 'bg-[var(--error-bg-subtle)] border-[var(--error-border)] text-[var(--error-text)]',
              )}>
                <ShieldWarning size={13} className="mt-px shrink-0" />
                <div className="flex-1">
                  {r.gateOverridden ? (
                    <><span className="font-medium">Gate overridden by you.</span> Showing the uncapped score of {r.raw.toFixed(1)}.</>
                  ) : (
                    <><span className="font-medium">{r.gateReason}.</span> Capped at 2.9 — on merit alone this profile scores {r.raw.toFixed(1)}.</>
                  )}
                </div>
                <button
                  onClick={() => overrideGate(candidate.id)}
                  className="shrink-0 font-medium underline hover:no-underline cursor-pointer"
                >
                  {r.gateOverridden ? 'Re-apply gate' : 'Override'}
                </button>
              </div>
            )}

            {ordered.map((c) => (
              <CriterionAudit
                key={c.id}
                criterion={c}
                cs={candidate.scores.find((s) => s.criterionId === c.id)}
                asked={askedFor.includes(c.id)}
                onAsk={() => {
                  askInOutreach(candidate.id, c.id);
                  toast(`Ema will ask about ${c.name.toLowerCase()} in the next message.`);
                }}
                onOverride={(score) => {
                  setCellOverride({
                    candidateId: candidate.id,
                    criterionId: c.id,
                    score,
                    via: 'manual',
                    by: 'Sarah Chen',
                    at: '16 Mar',
                    originalScore: candidate.scores.find((s) => s.criterionId === c.id)?.score ?? null,
                  });
                  toast(`${c.name} set to ${score}. Rankings updated.`);
                }}
              />
            ))}

            <div className="text-xs text-[var(--fg3)] pt-1">
              Scored 14 Mar 2026, 09:12 · scorecard v3
            </div>
          </div>
        )}

        {tab === 'news' && (
          candidate.news.length ? (
            <div className="space-y-2">
              {candidate.news.map((n, i) => (
                <div key={i} className="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg3)]">
                  <div className="text-sm text-[var(--fg1)]">{n.title}</div>
                  <div className="text-xs text-[var(--fg3)] mt-1">{n.source} · {n.when}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[var(--fg2)] py-8 text-center">
              No recent news found for this candidate.
            </div>
          )
        )}

        {tab === 'activity' && (
          <div className="space-y-3 text-sm">
            {activity.map((a, i) => (
              <div key={i} className="flex gap-3">
                <span className="font-mono text-[11px] text-[var(--fg2)] w-24 shrink-0 pt-0.5">{a.at}</span>
                <span className="text-[var(--fg1)]">
                  <span className={cx('font-medium',
                    a.who === 'Ema' ? 'text-[var(--ai-magic-text)]'
                      : a.who === candidate.name ? 'text-[var(--success-text)]' : '')}>
                    {a.who}
                  </span>
                  {' '}{a.what}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === 'contact' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg3)]">
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--fg2)]">Email</div>
                <div className="text-sm text-[var(--fg1)] truncate mt-0.5">{candidate.email ?? 'None on file'}</div>
              </div>
              {candidate.email
                ? <Badge variant={candidate.emailVerified ? 'success' : 'warning'} size="sm">
                    {candidate.emailVerified ? 'Verified 12 Mar' : 'Unverified'}
                  </Badge>
                : <Badge variant="warning" size="sm">LinkedIn only</Badge>}
            </div>
            <div className="p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg3)]">
              <div className="text-xs font-bold uppercase tracking-[0.6px] text-[var(--fg2)]">LinkedIn</div>
              <div className="text-sm text-[var(--fg1)] mt-0.5">{candidate.linkedin ?? '—'}</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
