# Recruiter sourcing and outreach — design notes

Three screens, all clickable: **Search** (`/search`), **Candidates and shortlist**
(`/candidates`), **Outreach** (`/outreach`). Built with the Ema design system —
Satoshi, the beige-on-white surface, deep green primary, Phosphor.

Each screen has two alternative layouts built alongside it, switchable on the
same data — see **[LAYOUTS.md](LAYOUTS.md)** for the exploration and the
recommendation per screen.

---

## What I assumed

**This is an AI Employee with a Dashboard surface, not a standalone recruiting
app.** Ema's own docs use *Dashboard* for a table-dense, high-volume AI Employee
interface, which is what a sourcing tool is. That decided the density: 14px body,
44px rows, a persistent left rail, no marketing whitespace.

**I used Ema Recruiter's documented object model rather than inventing one.** A
**Search** is the unit of work — one hiring initiative holding a job description,
**Filters** (Must / Preferred / Exclude), a **Scorecard**, candidates, and an
outreach sequence. Candidates split into **Public Profiles** and **Internal
Talent**, deduplicated into one ranked list. Outreach sends from named
**Senders** under a **Daily Candidate Limit**. Using the real vocabulary meant I
could spend the time on the parts the brief says are actually open.

**One recruiter, mock data, simulated sends.** No auth, no real ATS, no real
email. The demo opens mid-workflow: a search already run, nine people
shortlisted, outreach in flight.

**Desktop only, ≥1280px.** Two-monitor workflow. I'd rather say that than ship a
broken responsive table.

---

## What I ranked candidates on

Six criteria, each typed Required or Preferred, each weighted 1–5, each scored
1–5 per candidate:

| Criterion | Type | Weight |
|---|---|---|
| Production model serving at scale | Required | 3 |
| 7+ years, staff-level scope | Required | 3 |
| Fintech or regulated domain | Preferred | 2 |
| Technical leadership | Preferred | 2 |
| Risk or fraud modelling | Preferred | 2 |
| Open-source or published work | Preferred | 1 |

```
overall = Σ(weight × typeMult × score) / Σ(weight × typeMult)      typeMult: Required 2, Preferred 1
```

The criteria themselves are the least interesting part. Four decisions about
*how the number behaves* are what I'd defend:

**1. An unscored criterion is excluded from the denominator, not counted as
zero.** A missing signal is not a negative signal. Ema not finding evidence of
leadership is not evidence of no leadership. The cost is paid in **coverage**,
shown next to every score as `4.2 · 6 of 7`, with a tilde (`~4.2`) below 60%.
Coverage is what makes "these two both score 4.2" an honest statement — one of
them is a 4.2 on seven criteria, the other on three.

**2. A failed Required criterion caps the score at 2.9 rather than filtering the
candidate out.** A hard filter would hide Ema's extraction errors — the person
just vanishes and the recruiter never learns the scorecard was wrong. Capping
keeps them visible and sorted sensibly within the failed group, so "who nearly
cleared the bar" is one click away, and it gives the override somewhere to live.
The drawer shows `Fails required: Technical leadership (2). Capped at 2.9 — on
merit alone this profile scores 4.4`, with an **Override** control.

**3. Confidence never silently moves the number.** Low confidence means Ema
inferred rather than quoted. It changes the presentation — dashed chip border, an
`Inferred` tag, an amber evidence card reading *"Inferred from title only. No
supporting evidence in profile"* — and it loses ties. It does not adjust the
arithmetic, because a score that secretly corrects itself cannot be explained and
therefore cannot be trusted. **Amber means Ema guessed; purple means Ema wrote.**
Those are never the same colour anywhere in the product.

**4. Explanation is tiered by how much attention it costs.**
- **In the row, free**: the score pill, a criterion **sparkbar** (one segment per
  criterion, Required first, unscored as a hairline), coverage, and a ≤72-char
  clause — *"Strong: owns Radar inference at 40k req/s · Gap: led 2 engineers."*
  Every row says *why*, at forty-rows-a-screen density.
