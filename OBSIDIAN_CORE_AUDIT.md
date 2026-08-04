# OBSIDIAN CORE AUDIT — how separable is the core from the rides domain?

**Read-only audit. No file was edited, created, moved, deleted, formatted or committed except this one. No build was run, no server started, no branch switched.**

Date: 2026-08-04

## Git state at the start of this audit

```
branch:  master
HEAD:    026c76a feat: implement cinematic command center identity
```

The working tree was **dirty** when this audit began, and was left exactly as found:

| status | path |
|---|---|
| M | apps/web/.env.local.example |
| M | apps/web/src/app/api/voice/speak/route.ts |
| M | apps/web/src/app/api/voice/transcribe/route.ts |
| M | apps/web/src/app/obsidian/page.tsx |
| M | apps/web/src/app/page.tsx |
| M | apps/web/src/components/command/action-required.tsx |
| M | apps/web/src/components/command/command-center-identity.test.ts |
| M | apps/web/src/components/command/command-center-scene.module.css |
| M | apps/web/src/components/command/command-center-scene.test.ts |
| M | apps/web/src/components/command/command-center-scene.tsx |
| M | apps/web/src/components/command/eclipse-iris-canvas.test.ts |
| M | apps/web/src/components/command/eclipse-iris-canvas.tsx |
| M | apps/web/src/components/command/eclipse-iris.module.css |
| M | apps/web/src/components/command/obsidian-intelligence.module.css |
| M | apps/web/src/components/command/obsidian-intelligence.tsx |
| M | apps/web/src/lib/voice/elevenlabs.ts |
| M | apps/web/src/lib/voice/transcribe-client.ts |
| M | apps/web/src/lib/voice/tts.ts |
| ?? | apps/web/src/lib/voice/limits.ts |
| ?? | apps/web/src/lib/voice/rate-limit.ts |
| ?? | apps/web/src/lib/voice/tts-cleanup.test.ts |
| ?? | apps/web/src/lib/voice/voice-security.test.ts |
| ?? | desktop-command-target.png |
| ?? | gotham-signal-reference.png |

**This audit reflects the working tree as it stands, including uncommitted work, not the state at `026c76a`.**

## Source roots

Located, not assumed:

- **`apps/web/src`** — the only source root. 169 files, **23,184 lines** (`.ts`, `.tsx`, `.css`).
- **`supabase/migrations`** — 8 SQL files, 7 tables.
- `packages/*`, `verticals/*`, `integrations/*` — **scaffolds only.** Every entry is a `.gitkeep` plus a `README.md`; 28 files, zero source. Per ADR-010 these document intended extraction boundaries and contain no code. **`verticals/beauty/` already exists as an empty placeholder** — the lash studio has a named home and nothing in it.

## Method, and its limits

Files were classified by scanning for word-boundary matches on: `ride(s)`, `trip(s)`, `driver(s)`, `vehicle(s)`, `pickup`, `dropoff`, `destination`, `fare`, `mileage`, `passenger(s)`, `chauffeur`, plus the column-name forms `trip_`, `_trip`, `pickup_`, `dropoff_`.

Two corrections were made after the first pass, both of which changed the numbers materially:

1. **`ride` matches inside `override`.** The naive scan flagged `lib/business/orb.ts` and others that contain no rides concept at all. All counts below use word boundaries.
2. **Comments are not coupling.** A file whose only mention of "trip" is in a doc comment compiles and behaves identically for a lash studio. Counts are therefore reported twice: total hits, and hits with `//`, `/* */` and leading-`*` comment lines stripped. **The code-only count is the one that governs classification.**

**Uncertainty, stated plainly:** the comment-stripping is a regex, not a parser. It will mis-handle a rides term inside a string literal that contains `//` (a URL, for instance). I found no such case by inspection, but I did not prove its absence. Where a file sat near a bucket boundary I opened it; where it sat far from one I did not.

---

## 1 — Classification

### Totals

| bucket | files | lines | % of lines |
|---|---:|---:|---:|
| **NEUTRAL** | 73 | 7,008 | **30.2%** |
| **MIXED** | 62 | 11,004 | **47.5%** |
| **COUPLED** | 34 | 5,172 | **22.3%** |
| total | 169 | 23,184 | 100% |

NEUTRAL is defined here as **zero rides terms in code** (comments may mention the domain). MIXED and COUPLED both have rides terms in code; the split is by whether the file's *subject* is the rides domain.

