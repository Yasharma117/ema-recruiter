/**
 * Self-check for the scoring + outreach logic. No framework.
 *   npx tsx src/lib/scoring.test.ts   (or: npm run check)
 */
import assert from 'node:assert/strict';
import { rank, rankAll, bandChangeCount, formatScore, GATE_CAP } from './scoring';
import { STATES, ACTIVE_STATES, nextAction, applyAction, isHalted, isInbound, STAT_GROUPS } from './outreach';
import { generateSlots } from '../data/availability';
import type { Candidate, Criterion, CriterionScore, OutreachState, OutreachRecord, Outcome } from './types';

const crit = (id: string, type: 'required' | 'preferred', weight: number): Criterion => ({
  id, name: id, bar: '', type, weight,
});

const sc = (criterionId: string, score: number | null, confidence: 'high' | 'medium' | 'low' = 'high'): CriterionScore => ({
  criterionId, score, confidence, summary: `${criterionId} summary`, evidence: [],
});

const cand = (id: string, scores: CriterionScore[], extra: Partial<Candidate> = {}): Candidate => ({
  id, name: id, title: '', company: '', companyTenure: '', location: '', yearsExperience: 0,
  source: 'public', profileUpdated: '', profileAgeMonths: 0, email: null, emailVerified: false,
  linkedin: null, avatarTone: 'green', roles: [], education: '', summary: '', news: [],
  scores, signals: [], ...extra,
});

// ---- composite -------------------------------------------------------------
{
  const criteria = [crit('a', 'required', 3), crit('b', 'preferred', 2)];
  // a: 3*2=6 weight at score 5 -> 30 ; b: 2*1=2 weight at score 1 -> 2
  // (30+2)/(6+2) = 4.0
  const r = rank(cand('c', [sc('a', 5), sc('b', 1)]), criteria);
  assert.equal(r.value, 4);
  assert.equal(r.band, 'good');
  assert.equal(r.scored, 2);
  assert.equal(r.total, 2);
}

// Required weighs double a preferred of the same recruiter weight.
{
  const req = rank(cand('x', [sc('a', 5), sc('b', 1)]), [crit('a', 'required', 1), crit('b', 'preferred', 1)]);
  const pref = rank(cand('x', [sc('a', 5), sc('b', 1)]), [crit('a', 'preferred', 1), crit('b', 'preferred', 1)]);
  assert.ok(req.value > pref.value, 'required should pull the composite harder');
}

// ---- unscored criteria are excluded, not zeroed ----------------------------
{
  const criteria = [crit('a', 'required', 3), crit('b', 'preferred', 2)];
  const r = rank(cand('c', [sc('a', 4), sc('b', null)]), criteria);
  assert.equal(r.value, 4, 'a null score must not drag the composite down');
  assert.equal(r.scored, 1);
  assert.equal(r.total, 2);
  assert.equal(r.coverage, 0.5);
  assert.ok(r.lowCoverage);
  assert.equal(formatScore(r), '~4.0', 'low coverage renders with a tilde');
}

// ---- the required gate caps, it does not exclude ---------------------------
{
  const criteria = [crit('a', 'required', 1), crit('b', 'preferred', 5)];
  // raw = (1*2*2 + 5*1*5) / (2 + 5) = 4.14 — comfortably above the cap
  const r = rank(cand('c', [sc('a', 2), sc('b', 5)]), criteria);
  assert.ok(r.gateFailed);
  assert.equal(r.value, GATE_CAP);
  assert.equal(r.band, 'no-match');
  assert.ok(r.raw > GATE_CAP, 'raw merit score is preserved behind the cap');
  assert.match(r.gateReason!, /Fails required/);

  // A capped strong candidate still sorts above a genuinely weak one.
  const weak = rank(cand('w', [sc('a', 1), sc('b', 1)]), criteria);
  assert.ok(r.value > weak.value);
}

// A required scoring 3 does not trip the gate.
{
  const r = rank(cand('c', [sc('a', 3)]), [crit('a', 'required', 3)]);
  assert.equal(r.gateFailed, false);
}

