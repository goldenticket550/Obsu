# VERTICALS & LAYERS

This document defines the exact difference between the OBSIDIAN layers and each vertical, so nobody conflates them.

## The layer stack

```
                        OBSIDIAN                (the ecosystem / brand)
                     OBSIDIAN CORE              (shared kernel — a platform, not a product)
          ------------------------------------------------
          OBSIDIAN PERSONAL        OBSIDIAN BUSINESS      (products — consumers of CORE)
          ------------------------------------------------
          OBSIDIAN RIDES · TOWING · BEAUTY · future        (verticals — extend CORE's model)
```

## OBSIDIAN CORE — the shared kernel

**What it is:** the shared intelligence and platform infrastructure that every product and vertical builds on. It is *not* something a customer buys directly.

**Responsibilities:** AI orchestration, authentication, user accounts, organization accounts, permissions, memory, tool calling, integrations, notifications, analytics, audit logs, billing, voice, AI chat, event processing, background jobs.

**Rule:** CORE depends on no vertical. Verticals depend on CORE. CORE holds the shared data model; verticals extend it.

**Lives in:** `packages/*`.

## OBSIDIAN PERSONAL — the owner's command center

**What it is:** the founder's *private* AI command center — a single-operator consumer of CORE. Original identity and design; inspired by the idea of a sophisticated intelligent assistant but never an imitation of any copyrighted character.

**What it does:**
- **Business intelligence** — monitors Midnight Rydes and overall OBSIDIAN company performance: revenue, expenses, customers, leads, bookings, projects, tasks. ("Obsidian, give me my business briefing.")
- **Trading intelligence** — *eventually* consumes the separate Trading Scanner via API/events: watchlists, market alerts, EMA conditions, fair value gaps, liquidity, structure, "The Strat," multi-timeframe analysis, trading journal, daily P&L, risk limits, discipline monitoring. **Assists with analysis, alerts, and risk management only — never autonomously places trades** without explicit future authorization and strong safeguards.
- **Communication** — eventual Gmail/Calendar/SMS/notification integrations. ("Obsidian, what needs my attention today?")
- **Project intelligence** — tracks dev status of the Trading Scanner, Towing AI, OBSIDIAN, and future projects. ("Obsidian, where did we leave off on the towing system?")

**Distinct from BUSINESS:** PERSONAL is single-tenant (the owner) and spans multiple ventures + trading + projects. BUSINESS is multi-tenant and sold to others.

## OBSIDIAN BUSINESS — the commercial SaaS

**What it is:** the commercial, subscription, **multi-tenant** SaaS platform for small/medium service businesses that today run on notes, spreadsheets, texts, calendars, memory, and disconnected apps.

**Core value:** an AI business manager that *remembers the business, tracks the money, understands the customers, helps manage operations, and tells the owner what needs attention* — expressed as outcomes, not AI terminology.

**Distinct from a vertical:** BUSINESS is the commercial container and shared UX; a *vertical* is the trade-specific logic and data plugged into it. A chauffeur signs up for BUSINESS and gets the RIDES vertical.

## The verticals

### OBSIDIAN RIDES — first vertical (ships first)

**Why first:** the founder owns **Midnight Rydes** and can be Customer Zero, testing the product on a real business before selling. See `PRODUCT_STRATEGY.md`.

**Target users:** black-car operators, chauffeurs, luxury transportation companies, limousine operators, small fleet operators.

**Capabilities:**
- **Trip logging** by text or voice ("Obsidian, log a trip." → structured Trip record with revenue, gas, tolls, estimated profit).
- **Customer intelligence** — repeat-customer tracking, lifetime value, inactivity detection ("Six previous customers haven't booked in over 90 days." → *offer* to prepare follow-ups; owner approves before sending).
- **Business briefings** — "You have three rides today totaling $780." / "July revenue is $8,420, estimated operating profit $6,250, up 18% vs last month." / "Manhattan-to-JFK is your highest-profit recurring route."
- **Future:** automatic mileage estimation, revenue per mile/hour, vehicle & trip profitability, driver performance, expense trends.

**Data:** extends the shared model with the RIDES Trip fields in `DATA_MODEL.md`.

### OBSIDIAN BEAUTY — future vertical

**Target users:** lash techs, makeup artists, barbers, hair stylists, nail techs, beauty professionals.

**Capabilities:** appointment tracking, revenue/expenses, client history, service profitability, retention, rebooking reminders, product-cost tracking, follow-up campaigns, monthly performance. ("Eight customers who normally return every 3–4 weeks haven't rebooked." → offer rebooking messages. "Which service makes me the most money?" → computed from structured data.)

**Sequence:** built only after RIDES validates CORE's ability to carry a second vertical.

### OBSIDIAN TOWING — future vertical (integration, not a rebuild)

**What it is:** the founder's *separate* AI Towing Call/Dispatch project, which may later become OBSIDIAN TOWING.

**Capabilities (eventual):** AI receptionist, AI call answering, AI SMS, customer intake, dispatch, driver assignment, ETA management, job tickets, call transcripts, pricing workflow, customer notifications, revenue analytics.

**Hard rule for now:** **do NOT merge the current towing codebase into OBSIDIAN.** The towing MVP must be proven independently first. Document the future integration through: APIs, shared services, shared authentication, shared data models, and event architecture (e.g. a `CALL_COMPLETED` event flowing into CORE analytics). See `PRODUCT_STRATEGY.md` §"External projects."

### Future verticals

The same pattern — extend CORE's data model, plug into BUSINESS, validate on a real operator — applies to any future trade.

## One-line contrasts

- **CORE vs PERSONAL/BUSINESS:** CORE is the engine; PERSONAL and BUSINESS are cars built on it.
- **PERSONAL vs BUSINESS:** PERSONAL is the owner's single-tenant cockpit across ventures + trading; BUSINESS is the multi-tenant product sold to other operators.
- **BUSINESS vs a vertical:** BUSINESS is the commercial shell + shared UX; a vertical is trade-specific logic/data inside it.
- **RIDES vs TOWING vs BEAUTY:** same architecture pattern, different trade extensions and sequencing — RIDES now, TOWING via later integration, BEAUTY after RIDES.