### COUPLED — 34 files, 5,172 lines

Cannot be reused without rewriting; the core subject is trips, routes, pickups, vehicles or fares.

| lines | path | coupling |
|---:|---|---|
| 489 | `components/trip-form.tsx` | the ride entry form: pickup, dropoff, trip type, mileage, hourly rate |
| 345 | `app/trips/actions.ts` | create/update/complete/cancel trip server actions |
| 811 | `lib/business/proposal.test.ts` | every fixture is a trip; `create_trip` action shape |
| 468 | `lib/business/business-day.test.ts` | closeout semantics expressed entirely in rides |
| 426 | `lib/business/command-center.test.ts` | next-ride selection, tonight's flow |
| 365 | `lib/business/proposal.ts` | 5-action union: create/update/complete/cancel **trip**, record payment |
| 305 | `lib/business/trip-status.test.ts` | trip status transitions |
| 279 | `lib/business/form-defaults.test.ts` | ride-form defaults |
| 244 | `lib/business/command-center.ts` | `selectNextRide`, `todaysFlow`, operational summary |
| 251 | `lib/business/summary-copy.test.ts` | "an airport ride…" sentence construction |
| 223 | `components/command/next-ride.tsx` | the Next Ride centrepiece |
| 176 | `lib/business/action-required.test.ts` | four of five kinds are ride conditions |
| 174 | `lib/business/customer-intel.test.ts` | quiet-customer logic measured in completed trips |
| 170 | `lib/business/action-required.ts` | see §4 |
| 168 | `lib/business/manual-checks.test.ts` | rides scenarios |
| 156 | `lib/business/form-defaults.ts` | defaults derived from completed **rides** |
| 155 | `components/upcoming-trip-row.tsx` | a row that is a trip |
| 155 | `lib/ai/parse-trip.ts` | free text → `record_trip` tool with pickup/dropoff/mileage |
| 143 | `lib/db/trips.ts` | `createTripWithCosts`, trips queries |
| 133 | `components/command/tonights-flow.tsx` | ride timeline |
| 129 | `app/trips/page.tsx` | trips list route |
| 122 | `lib/business/trip-status.ts` | trip status rules |
| 122 | `components/new-trip-by-text.tsx` | natural-language ride entry |
| 107 | `lib/business/profit.test.ts` | per-trip profit |
| 104 | `components/trip-close-out.tsx` | closing out a ride |
| 97 | `lib/db/proposal-writes.ts` | the five writes are all trip writes |
| 94 | `components/command/trip-quick-actions.tsx` | ride actions |
| 78 | `app/trips/[id]/edit/page.tsx` | trip edit route |
| 64 | `lib/business/pickup-time.ts` | pickup timestamps |
| 57 | `components/trip-confirm.tsx` | ride confirmation |
| 51 | `app/trips/new/page.tsx` | new trip route |
| 50 | `components/command/route-line.tsx` | pickup→destination schematic |
| 41 | `lib/business/trip-type.ts` | trip type labels |
| 21 | `lib/business/trip-rates.ts` | revenue per hour / **per mile** |

### MIXED — 62 files, 11,004 lines — *the expensive bucket*

Mostly generic, but carrying rides names, labels, branches or types. A representative sample with the specific coupling named:

