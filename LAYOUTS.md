# Layout exploration

Nine layouts, three per screen, all live and switchable on the same data.
Switch with the **A / B / C** control at the bottom of the sidebar, or `?layout=b`.
Toggle the reasoning with **Usage** (`⌥U`), or `?usage=1`.

Written for the Ema Design Team, as the reasoning behind the three screens in
the submission. The screens themselves, the ranking model and the accessibility
audit are in **[NOTES.md](NOTES.md)**.

---

## Why this exists

Asked to defend where the header search and the `Begin search` button sat, the
honest answer was that each had been reasoned locally and never reconciled
globally. That is a symptom of never having considered an alternative. So each
screen now has two built challengers, and the argument is settled by using them
rather than by asserting.

## The framework

One question generates every decision here:

> **What is the unit of work on this screen, and how many does the hiring
> manager touch per session?**

| Screen | Unit of work | Touches | Dwell | Dominant verb |
|---|---|---|---|---|
| Search | one search configuration | 1 per role | 5–10 min | **Specify** |
| Candidates | one candidate | ~110 scanned, ~15 opened | 3s / 60s | **Reject** |
| Outreach | one pending action | ~6 | 30s | **Decide** |

Three consequences:

**Search fails invisibly.** A slightly wrong filter raises no error — it produces
a list missing people nobody ever sees. The layout's job is feedback.

**Candidates is a rejection machine, not a reading room.** 110 in, 9 out. A
layout tuned for reading one profile deeply optimises the rare case. But
rejection made too cheap becomes careless rejection — that tension is the axis.

**Outreach is a queue, not a database.** Success is emptying it.

The **usage overlay** renders these as falsifiable claims per region — frequency,
dwell, what it is optimised for, and what breaks if it is wrong — so you can
disagree with a number rather than with a vibe.

---

## What the field says

Two research passes, across recruiting tools (LinkedIn Recruiter, Gem, SeekOut,
hireEZ, Juicebox, Ashby, Greenhouse, Lever) and dense enterprise software
(Linear, Clay, Hebbia, Front, Superhuman, Retool, Cloudscape).

**The architecture is independently validated.** Juicebox — the closest analogue
that exists — documents it almost word for word: *"To **narrow** your search,
edit your **filters**. To **rank** your search, edit your **criteria**."* Two
concepts, two surfaces. Every other product in the category conflates them.

**Four findings contradicted this build**, which was more useful than the
agreements:

1. **Hover is where evidence goes to die.** A 2025 study comparing inline /
   sidebar / hover source presentation found sidebar produced the highest rate of
   source examination and **hover the lowest**. The per-criterion breakdown was
   behind a hover tooltip — and hover-only means unreachable by keyboard and
   touch, so it was an accessibility defect too.
2. **The drawer may be on the wrong edge.** Cloudscape specifies bottom-split
   above 5 columns; this table has 7. Though LinkedIn and SeekOut both ship side
   flyouts for exactly this job, so it is a genuine test rather than a settled error.
3. **Three-state beats the 1–5 composite, per the field.** Juicebox scores each
   criterion Good / Potential / Not-a-match with a separate insufficient-evidence
   state; Hebbia's Matrix does the same as cited cells. Yellow does real work —
   it separates *no* from *can't tell*.
4. **Greenhouse encodes *who is blocking* in colour**, not stage — the same
   principle as `Needs you` / `In flight`, drawn differently.

**And the finding that matters most:** *"Nobody's core screen is the problem; the
handoff between sourcing and outreach is, in every product."* SeekOut users say
getting from project to campaign is clunky. LinkedIn splits InMail data across
three surfaces on a 48-hour refresh. Gem's AND-only filters force duplicate
campaigns.

The category's weakness is the **seam**. This build attacks it directly —
ask-in-outreach carries a scorecard gap into a message, the reply resolves the
cell, a candidate-side calendar change surfaces back on the candidate. **No
variant ships that weakens the seam to improve a screen**, and every variant is
tested against the full run rather than its own screen in isolation.

---

## The nine

### Search · *how much must you specify before you see anything?*

| | Bets | Sacrifices |
|---|---|---|
| **A** Form + reach rail | Everything visible at once is best for revision | Feedback is an abstract count, not people |
| **B** Conversational | Ask only what changes eligibility; infer the rest | Revising filter #7 means scrolling a thread |
| **C** Live preview | Filters fail invisibly — show real people as you tune | Scorecard collapses to a summary |

