# PRODUCT STRATEGY

## Thesis

Small service businesses run on improvised operating systems — notes, spreadsheets, texts, calendars, memory. OBSIDIAN replaces that with an AI operating layer over structured business data. We win by proving the product on a **real** business first (Customer Zero), then a small pilot cohort, then commercial release — never by building on assumptions.

## Two products, one core

- **OBSIDIAN PERSONAL** — the founder's private command center. Built first-ish because it's the founder's own daily tool and a forcing function for CORE. Single-tenant, multi-venture, plus eventual trading and project intelligence.
- **OBSIDIAN BUSINESS** — the commercial multi-tenant SaaS. The revenue engine. Sold to service operators, starting with the RIDES vertical.

Both consume the same **OBSIDIAN CORE**. See `VERTICALS.md` for exact boundaries.

## Delivery model

The first commercial product is a **web application** — deliberately not native mobile. It must be mobile- and desktop-responsive, PWA-installable ("add to home screen"), reachable by secure login link, and capable of microphone input, AI chat, dashboards, and notifications. Native iOS/Android is deferred until after product-market fit; the API-first architecture (`ARCHITECTURE.md` §6) makes those clients cheap when the time comes.

## Interaction model

Three input modes, all resolving to the same structured actions:
- **Text** — "How much did I make this month?"
- **Voice** — "Obsidian, log a ride."
- **Form** — for users who prefer traditional interfaces.

Every AI interaction connects to structured data through tools, permissions, and business rules. We never ship a system that answers from unverified conversation memory alone.

## Go-to-market: Customer Zero → pilots → commercial

1. **Customer Zero — Midnight Rydes.** The founder's black-car business runs on OBSIDIAN RIDES daily. Validate trip logging, expenses, customer history, revenue dashboards, AI insights, retention alerts, and voice input on real operations. (Full detail below and in `AI_HANDOFF.md`.)
2. **Pilot cohort — 3–5 black-car/chauffeur operators.** Recruit after Customer Zero is stable. Use real feedback to validate features. Build for what pilots actually need, not for assumptions.
3. **Commercial RIDES.** Open subscriptions once the vertical earns trust with real operators.
4. **Second vertical (BEAUTY) / TOWING integration.** Only after CORE has proven it can carry more than one vertical without coupling.

## Midnight Rydes as Customer Zero

**Goal:** de-risk the product by running it on a real business before selling.

**What gets tested:** trip logging (text + voice), expense capture, customer history, revenue dashboards, AI insights, retention alerts, voice input, and the confirm-before-send flow for follow-ups.

**Success criteria (illustrative):** the founder logs trips faster by voice than by spreadsheet; monthly revenue/profit numbers are trusted without cross-checking; at least one retention alert leads to a re-booking; nothing crosses tenant boundaries. Concrete acceptance criteria are tracked per phase in `ROADMAP.md`.

**Why it matters:** Customer Zero is the difference between a product shaped by a real operator and one shaped by guesses. It also seeds the pilot narrative ("the founder runs his own business on this").

## Proactive business intelligence (the differentiator)

OBSIDIAN earns its keep by surfacing high-value insight, disciplined against notification fatigue. Examples: retention ("this customer normally books every 30 days and is now 52 days overdue"), revenue ("down 14% vs the same point last month"), expenses ("fuel up 23% this month"), profitability ("airport trips out-margin hourly bookings"), scheduling ("back-to-back tomorrow with only 35 minutes between destinations"), opportunity ("12 inactive customers who previously spent over $500"). The bar is *"would this change a decision?"* — not *"is this true?"*

## Permissioned action model

Insight is safe; action is gated. The four levels (Read / Prepare / Confirm-before-action / High-risk) from `ARCHITECTURE.md` §3 govern everything the AI can do. Owners approve any outbound message, booking change, or sensitive action. OBSIDIAN never moves money or places trades autonomously.

## External projects — strategy for later integration

The founder has two sibling projects being completed first. Neither is merged now.

- **Trading Scanner** stays a separate project. Future path: **OBSIDIAN PERSONAL consumes its alerts and analytics via an API/event interface** (`TRADING_ALERT_TRIGGERED`). PERSONAL assists with analysis, alerts, and risk — never autonomous trade execution.
- **Towing AI** stays a separate project. Future path: it may become **OBSIDIAN TOWING**, integrating via APIs, shared services, shared auth, shared data models, and events (`CALL_COMPLETED`). The towing MVP must be validated independently first.

Rationale: prove each system on its own before coupling. Premature merging would entangle three unproven products and slow all of them.

## Commercial model (summary)

Subscription SaaS billed via Stripe, with tiers (Solo / Pro / Business AI) whose exact pricing is **not** finalized and **not** hard-coded. Plans and usage limits are data, so pricing can evolve without re-architecting. Full detail in `SAAS_MODEL.md`.

## What we are deliberately NOT doing yet

Not building every vertical at once. Not building native apps. Not merging the Trading Scanner or Towing codebases. Not hard-coding pricing. Not shipping autonomous financial actions. Not optimizing for scale before we have users. Each of these is a strategic "later," recorded so future contributors don't mistake it for an oversight.