| lines | path | the coupling |
|---:|---|---|
| 721 | `components/command/obsidian-intelligence.tsx` | generic assistant controller; 3 code hits, all copy/props referencing rides |
| 537 | `lib/voice/assistant.test.ts` | generic voice tests using ride fixtures |
| 392 | `lib/business/schedule.ts` | generic day/time engine; typed on `Trip`, `tripDayKey`, `groupUpcomingTrips` |
| 393 | `lib/business/orb-interface.test.ts` | generic orb tests; ride proposal fixture |
| 355 | `components/command/skyline-shell.module.css` | **grid areas literally named `ride`** (`.areaRide`, `"intelligence ride attention"`) |
| 348 | `lib/business/execute-proposal.ts` | generic safety sequence; `TripSnapshot`, `loadTrip`, trip-shaped writes |
| 319 | `lib/business/design-vocabulary.test.ts` | generic tokens; asserts ride copy |
| 314 | `lib/business/payment.test.ts` | payment is neutral; fixtures are trips |
| 307 | `lib/ai/tools.ts` | 7 tools; 2 are ride-shaped (see §5) |
| 268 | `lib/business/schedule.test.ts` | generic engine, ride fixtures |
| 236 | `components/app-shell.tsx` | neutral nav shell; destination labels "Trips"/"Upcoming" |
| 226 | `app/ask/assistant-actions.ts` | generic orchestration; `toCreateAction` builds a trip |
| 213 | `lib/business/skyline.test.ts` | generic top bar; asserts "1 ride needs closing out" |
| 176 | `app/page.tsx` | the Command Center composition; assembles ride panels |
| 143 | `app/upcoming/page.tsx` | generic "upcoming" concept, ride rows |
| 139 | `lib/types/index.ts` | `Trip`, `TripType`, `TripStatus` beside neutral `Organization`, `Customer` |
| 136 | `components/command/business-pulse.tsx` | metrics are neutral; label says "rides" |
| 115 | `lib/business/customer-intel.ts` | quiet-customer concept neutral, implementation counts trips |
| 94 | `lib/nav.test.ts` | neutral nav, ride destinations |
| 78 | `lib/business/skyline.ts` | pill copy names five ride kinds |
| 74 | `lib/db/expenses.ts` | expenses neutral; joins `trip_id` |
| 73 | `lib/business/payment.ts` | wholly neutral logic, `Trip` parameter type |
| 70 | `lib/enums.ts` | `TRIP_TYPES`, `PAYMENT_METHODS`, `TRIP_STATUSES` |
| 60 | `lib/business/__factories.ts` | test factories build trips |
| 49 | `lib/business/profit.ts` | neutral formula, `Trip[]` signature |
| 45 | `lib/business/customers.ts` | neutral, trip-derived |
| 33 | `lib/nav.ts` | 5 destinations, 2 ride-named |
| 26 | `lib/business/revenue.ts` | neutral sum over `Trip[]` |
| 19 | `components/command/route-visual-state.ts` | route schematic state |

Plus 33 further MIXED files at 1–3 code hits each — mostly a `Trip` type import, a label, or a single branch.

### NEUTRAL — 73 files, 7,008 lines

Zero rides terms in code. Would compile and behave identically for a lash studio. The substantial ones:

`lib/voice/*` (audio-capture 189, mic-permission 187, browser-audio 130, capture-assessment 128, speech-outcome 67, rate-limit 67, mic-lifecycle 35, limits 22, voice-capture.test 455, voice-security.test 50) · `components/command/eclipse-iris-canvas.tsx` 224 · `eclipse-iris-enhancements.module.css` 367 · `eclipse-iris.tsx` 92 + `.module.css` 111 · `iris-visualizer*` 233 · `lib/business/iris.test.ts` 390 · `components/obsidian-voice.tsx` 364 · `obsidian-orb.tsx` 240 · `obsidian-intelligence.module.css` 246 · `components/proposal-card.tsx` 89 · `lib/ai/ask.ts` 76 · `lib/money.ts` 55 · `lib/db/org.ts` 56 · `lib/db/customers.ts` 55 · `lib/business/date-range.ts` 64 · all auth routes and forms · `app/globals.css`.

**The entire voice stack, the entire orb, the money boundary, the auth layer and the org layer are already domain-neutral.**

---

## 2 — Rides-specific identifiers and strings, ranked by rename cost

### Tier 1 — database columns (highest cost)

Renaming these means a migration, a data backfill, regenerated types, and edits across every file that touches them. Counts are **files referencing the identifier**:

| identifier | files | note |
|---|---:|---|
| `revenue_cents` | **29** | arguably neutral already — money, not rides |
| `trip_date` | **21** | pure rides naming for "when it happened" |
| `pickup_location` | 15 | no lash-studio equivalent |
| `dropoff_location` | 15 | no lash-studio equivalent |
| `trip_type` | 13 | enum `public.trip_type` |
| `mileage` | 7 | |
| `passenger_count` | 5 | |
| `hourly_rate_cents` | 4 | chair time is hourly too — concept survives |
| `vehicle_id` | 2 | FK to a table with **no source references at all** |

Table `trips` is referenced in 7 files; table `vehicles` exists in the schema and is **never queried in `src`**.

### Tier 2 — exported types (high cost, compile-enforced)

`Trip` (17 files), `TripType`, `TripStatus`, `TripListRow`, `TripSnapshot`, `TripCostsInput`, `CreateTripResult`, `ParsedTrip`, `TripFormDefaults`. These are load-bearing: the type checker will find every site, which makes the rename *safe* but not *cheap*.