**B** is built on the block-vs-refine rule: block on anything that changes *who
is in the pool*, refine anything that only changes *the order*. Two questions, each
with its reason shown, and the configuration accretes beside the thread as a
reviewable artifact.

**C** replaces `≈1,180` with eight actual faces that re-rank as you change a
filter, plus a forward warning — *"adding PhD as a must-have would cut this to
64."*

### Candidates · *what is the atomic comparison?*

| | Bets | Sacrifices |
|---|---|---|
| **A** Table + drawer | Density wins for a rejection machine | Evidence behind hover, where research says it goes unread |
| **B** Split pane | Evidence needs permanent real estate to be read | ~9 rows visible instead of ~17 |
| **C** Criteria grid | Comparison is the real job — the list should *be* the comparison | Very few distinct ranks |

**B** puts evidence at rest: quoted, dated, sourced, never behind a hover, with
`J`/`K`/`S`/`X` so moving and deciding are free.

**C** is Hebbia's Matrix transposed with Juicebox's three-state verdicts.

### Outreach · *how is work presented?*

| | Bets | Sacrifices |
|---|---|---|
| **A** Grouped table | Group by who is being waited on; needs-you first | Still a list you can browse instead of clear |
| **B** Focus queue | Six decisions is a queue — show one, keyboard-first | No overview of pipeline shape at all |
| **C** Pipeline board | *Built to be disproven* | 4× the width for the same information |

**B** shows only what needs a person, with a progress bar toward zero and an
explicit *"2 waiting on a clock or a candidate — not shown here."*

**C** is built to Greenhouse's own rules so the test is fair: capped at 10 cards
per column, colour encoding who is blocking. Cards deliberately **do not drag**.

---

## Recommendations

Predictions were written before building. Two held, one was sharpened.

### Search → **C, live preview**

Filters fail invisibly, and every other fix is a workaround for that. Five real
faces beat a count, and the forward warning turns an over-constrained search
from a two-minute discovery into a pre-commit one. **A** loses on feedback,
**B** on revisability — though B's block-vs-refine questioning should be folded
into whichever wins, because *which* questions get asked upfront is a better
idea than the thread that asks them.

### Candidates → **A, with evidence promoted out of hover**

A's density is right for a rejection machine, and the research is unambiguous
that its hover evidence is wrong. Take B's persistent evidence, keep A's rows.

**C lost, and it lost visibly** — which is the most useful outcome here. Open it
and the top seven rows are near-identical fields of green. Three states plus
unknown cannot separate the top of a list, and the brief asks for a *ranked*
list. It remains the better **comparison** tool, so the right resolution is that
the criteria grid is what `Compare` should become, not what the list should be.

### Outreach → **A**

The grouping principle is independently confirmed by Front, Superhuman, Linear
Triage and Greenhouse, arrived at four different ways.

**C failed as predicted, for the predicted reason.** Its colour rule — who is
blocking — reduces to exactly A's grouping, spread across six columns. It needs
four times the width to say the same thing, and its central affordance is a lie,
because you do not drag someone from Sent to Replied; they reply.

**B is the interesting loser.** For a queue of six it is genuinely better at
getting to zero. It fails at 40, where you need to see shape. Worth keeping as a
mode rather than a layout — Ashby ships exactly this as a separate *Application
Review* screen alongside the pipeline, which is the correct resolution.

---

## What the overlay exposed

Two mismatches that argument alone had not surfaced:

**The ranking rail is the lowest-frequency region on the busiest screen** —
1–2 touches per session, 90 seconds each — yet holds 300px permanently, directly
beside the score cell at ~110 touches. Turn on the overlay and the frequency
bands are inverted against the space allocated. It should be summoned, not
resident.

**The score cell is the highest-frequency region in the entire product** and had
never been tested against an alternative encoding until variant C existed.

---

## Running it

```bash
npm run dev          # → localhost:5173
```

| | |
|---|---|
| `?layout=b` / `?layout=c` | switch variant (or the A/B/C control in the sidebar) |
| `?usage=1` or `⌥U` | usage overlay |
| ↺ in the header | reset the demo and replay from an empty draft |

All nine layouts pass axe-core at WCAG 2.1 AA, and the keyboard and
screen-reader gaps are documented honestly in
**[NOTES.md → Accessibility](NOTES.md)**.

State is shared across variants, so switching mid-task keeps your shortlist,
corrections and outreach — which is the point. The full run works end to end in
one page load: configure → begin search → watch it run → shortlist → compare →
start outreach → send → classify → resolve a cell → schedule → handed off.