// Override lifts the cap and restores merit.
{
  const criteria = [crit('a', 'required', 1), crit('b', 'preferred', 5)];
  const r = rank(cand('c', [sc('a', 2), sc('b', 5)], { gateOverridden: true }), criteria);
  assert.ok(r.gateFailed && r.gateOverridden);
  assert.equal(r.value, r.raw);
  assert.ok(r.value > GATE_CAP);
}

// ---- confidence never moves the number -------------------------------------
{
  const criteria = [crit('a', 'required', 3)];
  const high = rank(cand('h', [sc('a', 4, 'high')]), criteria);
  const low = rank(cand('l', [sc('a', 4, 'low')]), criteria);
  assert.equal(high.value, low.value, 'confidence is presentation, not arithmetic');
  assert.equal(low.lowConfidenceCount, 1);
  assert.equal(high.lowConfidenceCount, 0);
}

// ---- recruiter override of a single score ----------------------------------
{
  const criteria = [crit('a', 'required', 3)];
  const s = sc('a', 2);
  s.override = { score: 5, by: 'Sarah Chen', at: '14 Mar', original: 2 };
  const r = rank(cand('c', [s]), criteria);
  assert.equal(r.value, 5, 'override replaces Ema\'s score');
  assert.equal(r.gateFailed, false, 'overriding above the threshold clears the gate');
  assert.equal(r.overriddenCount, 1);
}

// ---- ties break on coverage, then freshness --------------------------------
{
  const criteria = [crit('a', 'required', 3), crit('b', 'preferred', 2)];
  const thin = cand('thin', [sc('a', 4), sc('b', null)], { profileAgeMonths: 0 });
  const full = cand('full', [sc('a', 4), sc('b', 4)], { profileAgeMonths: 0 });
  const [first] = rankAll([thin, full], criteria);
  assert.equal(first.candidate.id, 'full', 'better-evidenced wins an equal score');

  const fresh = cand('fresh', [sc('a', 4), sc('b', 4)], { profileAgeMonths: 1 });
  const stale = cand('stale', [sc('a', 4), sc('b', 4)], { profileAgeMonths: 90 });
  assert.equal(rankAll([stale, fresh], criteria)[0].candidate.id, 'fresh');
  // Staleness loses ties but costs no points.
  assert.equal(rank(stale, criteria).value, rank(fresh, criteria).value);
}

// ---- re-weight preview ------------------------------------------------------
{
  const before = [crit('a', 'preferred', 1), crit('b', 'preferred', 5)];
  const after = [crit('a', 'preferred', 5), crit('b', 'preferred', 1)];
  const people = [cand('p1', [sc('a', 5), sc('b', 1)]), cand('p2', [sc('a', 3), sc('b', 3)])];
  assert.equal(bandChangeCount(people, before, after), 1, 'only p1 crosses a band');
}

// ---- no criteria at all ------------------------------------------------------
{
  const r = rank(cand('c', []), []);
  assert.equal(r.value, 0);
  assert.equal(r.coverage, 0);
}

// ---- the outreach state machine --------------------------------------------
{
  const base: OutreachRecord = {
    candidateId: 'c', state: 'scheduled', step: 1, totalSteps: 4,
    senderId: 's', lastActivity: '', nextAt: 6, messages: [],
  };
  const all = Object.keys(STATES) as OutreachState[];

  // 13 active + 4 terminal.
  assert.equal(ACTIVE_STATES.length, 18, 'expected 18 active states');
  assert.equal(all.length - ACTIVE_STATES.length, 4, 'expected 4 terminal states');

  // Every state answers "what next" — the brief asks for this twice.
  for (const state of all) {
    const a = nextAction({ ...base, state });
    assert.ok(a.label.length > 0, `${state} has no next-action label`);
    if (STATES[state].kind === 'you' || STATES[state].kind === 'blocked') {
      assert.equal(a.kind, 'human', `${state} should require a human`);
      assert.ok(a.primary, `${state} needs a primary action`);
    }
    if (STATES[state].kind === 'waiting') {
      assert.equal(a.kind, 'waiting', `${state} should be waiting, not human`);
      assert.ok(!a.primary, `${state} must not present a primary action`);
    }
    if (STATES[state].kind === 'terminal') {
      assert.equal(a.kind, 'none', `${state} should have no pending action`);
    }
    assert.ok(STATES[state].means.length > 0, `${state} has no meaning line`);
  }

  // Every state a group claims exists, and every state belongs to exactly one group.
  const grouped = STAT_GROUPS.flatMap((g) => g.states);
  assert.equal(new Set(grouped).size, grouped.length, 'a state appears in two stat groups');
  for (const state of all) {
    assert.ok(grouped.includes(state), `${state} is in no stat group`);
  }
}