### Tier 3 — routes and file names (moderate)

Routes `/trips`, `/trips/new`, `/trips/[id]/edit`, `/upcoming`. 22 file paths contain a rides term (`trip-form.tsx`, `next-ride.tsx`, `route-line.tsx`, `parse-trip.ts`, …). Renaming files is mechanical; renaming routes breaks bookmarks and any deep link.

### Tier 4 — function and variable names (moderate, mechanical)

`selectNextRide`, `todaysFlow`, `groupUpcomingTrips`, `tripDayKey`, `isPastDue`, `createTripWithCosts`, `createTrip`, `markTripCompleted`, `cancelTrip`, `confirmTrip`, `parseTripText`, `revenuePerMileCents`, `tripTypeLabel`, `hasQuotedPrice`.

### Tier 5 — user-visible strings (cheapest)

Nav labels "Trips"/"Upcoming"; `app/layout.tsx` title `"OBSIDIAN RIDES"`; `components/form.tsx` "Rides"; the attention pill's five sentences in `lib/business/skyline.ts`; "1 ride needs closing out"; `lib/form.ts` error `"Enter a whole number of passengers, or leave it blank."`; Business Pulse "rides" labels; `parse-trip.ts` prompt text. **All are string edits with no structural consequence.**

### Tier 6 — tests and comments (cheapest, but voluminous)

Roughly 2,900 lines of test fixtures are trip-shaped. Comments mention the domain in ~25 files that are otherwise neutral in code — including `lib/business/iris.ts`, `lib/conversation.ts`, `lib/business/missing.ts`, `lib/business/english.ts`, `lib/submit-guard.ts`. **These cost nothing to leave alone.**

---

## 3 — Did the org-scoping discipline hold?

### Hard-coded business name — **PASS, with one deliberate exception**

`"Midnight Rydes"` appears in **exactly one source file**, and it is a test that exists to enforce the rule:

- `apps/web/src/lib/ai/business-name.test.ts:13` — `expect(sanitizeBusinessName("Midnight Rydes")).toBe("Midnight Rydes")`
- `apps/web/src/lib/ai/business-name.test.ts:128` — `const BANNED = ["midnight rydes", "midnight rides"]`

The second is a guard that fails if the literal ever appears in shipped source. **No application code, component, migration, seed or config contains the name.** All other occurrences are documentation: `AI_HANDOFF.md` (4), `CURRENT_STATE.md` (2), `CUSTOMER_ZERO_FEEDBACK.md` (3), `docs/DECISIONS.md`, `docs/PRODUCT_STRATEGY.md` (2), `docs/ROADMAP.md` (4), `apps/web/README.md`.

The one place a fallback literal did exist — `const businessName = org?.name ?? "Your business"` in `app/page.tsx` — was removed in the Skyline shell pass; an unnamed org now renders an empty eyebrow.

### Hard-coded pricing — **PASS**

No price, rate, fee or currency constant exists in source. `lib/business/trip-rates.ts` computes *derived* per-unit rates from stored values and stores nothing. `lib/business/form-defaults.ts` derives every default from the org's own completed history and explicitly refuses to guess where there is no history. Money is integer cents throughout with one conversion boundary (`lib/money.ts`).

### Org-scoped queries — **PASS**

Every read goes through `lib/db/*` using the RLS-scoped server client. Writes stamp `organization_id` from `getCurrentOrgId()`, which reads `memberships` for the authenticated user. I found no query that omits org scoping.

### Org id from the client — **PASS**

No `organization_id` is read from `formData`, a request body, a route param, or a search param anywhere in `src`. The three sites that assign it take it from `getCurrentOrgId()` or from an already-session-derived `params.organizationId` internal to `lib/db/trips.ts`. `lib/business/proposal.ts` has no org field by construction, and `assistant-actions.ts` resolves the org server-side.

### The 4:00 AM rollover — **A CONSTANT, NOT CONFIGURABLE**

`BUSINESS_DAY_ROLLOVER_HOUR = 4` — `apps/web/src/lib/business/schedule.ts:29`. The timezone is a second constant: `BUSINESS_TIME_ZONE = "America/New_York"` in `lib/business/pickup-time.ts:10`, with the string **also hard-coded in five other places**: `app/trips/actions.ts:45`, `lib/ai/parse-trip.ts:111`, `lib/business/date-range.ts:37` and `:59`, and `lib/ai/tools.ts` (comment).

