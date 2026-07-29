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