- **On hover**: one line per criterion with dots, score and evidence phrase.
- **In the drawer**: the audit view. Per criterion — the bar for a 5, a
  **"why not 5"** delta line (*"2 not 4: led a pod of 2, and the scorecard bar is
  a team of 5"*), and **evidence cards** that quote a dated, linked source, or
  state plainly that there isn't one.

**Correcting it is a first-class action.** Re-weighting in the right rail
re-ranks live with an *"18 candidates change band"* preview, row deltas and undo.
Any individual score can be overridden, and the audit trail keeps the original:
*"Ema scored 3 · you set 5 · 16 Mar, Sarah Chen."* The UI says
**"Corrections apply to this search only"** — we have not built a cross-search
training loop, so it does not imply one.

**Comparison** (2–4 candidates) puts criteria on rows and people in columns, and
opens with **Differences first**: rows where the spread is ≥2 float to the top
under *Where they differ*, the rest collapse. Coverage is pinned to the bottom
row. Above it, Ema names the trade-off instead of picking a winner — *"If this is
the first senior hire on the team, weight technical leadership. If it sits under
an existing lead, weight serving scale."*

---

## Outreach

Eighteen active states plus four terminal ones. The organising decision: **the table is
sorted "Needs you first."** Every row whose next action requires a person groups
under `Needs you (6)`; everything waiting on a clock or a candidate sits under
`In flight (3)`. The screen opens on the work.

**It's a table, not a kanban.** A board implies the recruiter drags people between
stages, but almost every transition here is machine- or candidate-driven. Dragging
someone from "Email sent" to "Interested" isn't a thing you should be able to do.

Every state resolves to one concrete next action — `Review draft`,
`Read and classify`, `Find another email`, `Use LinkedIn instead`,
`Reconnect Gmail`, `View the other search`. That mapping lives in one function so
the table, the grouping and the detail pane cannot disagree; a test asserts every
state has one.

The failure states are where the judgment shows, because the docs don't list
them: **bounced email**, **no email on file**, **LinkedIn weekly invite cap**
(auto-resumes Monday), **sender disconnected mid-sequence** (blocks that sender's
rows together, retries nothing silently), **replied out of band**, and
**already being contacted in a colleague's search**.

**Ema proposes, it never asserts.** A reply sets `Replied` and Ema's reading shows
as *"Ema read this as Interested · Confirm · Change"* in purple. Only a confirmed
outcome turns green. You can always tell which conclusions a machine reached.

### Scheduling the call

`Interested` is where most outreach tools stop and hand you a toast. The call is
the point of the whole funnel, so it gets real states: **times proposed → booked
→ (reschedule) → call done → handed off.**

The scheduling panel does two jobs from one surface, because both happen: propose
a few times when nothing is agreed, or book a slot outright when the reply
already named one. **Ema pre-selects slots by quoting them back** — Tobias wrote
*"I'm free Tuesday or Thursday afternoon CET"*, so the match is checkable rather
than asserted.

**Timezone is the craft detail.** Every slot shows the candidate's clock first,
because that is what they told you, and yours second. With Stockholm the two
working days overlap for exactly three hours, and the panel says so — *"Your days
overlap 07:00–10:00 PDT"* — instead of letting you discover it by scrolling.
Slots outside the candidate's own day are never generated; offering someone
02:30 their time is noise, not an option.

**A change made from their side has to reach you.** A candidate moving the call
in Google Calendar is the same class of event as a reply landing, so it reuses
the arrival pattern: a banner naming who moved it and to when, a green accent
and `New` tag on the row, the `Outreach stage` column on Candidates, and an
Activity entry attributed to them. Confirming it does not erase who asked —
the log keeps *"Amara moved the call"* and *"Sarah confirmed the new time"* as
separate events.

Google Calendar is mocked at the surface: a connected account beside the senders,
invites sent from it, and a disconnected state that blocks invites the same way a
disconnected sender blocks sends. Real OAuth would change nothing a reviewer sees.

**Any inbound halts the sequence** and cancels every pending step — shown on the
row as *"Sequence stopped — Kavya replied on 16 Mar. 2 remaining steps
cancelled"*, with those steps struck through in the sequence view. It's promised
up front in the header, because automated follow-ups arriving after someone has
already replied is the thing people actually fear about this category of product.

**`Start outreach` never fires immediately.** It opens a pre-flight checklist
where each blocker gets a decision: do-not-contact removals, current employees
routed to internal mobility, *"3 have no email on file — Skip or LinkedIn only"*,
recent-contact collisions, the daily limit split, and sender quota. The primary
button restates the **real** number, not the selected one:
**`Start outreach for 8 today`**.

---

## Accessibility

I ran axe-core (WCAG 2.1 A + AA + best-practice) across all ten screens and seven
overlay states, then tested the things it structurally cannot see. Both halves
mattered, and the second half mattered more.

### Contrast

A handful of token pairings sat just under 4.5:1 — tertiary text and the lighter
badge tints — so text colours moved a step or two down their own scales
(`--fg3` to `beige-930`, warm badge text to `-960`). All within the existing
palette; nothing invented.

Two habits in my own code caused the rest: `opacity-*` for de-emphasis, which
took cancelled sequence steps to 1.5:1 and is now strike-through plus a real
muted colour, and icon-only controls without labels.

### A clean automated run was hiding a Level A failure

After axe came back clean I nearly stopped. Testing what it cannot detect turned
up three failures, one of them serious:

| Failure | Level | Why the scanner missed it |
|---|---|---|
| **Candidate rows were mouse-only.** `<tr onClick>` with no keyboard path — there was no way to open a profile without a mouse | **2.1.1 Keyboard, A** | The row contained focusable children, so it did not look inert |
| **No live regions.** Every confirmation in the product was silent to a screen reader | **4.1.3 Status Messages, AA** | A scanner cannot know a toast was meant to announce |
| **No skip link.** 18 nav tab stops before content, on every page | **2.4.1 Bypass Blocks, A** | Not a markup error — an absence |

The first is the one that matters: the product's primary screen was unusable by
keyboard while the audit reported zero violations. Fixed by making the
candidate's name a real `<button>` — keyboard gets a proper target, mouse keeps
the whole-row click.

### Everything else fixed

Every modal was a **keyboard trap**: `CandidateDrawer` implemented Escape
locally, so the drawer closed, but the shared `Modal` had no handler at all —
Compare, Pre-flight, Schedule and Confirm-reschedule could be opened and never
dismissed. Now centralised in one `useDialog` hook: Escape to close, focus moved
in on open, focus returned to the trigger on close, Tab cycled within, and
`role="dialog"` with a real name on each.

Also: the weight scale was `role="slider"` wrapping five buttons (nested
interactive — now a `radiogroup` with roving tabindex, which is also more honest
about "pick one of five"); an unlabelled sort `<select>`; unnamed duplicate
`<aside>` landmarks; no `h1` on any page, because breadcrumbs render as spans;
empty action-column `<th>`s; and an `aria-label` on a plain span.

Verified separately: ~60 tab stops per screen, **every one with a visible focus
ring**, zero exceptions. Reflow at 720px passes with no horizontal scroll, and
heading order is clean (`h1 → h2 → h2 → h2`).

### What I have not verified

Being straight about the gap, because "zero violations" is not the same as
accessible:

- **No screen reader testing.** I have not run VoiceOver or NVDA. Correct ARIA
  does not guarantee a sensible *announcement* — the criteria grid is a complex
  table whose cells read as "●", and how that sounds is unknown. This is the
  largest remaining risk.
- **No testing with people who use assistive technology**, which is the only
  thing that actually settles it.
- Zoom to 400% and text-spacing overrides (1.4.10 / 1.4.12) beyond the 720px check.
- Focus order inside the drawer and grid is *reachable*, not verified *sensible*.
- The `J`/`K`/`S`/`X` shortcuts in the split-pane layout have no discoverable
  list and may collide with screen-reader browse mode.

---

## Layout exploration

The three screens above are one of three arrangements each. Two alternatives per
screen are built and switchable on the same data — a layout picker sits at the
bottom of the sidebar, and a **usage overlay** (`⌥U`) annotates every region with
the hypothesis it was designed against: how often it is touched, for how long,
what it is optimised for, and what breaks if it is wrong.

That exists because when asked to defend where the header search and the
`Begin search` button sat, the honest answer was that each element had been
reasoned locally and never reconciled globally — a symptom of never having
considered an alternative. So each screen now has two built challengers, and the
argument is settled by using them rather than asserting.

**→ [LAYOUTS.md](LAYOUTS.md)** — the framework, all nine layouts with what each
one bets and sacrifices, what the competitor research validated or contradicted,
and a recommendation per screen naming what it beat and why. It includes the two
cases where the exploration proved me wrong, and the one where the overlay
exposed a mismatch that argument alone had not.

---

## What I left out, and why

| Cut | Why |
|---|---|
| Real calendar OAuth | The state machine and the timezone handling are the artifact; a live API changes nothing on screen. |
| No-show handling | Folds into the outcome of `Call done`. |
| Interview panels, scorecards after the call | That is an ATS. This hands off at the point the call is booked and done. |
| Auth, roles, multi-tenancy | The duplicate-candidate guardrail shows the multi-user model without building it. |
| Real sending | The state machine is the artifact; simulating it makes every transition demonstrable. |
| Sequence builder beyond presets | A step editor is solved CRUD. The reply-interrupt and failure handling are the hard parts. |
| Cross-search learning | Not built, so the copy says "this search only" rather than implying a loop. |
| Kanban board | Implies human-driven transitions that are machine-driven. |
| Boolean query syntax | Filters follow the Must/Preferred/Exclude model; a query language is a second product. |
| Analytics dashboard | Reply-rate charts are demo candy. They don't answer "who do I contact next". |
| ATS write-back | Internal talent is a documented read-only beta. Respecting that is the correct read. |
| Resume parsing | Adds a file pipeline, changes nothing about explainability. |
| Dark mode | The warm beige surface is the brand signature. |
| Mobile | Desktop workflow; a broken table helps nobody. |

**Also deliberate:** a column earns its place only if you'd sort or scan by it.
Education, skills, links, notes and contact details all live in the drawer, not
the table.

---

## Running it

```bash
npm install
npm run dev      # → http://localhost:5173
npm run check    # scoring + outreach self-check (12 invariants, no framework)
```

| Switch | What it does |
|---|---|
| A / B / C in the sidebar, or `?layout=b` | The alternative layouts for that screen |
| **Usage** in the sidebar, or `⌥U` | Usage-hypothesis overlay |
| ↺ in the header | Reset the demo and replay the whole story from an empty draft |

Empty and error states are reachable directly:

| URL | State |
|---|---|
| `/candidates?state=zero-results` | No match, with relaxation chips that quantify each option |
| `/candidates?state=gate-wipeout` | Nobody clears the required bar |
| `/candidates?state=searching` | Live search — ranked skeletons, source checklist, cancellable |
| `/candidates?state=partial-failure` | Search died mid-run, partial results **kept** |
| `/candidates?state=ats-disconnected` | Greenhouse down, reason shown inside the tab |
| `/outreach?state=sender-disconnected` | Sender auth expired, sends blocked not retried |