**A lash studio in a different timezone with a different day boundary would need all of these to become per-organization.** Files that would change: `schedule.ts`, `pickup-time.ts`, `date-range.ts`, `command-center.ts` (imports the constant), `app/trips/actions.ts`, `lib/ai/parse-trip.ts`, plus every caller that currently takes only `now` and would need to take an org's calendar configuration. The rollover hour is also **semantically rides-specific**: 4 AM exists because black-car work runs past midnight. A lash studio almost certainly rolls at midnight.

**This is the one place the "reusable for a second operator" rule did not hold**, and it did not fail by accident — it was a correct decision for a single-tenant build that becomes a coupling point the moment a second business exists.

---

## 4 — The attention layer

`buildActionRequired(trips, customers, now, todayKey, thresholdDays)` → `ActionItem[]`, five kinds:

| kind | concept | implementation | note |
|---|---|---|---|
| `needs_closing_out` | **neutral** — "a booked thing happened and was never closed" | **coupled** — `trip.status === "scheduled" && isPastDue(trip, now)` | a lash appointment has exactly this |
| `missing_revenue` | **neutral** — "completed, no money recorded" | **coupled** — `hasQuotedPrice(trip)` | identical for a service |
| `missing_customer` | **neutral** | **coupled** — trip's `customer_id` | identical |
| `missing_route` | **coupled in both** | `pickup_location`/`dropoff_location` | **no lash equivalent exists** |
| `quiet_customer` | **neutral** — "a repeat customer has gone quiet" | **coupled** — counts completed *trips* | rebooking cadence is the same idea |

**Four of five concepts are domain-neutral; one is coupled in concept as well as implementation.** Every implementation is coupled, all through the `Trip` type.

### The seam, if attention kinds became a domain-supplied input

The interface would need three things the current code fuses:

```ts
interface AttentionRule<TRecord> {
  kind: string;                          // domain-supplied, not a fixed union
  priority: number;
  severity: "urgent" | "warning" | "info";
  applies(record: TRecord, ctx: DomainContext): boolean;
  describe(record: TRecord, ctx: DomainContext): {
    title: string; detail: string; recordLabel: string;
    actionLabel: string; href: string;
  };
}
```

`ActionKind` is currently a **closed union** (`keyof typeof ACTION_PRIORITY`) and that closure is load-bearing: `lib/business/skyline.ts` switches on it exhaustively with a `never` check, and `components/command/action-required.tsx` maps severity to colour. Opening it to a domain-supplied string trades compile-time exhaustiveness for runtime registration — **a real loss**, and the honest cost of the seam.

Files that would change: `lib/business/action-required.ts`, `action-required.test.ts`, `lib/business/skyline.ts` + test, `components/command/action-required.tsx`, `app/page.tsx`, and `lib/business/iris.ts` (only where its comment cites the rides phrasing).

---

## 5 — The AI tool layer

`lib/ai/tools.ts` — `TOOL_DEFS: Anthropic.Tool[]`, dispatched by a `switch (name)` at line 170.

| tool | returns | shape |
|---|---|---|
| `get_business_performance` | revenue, expenses, profit, margin for a period | **neutral** |
| `get_revenue_summary` | revenue for a period | **neutral** |
| `get_expense_summary` | expenses by category | **neutral** |
| `get_trip_summary` | count + average of completed **trips** | **rides-named; concept neutral** ("completed jobs") |
| `get_top_customers` | customers ranked by spend | **neutral** |
| `get_customer_history` | one customer's history | **mostly neutral**; history entries are trips |
| `get_inactive_customers` | repeat customers gone quiet | **neutral concept, trip-counting implementation** |

**Five of seven are already domain-neutral in shape.** A second domain would supply: a record noun, a completed-record predicate, a per-record amount, and a date field. That is roughly what `get_trip_summary` and `get_customer_history` hard-code.

**Can the mechanism accept a different tool set today? No.** `TOOL_DEFS` is a module-level constant and the executor is a hand-written `switch` over literal names. Nothing accepts a registry as a parameter. Generalising it is small — an interface with `defs` and a `run(name, input)` — but it **must** preserve the invariant that the AI never produces a number that did not come from a schema-typed, org-scoped, read-only tool (ADR-002).

---

## 6 — The design layer

**Almost fully neutral — with one concrete exception.**

