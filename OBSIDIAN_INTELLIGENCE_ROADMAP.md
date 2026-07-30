# OBSIDIAN Intelligence — Roadmap

**This file is a parking lot, not a work order.** It records the plan so nothing is
lost between sessions. Nothing here is authorization to build. Each phase is built
only when the owner explicitly asks for it, one phase at a time, verified and
committed before the next begins.

Scope: **Obsidian Rides** — OBSIDIAN configured for a premium black-car / black-truck
transportation business. The owner (Midnight Rydes) is customer #1, but everything is
built org-scoped and reusable so a second operator could be onboarded without a
rewrite. This repo is Obsidian Rides only; the Trading Scanner is a separate product
(ADR-007) and is never referenced, imported from, or reasoned about here. No trading
terminology. No military or gaming terminology.

---

## Identity

**Skyline Command** structure + **Midnight Pulse** lighting + restrained luxury
styling + an original **Obsidian Intelligence** orb.

- **Skyline Command** — the structural language: a compact command header, a dominant
  primary card, and supporting panels arranged by operational priority rather than by
  visual weight.
- **Midnight Pulse** — the lighting language: near-black background, dark charcoal
  elevated surfaces, crisp white primary text, readable cool-gray secondary text,
  electric blue as primary illumination and restrained cyan as secondary. Thin
  borders, subtle surface gradients, controlled shadow and glow.
- **Restrained luxury** — quiet, premium, legible at night and one-handed. Not neon,
  not glassmorphic, not a trading terminal.

### Originality requirement (non-negotiable)

The Obsidian Intelligence identity is **explicitly original work**. It must never
copy, embed, imitate, or reference:

- Marvel (or any other studio's) artwork, UI assets, or interface designs
- Their audio, sound design, or audio cues
- Their terminology, character names, or catchphrases
- Any identifiable actor's voice, or a synthetic imitation of one

The orb is an original visual object. Any voice used is a generic synthesized voice
the project is licensed to use, never a likeness of a real person.

### Color semantics (fixed)

Color is **never** the only indicator of status — always paired with a label or icon.

| Color | Reserved for |
|---|---|
| Electric blue | Primary illumination / primary action |
| Cyan | Secondary accent, restrained |
| Green | Completed / paid / confirmed / ready — nothing else |
| Amber | Warnings — nothing else |
| Red | Failures, destructive actions, urgent problems — nothing else |

Tabular numerals for all money and all times. `prefers-reduced-motion` is respected
everywhere: no pulsing, rotation, or scaling loops when it is on.

---

## Phase sequence

| Phase | Name | Status |
|---|---|---|
| S1 | Scheduling — create and store upcoming trips | ✅ Complete (`6f9b623`) |
| S2 | Upcoming view | ✅ Complete (`0ea9bc8`) |
| U1 | App shell — real navigation | ✅ Complete (`a7f8b46`) |
| **U2** | **Command Center — Skyline Command dashboard** | **Current phase** |
| U3 | Universal Create menu | Planned |
| U4 | Command bar (Cmd/Ctrl+K) | Planned |
| U5 | Faster forms | Planned |
| D1 | Data model expansion | Planned — **blocked on owner approval** |
| V1 | Orb state machine | Planned |
| V2 | Voice layer | Planned |
| V3 | Approval-gated action proposals | Planned |

Voice work is currently **paused**. There are uncommitted voice experiments in
`apps/web/src/components/obsidian-voice.tsx` and
`apps/web/src/app/api/voice/transcribe/route.ts` (the latter contains a temporary
debug file-write). They are left untouched and uncommitted, and nothing is built on
top of them. V1–V3 supersede that work when they are actually started.

---

## U2 — Command Center (current phase)

Rebuild the dashboard in this hierarchy: compact application header (from U1) →
greeting and operational status → Next Ride → Obsidian Intelligence → Tonight's Flow
→ Business Pulse → Action Required.

Mobile priority order differs deliberately: Next Ride → primary ride action → Action
Required → Obsidian Intelligence → Tonight's Flow → Business Pulse.

Obsidian Intelligence in U2 holds the **existing, working Ask OBSIDIAN** only,
restyled and given its missing accessibility fixes. **No orb, no microphone button,
no voice toggle** — layout space is reserved for V1, but nothing ships that does not
work.

---

## U3 — Universal Create menu

One primary Create control, always reachable: floating action button on mobile, a
button in the sidebar on desktop. Opens a small menu: Schedule a ride, Log a completed
trip, Add expense, Add customer. Keyboard accessible, Escape closes, focus trapped
while open and restored on close.

---

## U4 — Command bar (Cmd/Ctrl+K)

Opens from anywhere; on mobile a search affordance in the shell opens the same thing.
It does three things and only three:

1. Navigate to any destination.
2. Search customers and trips by name / date / route and jump to the record.
3. Fall through to Ask OBSIDIAN — if the input is not a match, offer to ask it as a
   question, using the **existing** Ask OBSIDIAN pipeline. Never a second AI path.

Searches are debounced and **org-scoped server-side**; never fetch all records to the
browser and filter there. Results are keyboard-navigable with visible selection state.

---

## U5 — Faster forms

The trip form is the most-used surface, often used standing outside the truck.

- Defaults computed from real history (most-used trip type and payment method) as a
  pure tested function — never hard-coded.
- Recent customers offered as quick-pick chips.
- Numeric keypad on money inputs (`inputMode="decimal"`); the cents conversion
  boundary stays exactly where it is.
- Inline validation on blur, not a wall of errors on submit.
- Entered data preserved on validation failure — never blank the form.
- After saving, land somewhere useful with a confirmation.
- Submit-guard duplicate protection stays on every form.

---

## D1 — Data model expansion

**BLOCKED: requires the owner's explicit approval before any migration is written.**

Several fields the Command Center deliberately does **not** show today do not exist in
the schema. They are not stubbed or faked anywhere; they simply do not appear until
this phase lands:

- payment status
- remaining balance
- passenger count
- confirmation state
- driver assignment
- special instructions

**Open question, to be answered by the owner before any work starts:** exactly which
columns are needed, on which tables, with which types, defaults, and nullability — and
what each one means operationally. Adding a column is cheap; agreeing what it means is
not. No migration file is written, and no schema is changed, until that is settled and
the owner approves it explicitly.

Everything before D1 is built without a schema change.

---

## V1 — Orb state machine

The orb is a state display, not a controller. Its behavior is defined **before** any
voice code exists.

### Required orb states (verbatim)

```
idle
requesting_permission
listening
transcribing
thinking
speaking
action_proposed
executing
success
warning
error
offline
```

**Transitions must be defined in one centralized, testable location as a discriminated
union.** No unrelated component may set arbitrary orb states. A component reports an
event; the state machine decides the resulting state. This is what prevents the orb
from lying about what the system is actually doing.

The orb respects `prefers-reduced-motion`: in reduced-motion mode it communicates
state through static form, color, and label rather than continuous animation.

---

## V2 — Voice layer

### Required separation of concerns

Each of the following is **its own module**. Never one giant hook or component:

- microphone permission
- audio capture
- speech-to-text
- assistant orchestration
- authorized business tools
- response presentation
- text-to-speech
- audio playback
- orb state
- conversation history
- audit logging

### Browser / server boundary

**Credentials and privileged calls are server-side only.** The browser may only do:

- permission
- capture
- playback
- animation
- display

No provider key, service-role key, or privileged call ever reaches the browser.

### Microphone privacy rules

- **Never auto-request the microphone on page load.**
- **Never record without a direct user action.**
- A **visible recording indicator** whenever capture is active.
- **Full cleanup** of media tracks, audio contexts, timers, and animation frames on
  unmount, navigation, error, and sign-out.

### Debt V2 cleared: the legacy orb state alias — PAID 2026-07-29

For one phase, two shapes described orb state: the real discriminated union in
`src/lib/business/orb.ts`, and a deprecated `OrbState` string alias exported from
`obsidian-orb.tsx` (`"idle" | "listening" | "thinking" | "speaking"`). The component accepted
either and normalized the string at its boundary. It existed for exactly one reason — the
frozen `obsidian-voice.tsx` imported the string type, and removing it would have broken the
type-check on a file that had to stay byte-identical.

V2 unfroze those files and paid it off in the same change:

- the deprecated `OrbState` alias is deleted from `obsidian-orb.tsx`;
- the normalization boundary is gone — `legacyToState`, the `typeof state === "string"`
  branch, and the `level` prop that only the legacy form used;
- the remaining call site takes `OrbState` from `lib/business/orb.ts`;
- the caption-suppression rule is gone with it, so the orb always renders its own label.

**Exactly one shape describes orb state.** Three tests hold it there: the alias name is absent
from `obsidian-orb.tsx`, no file in `src/` imports `OrbState` from the component, and the
`level` prop does not come back.

V2 also **added one event** to the machine: `text_submitted`. The typed path produces a
transcript that never passed through capture, so it cannot honestly emit `capture_stopped`.
Naming the second source keeps the machine total instead of letting typing fake a capture it
never performed. It is accepted only from a resting state, so typing while the microphone is
live or while an action is executing does not discard what is happening.

### Unbuilt: deliberate tenant and user erasure

**Applied to production 2026-07-29.** `0005_action_log.sql` is live: 12 columns, RLS on,
`org_fk_rule = 'r'`, 2 policies, 1 non-internal trigger — verified by query.

`action_log` is append-only — enforced by policy, by grant, and by a trigger that raises on
any UPDATE or DELETE — and its `organization_id` is `ON DELETE RESTRICT`. Together those mean
**an organization that has history cannot currently be deleted at all.** That is intentional:
erasing a tenant should never happen implicitly, as a side effect of removing some parent row.

**The same is true of users, and by accident rather than by design.** `actor_user_id`
references `auth.users(id)` with **no delete rule stated**, so PostgreSQL defaults it to
`NO ACTION` — which behaves like `RESTRICT` here. A user who has ever approved an action
cannot be deleted either, and Supabase's own account-deletion path will fail on that foreign
key. That outcome is correct; it just was not chosen, and a default is a poor place to keep a
policy this consequential. Whatever procedure resolves the tenant case must resolve this one
in the same breath, and should then state the rule explicitly in the schema rather than
inheriting it.

Note the asymmetry the procedure has to face: a right-to-erasure request usually concerns a
**person**, not a business. So the user case is the one likely to arrive first, and it is the
one currently governed by an unstated default.

It also means there is a genuine tension with no code behind it yet. An append-only audit log
and a right-to-erasure request pull in opposite directions: one exists precisely so the past
cannot be rewritten, and the other is a legal obligation to rewrite it. Neither wins by
default, and picking one silently in application code would be the wrong place to decide it.

**This is not built and must not be improvised.** A real procedure has to answer, in writing,
before any code:

- what "erase" means for an audit log — full row deletion, or redaction of the personal
  fields (`approved_summary` contains customer names) with the outcome record retained;
- who may run it, and what proof of authorization is recorded — and where that record lives,
  given the thing being erased is the record store;
- whether the trigger is dropped for the operation or the procedure runs as a privileged role
  that the trigger deliberately still blocks (today it blocks everyone, by design);
- what is kept for financial and tax obligations, which typically outlast an erasure request
  and are a separate legal duty from the one prompting it.

Until that exists, deleting an organization or a user fails loudly at the foreign key. A loud
failure is the correct behaviour here — far better than a cascade that quietly destroys the
audit trail, or a trigger error that makes an organization delete look like a bug in the
logging code.

### Open: a repeat approval is refused but never recorded

`approveProposal` calls `takeProposal`, which deletes on read; when it returns null the action
returns early with "That suggestion has expired or was already handled" and **writes no
`action_log` row**. So the most likely refusal there is — a second click on Approve — leaves
no trace, and the executor's `already_executed` branch is unreachable through the deployed
path, because the store consumes the proposal before `claimExecution` is ever consulted. The
V3.1 test *"a double tap writes one ride, and leaves one success plus one refusal"* is true of
`executeProposal` in isolation and **false of the path that actually runs**; the log therefore
under-records exactly the refusal it exists to show. Two constraints bind the fix. Delete-on-
read must stay — it is what makes a double-click race-safe, and moving the one-shot check
behind the executor would trade a silent gap for a real double-write window. And
`approved_summary` is `not null`, so the store cannot simply log an id: it has to retain
something about what it handed out (the summary, or enough to reconstruct it) past the point
the proposal itself is consumed, which is a change to what the store keeps and for how long.
Its own task, its own tests. Discovered 2026-07-30 from the first row the table ever held.

### Unbuilt, and the largest risk on the project: there is no second copy

**`git remote` is empty.** Nothing has ever been pushed. This repository — every commit, the
`paused/voice-pre-v2` recovery branch, the migration files, `TASK_RULES.md`, and this
roadmap — exists on one disk and nowhere else.

That outranks every other open item here. The voice hardware, the unapplied `0004`, the
unbuilt erasure procedure: each is a bounded problem with a known shape. A failed drive is
unbounded and silent until the moment it isn't, and it takes the recovery branch with it —
the branch that exists specifically so paused work is recoverable is on the same disk as the
thing it protects.

It is also worth naming what a backup does *not* cover, so the fix is not mistaken for more
than it is: the production Supabase database is a separate system with its own durability
story, and two of the four migrations have been applied by hand rather than by any tool that
tracks them. The schema of record therefore lives partly in files on this disk and partly in
a database, with nothing reconciling the two automatically.

Not built, deliberately. To be scoped as its own task.

### Resolved in V3.1: the two definitions of "create a trip"

V3 shipped an executor whose `create_trip` wrote **only the trips row**, while the ride form
wrote the trips row **plus up to three linked `expenses` rows** (gas, tolls, other). Approving
"log a ride for Ashley, $240, $18 gas, $12 tolls" would have created the ride and silently
dropped the $30 — and because `estimatedTripProfitCents` filters expenses by `trip_id`, the
result was **profit overstated by exactly the costs that were discarded**, with nothing on
screen to say so.

The form's behaviour was correct, and not because it was older: dropping costs corrupts a
number the owner makes decisions on. Both paths now call one function,
`createTripWithCosts` in `src/lib/db/trips.ts`.

V3 also dropped the `partially_applied` outcome, on the stated grounds that every action in
scope was a single-row write, and said the variant would return if a multi-write action was
ever added. **V3.1 added one.** Creating a ride is now two writes, Supabase's client cannot
open a multi-statement transaction, so the trip can land while its costs do not —
`partially_applied` is reachable and is back.

---

## V3 — Approval-gated action proposals

OBSIDIAN may **propose** an action. The owner approves it. Nothing executes on the
assistant's own authority.

### Proposal model (verbatim)

```
proposalId
actionType
humanReadableSummary
structuredPayload
affectedRecords
riskLevel
createdAt
expiresAt
status
requiresConfirmation
```

### Execution safety sequence

On approval, in order:

1. reconfirm session
2. recheck authorization
3. revalidate payload
4. reload affected records
5. confirm the proposal has not expired
6. confirm state has not changed incompatibly
7. prevent duplicate execution
8. execute through an allowlisted server function
9. record the result
10. show accurate success or failure
11. **never convert a failure into a success message**

### Permanently gated until real rules and secure server implementations exist

The following stay **disabled** — not hidden behind a flag, not stubbed, not
"coming soon" — until business rules are defined and secure server implementations
exist:

- refunds
- cancellations
- price changes
- payment recording
- destructive operations
- sensitive exports

---

## Standing engineering rules (apply to every phase)

- No new dependencies without the owner's approval.
- No migrations outside D1, and only with explicit approval.
- Financial formulas, business rules, money math, and trip-status transitions are not
  changed without a direct request and clear evidence of a defect. Money stays as
  integer cents with one conversion boundary.
- Authentication and authorization behavior is not changed casually.
- The AI answers **only** through schema-typed, org-scoped, read-only tools and
  presents pre-formatted money strings verbatim. The no-fabrication guarantee is never
  weakened.
- Multi-tenant isolation holds: org id is never trusted from the client.
- Submit-guard duplicate protection stays on every form.
- `.env.local` is never committed; secrets never reach the browser or public env vars.
- TypeScript stays strict: no `any`, no `@ts-ignore`, no non-null assertions used to
  silence errors.
- Business logic lives in `src/lib/business/` as pure tested functions; components stay
  presentational.
- **The app renders on the server.** No client-side data-fetching or caching layer, and
  no "preserve last-known-good data during refresh failure" behavior. A section that
  needs a loading state uses a Suspense boundary, not a client fetch.
- Scheduled rides move **no** financial number. Only completed rides count.
- A ride with `revenue_cents = 0` while not completed means **"no price set"**, never
  `$0.00`. Checks go through `hasQuotedPrice()`, never a bare `=== 0`. Any
  forward-looking money total reports unpriced rides as a separate **count**, never
  summing them as zero.