// Sending turns the draft into a real message and moves the step.
{
  const r: OutreachRecord = {
    candidateId: 'c', state: 'draft-ready', step: 0, totalSteps: 4,
    senderId: 's', lastActivity: '', nextAt: null,
    messages: [{ channel: 'linkedin', direction: 'out', body: 'hi', at: 'Draft', draft: true }],
  };
  const { record } = applyAction(r, 'review-and-send');
  assert.equal(record.state, 'sent');
  assert.equal(record.step, 1);
  assert.ok(!record.messages[0].draft, 'the draft must become a sent message');
  assert.notEqual(record.messages[0].at, 'Draft', 'sent message needs a real timestamp');
}

// The last step lands in sequence-finished, not an endless "sent".
{
  const r: OutreachRecord = {
    candidateId: 'c', state: 'draft-ready', step: 3, totalSteps: 4,
    senderId: 's', lastActivity: '', nextAt: null,
    messages: [{ channel: 'email', direction: 'out', body: 'hi', at: 'Draft', draft: true }],
  };
  assert.equal(applyAction(r, 'review-and-send').record.state, 'sequence-finished');
}

// Classification applies the outcome the human picked, not Ema's proposal.
{
  const r: OutreachRecord = {
    candidateId: 'c', state: 'replied', step: 2, totalSteps: 4,
    senderId: 's', lastActivity: '', nextAt: null, messages: [],
    proposedRead: { outcome: 'interested', because: 'asked for a call' },
  };
  for (const [outcome, expected] of [
    ['interested', 'interested'], ['maybe-later', 'maybe-later'], ['not-interested', 'not-interested'],
  ] as [Outcome, OutreachState][]) {
    const { record } = applyAction(r, 'read-and-classify', { outcome });
    assert.equal(record.state, expected);
    assert.equal(record.proposedRead, undefined, 'the proposal is consumed once decided');
  }
  // Ema's reading is never applied on its own.
  assert.equal(applyAction(r, 'read-and-classify').record.state, 'replied');
}

// A reply halts the sequence; scheduled work does not.
{
  const mk = (state: OutreachState): OutreachRecord => ({
    candidateId: 'c', state, step: 2, totalSteps: 4,
    senderId: 's', lastActivity: '', nextAt: 4, messages: [],
  });
  for (const s of ['replied', 'interested', 'maybe-later', 'not-interested'] as OutreachState[]) {
    assert.ok(isInbound(s), `${s} is inbound`);
    assert.ok(isHalted(mk(s)), `${s} must halt the sequence`);
  }
  assert.ok(!isHalted(mk('sent')), 'an in-flight sequence is not halted');
  assert.ok(isHalted(mk('cancelled')), 'terminal states halt too');
}

// Every action lands on a real state, and clears the arrival highlight.
{
  const r: OutreachRecord = {
    candidateId: 'c', state: 'bounced', step: 1, totalSteps: 4,
    senderId: 's', lastActivity: '', nextAt: null, messages: [], isNew: true,
  };
  const ids = ['find-address', 'switch-channel', 'retry', 'skip', 'suppress', 'restart'] as const;
  for (const id of ids) {
    const { record } = applyAction(r, id);
    assert.ok(STATES[record.state], `${id} produced an unknown state`);
    assert.equal(record.isNew, false, `${id} should clear the new-arrival flag`);
  }
}