- `tailwind.config.ts` — **0 rides concepts.** The palette and the Phase 1 semantic vocabulary (`surface-*`, `line`, `content-*`, `accent*`, `state-*`) are entirely domain-free.
- `app/globals.css` — **0**.
- `components/command/eclipse-iris.tsx` / `.module.css` / `eclipse-iris-canvas.tsx` / `eclipse-iris-enhancements.module.css` / `iris-visualizer*` — **0 in every file.** The orb's state model (`lib/business/iris.ts`: `CapabilityStatus`, `InteractionPhase`, `IrisVisualState`) is domain-free; its only rides mention is a **comment** at line 50 citing "1 ride needs closing out" as the example of what feeds `needsAttention`. The derivation itself takes a boolean and knows nothing about rides.
- `components/command/skyline-shell.tsx` — **0 in code.**
- `components/command/command-center-scene.tsx` / `command-surfaces.module.css` — **0.**

**The exception:** `components/command/skyline-shell.module.css` names a CSS grid area **`ride`** —

- line 219: `"ride"` inside a `grid-template-areas`
- line 229: `.areaRide { grid-area: ride; min-width: 0; }`
- line 257: `"intelligence ride attention"`

This is a rides concept baked into the layout vocabulary. It is cheap to rename (one file, three lines, plus its consumer in `skyline-shell.tsx`), but it is real, and it is exactly the class of leak the audit was asked to find.

`lib/business/missing.ts` and `lib/business/english.ts` mention rides only in comments and are neutral in code.

---

## 7 — The answer

**About 30% of this codebase by lines is already reusable unchanged, and a further 47% is reusable after renaming.** Only 22% — 5,172 lines — is genuinely rides-shaped and would have to be rewritten for a lash studio. That is a better position than the file names suggest, because the expensive parts of this system were built domain-free on purpose: the entire voice stack, the orb and its state model, the money boundary, auth, org resolution, the proposal safety sequence, and the design tokens.

**The five largest coupling points, in cost order.** First, the `trips` table and its columns — `trip_date`, `pickup_location`, `dropoff_location`, `trip_type` are referenced across 13–21 files each, and changing them means a migration plus a backfill. Second, the `Trip` type threaded through 17 files, including modules that are otherwise pure and neutral (`payment.ts`, `profit.ts`, `revenue.ts`, `schedule.ts`) — these need only a generic parameter, not a rewrite. Third, `lib/business/proposal.ts`'s five-action union, which names trips in its type system and is the spine of the approval path. Fourth, the closed `ActionKind` union, whose exhaustiveness is deliberately load-bearing. Fifth — and underrated — the **4:00 AM rollover and the `America/New_York` string**, constants in seven places, semantically specific to night driving.

**The evidence supports (c), extract a shared core with two thin domain packages** — but not yet. (a) copy-and-diverge throws away a genuinely neutral 30% and doubles every future voice, orb and security fix, which is precisely the work that has cost the most. (b) a second org in the existing app fails on the first screen: `selectNextRide`, the route schematic, and `missing_route` have no lash meaning, and the 4 AM rollover would be wrong. (c) matches what the code already looks like — and `verticals/beauty/` exists as an empty scaffold, so the intended boundary was drawn long ago.

**The single cheapest change that most increases separability: make the business-day rollover hour and timezone per-organization configuration read from the `organizations` row, instead of two module constants.** It touches ~7 files, needs one additive migration, requires no rename, and can be done without disturbing the visual or voice work because nothing in either reads those constants. It also converts the one place the org-scoping rule did not hold into a place where it does.

**Attempting the separation before the visual and voice passes finish would hurt.** Both are mid-flight in the working tree right now — 18 modified files, most of them orb, scene and voice. Moving files under an in-progress redesign guarantees conflicts in exactly the files changing fastest, and the guard tests that walk `src/` by path (`design-vocabulary.test.ts`, `orb-interface.test.ts`, `voice-security.test.ts`) would all need their paths rewritten while the thing they guard is still moving.

**Where I am uncertain:** I did not verify RLS behaviour against the live database — the org-scoping conclusion is from reading every query, not from a second-user test, and that test is still the standing hard gate. I also could not judge how much of the 11,004 MIXED lines would survive a rename versus need real rewriting without opening all 62 files; I opened roughly 25. To be sure, I would want to read `schedule.ts`, `execute-proposal.ts` and `payment.ts` line by line to confirm they are generic-parameterisable rather than trip-assuming in their logic.
