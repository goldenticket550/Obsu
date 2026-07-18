# SAAS MODEL

> **Status:** Commercial model for Phase 0. Billing is not implemented (Phase 8 / commercial). **Pricing is not finalized and must not be hard-coded.** Plans and limits are *data*.

## Principle

The architecture must support subscription plans and usage limits without baking business assumptions into code. Plans, entitlements, and usage limits are stored as configuration/records so pricing and packaging can change without re-architecting. Any place that would hard-code "Pro costs $X" or "Solo gets N trips" is a bug.

## Tiers (illustrative — not final)

### SOLO — single-person businesses
Business dashboard; revenue/expense tracking; AI chat; basic customer intelligence.

### PRO
Everything in Solo, plus advanced analytics; AI insights; customer retention; follow-up workflows; automations; SMS integrations.

### BUSINESS AI
Everything in Pro, plus AI receptionist; voice agents; team features; advanced automation; multi-user accounts; custom workflows.

These names and contents are a starting point for packaging, not a commitment. Feature-to-tier mapping is expressed as **entitlements**, not `if (tier === 'pro')` scattered through the code.

## Billing architecture

- **Provider:** Stripe (subscriptions + webhooks), isolated behind `packages/billing` via `integrations/stripe` so it can be swapped.
- **Entitlements:** a plan maps to a set of entitlements (feature flags) and usage limits. The app checks entitlements, not tier names.
- **Usage limits:** metered where relevant (e.g. AI messages, SMS sends, voice minutes), enforced against plan limits. Limits are configuration.
- **Webhooks:** Stripe webhook events update subscription state; the webhook secret is server-side only (`SECURITY.md` §5).
- **Payment data:** handled by Stripe-hosted flows. OBSIDIAN never stores or types raw card numbers.

## Explicitly out of scope

**RevenueCat is not required** for the initial web SaaS and should not be added unless a later native-app strategy justifies it. Native mobile billing is a post-PMF concern.

## What Phase 0 commits to

Only that the data model and module boundaries can *accommodate* plans, entitlements, and usage limits later — via `packages/billing` and a plan/entitlement representation. No tier is implemented now; no price is written into code.