// ---- scheduling ------------------------------------------------------------
{
  const mkSlot = (id: string, yours: string, theirs: string) =>
    ({ id, startsAt: id, yours, theirs });
  const interested: OutreachRecord = {
    candidateId: 'c', state: 'interested', step: 2, totalSteps: 4,
    senderId: 's', lastActivity: '', nextAt: null, messages: [], isNew: true,
  };
  const a = mkSlot('a', 'Tue 24 Mar · 07:00', 'Tue 24 Mar · 16:00');
  const b = mkSlot('b', 'Thu 26 Mar · 07:30', 'Thu 26 Mar · 16:30');

  // Proposing waits on them; booking lands straight on the calendar.
  const proposed = applyAction(interested, 'send-invite', {
    meeting: { durationMins: 30, proposed: [a, b] },
  }).record;
  assert.equal(proposed.state, 'times-proposed');
  assert.equal(proposed.meeting?.proposed?.length, 2);
  assert.equal(proposed.meeting?.lastChangedBy, 'you');
  assert.equal(proposed.isNew, false, 'acting clears the arrival flag');

  const booked = applyAction(interested, 'send-invite', {
    meeting: { durationMins: 45, booked: a },
  }).record;
  assert.equal(booked.state, 'call-booked');
  assert.equal(booked.meeting?.booked?.id, 'a');

  // send-invite with no meeting is a no-op, not a broken state.
  assert.equal(applyAction(interested, 'send-invite').record.state, 'interested');

  // A reschedule keeps what it moved from, so the UI can say what changed.
  const moved: OutreachRecord = {
    ...interested,
    state: 'reschedule-requested',
    meeting: { durationMins: 30, previous: a, booked: b, lastChangedBy: 'candidate' },
  };
  assert.match(nextAction(moved).label, /Thu 26 Mar/, 'the row names the new time');
  const confirmed = applyAction(moved, 'confirm-new-time').record;
  assert.equal(confirmed.state, 'call-booked');
  assert.equal(confirmed.meeting?.previous?.id, 'a', 'what it moved from is preserved');
  assert.equal(confirmed.meeting?.lastChangedBy, 'you');

  // Cancelling a call returns them to interested with the meeting cleared.
  const cancelled = applyAction({ ...interested, state: 'call-booked', meeting: { durationMins: 30, booked: a } }, 'cancel-call').record;
  assert.equal(cancelled.state, 'interested');
  assert.equal(cancelled.meeting, undefined);

  // The call completes and exits through a decision, not a dead end.
  assert.equal(applyAction(moved, 'mark-call-done').record.state, 'call-done');
  const done: OutreachRecord = { ...interested, state: 'call-done' };
  assert.equal(applyAction(done, 'hand-off').record.state, 'handed-off');
  assert.equal(applyAction(done, 'not-a-fit').record.state, 'not-interested');

  // Scheduling halts the outreach sequence — no follow-ups once a call is on.
  for (const st of ['times-proposed', 'call-booked', 'reschedule-requested', 'call-done'] as OutreachState[]) {
    assert.ok(isHalted({ ...interested, state: st }), `${st} must halt follow-ups`);
  }

  // Opening the scheduling panel is not itself a transition.
  assert.equal(applyAction(interested, 'schedule-call').record.state, 'interested');
}

// ---- availability: both clocks, and the match is grounded in their words ----
{
  const hint = { quote: 'Tuesday or Thursday afternoon CET', days: ['Tue', 'Thu'], fromHour: 12, toHour: 18 };
  const slots = generateSlots('CET', hint);
  assert.ok(slots.length > 0);
  const matches = slots.filter((s) => s.matchesHint && !s.busy);
  assert.ok(matches.length > 0, 'the stated window must yield real slots');
  for (const m of matches) {
    const theirHour = Number(m.theirs.split(' · ')[1].slice(0, 2));
    assert.ok(theirHour >= 12 && theirHour < 18, `${m.theirs} is outside the window they named`);
    // Stockholm afternoon is San Francisco early morning — the UI must flag it.
    assert.ok(m.outsideCoreHours, 'a 07:00 call should be flagged as outside core hours');
  }
  // A candidate in the recruiter's own zone needs no flag.
  const local = generateSlots('PDT').filter((s) => !s.outsideCoreHours);
  assert.ok(local.length > 0);
  assert.equal(local[0].yours.split(' · ')[1], local[0].theirs.split(' · ')[1]);
}

console.log('scoring + outreach self-check passed');
