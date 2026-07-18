# SECURITY

> **Status:** Security *design* for Phase 0. Nothing is implemented yet. These requirements are binding on Phase 1+ and must not be retrofitted late.

## 1. Multi-tenant isolation (the top priority)

OBSIDIAN BUSINESS is a secure multi-tenant SaaS. **Every business record belongs to exactly one Organization, and data must never leak across organizations.**

- **Tenancy model:** `User` → `Membership` (with role) → `Organization`. A user may belong to multiple organizations; the active tenant is resolved per request in `packages/auth`.
- **Mechanism:** PostgreSQL **Row-Level Security (RLS)** — recommended via Supabase. Every tenant-scoped table has `organization_id` and an RLS policy that restricts rows to the caller's memberships. Isolation is enforced **at the database**, not only in application code, so a bug in a query can't silently cross tenants.
- **Service-role key** is server-only and never shipped to the client; client access always goes through RLS-enforced paths.
- **Verification:** cross-tenant isolation gets an explicit negative test in Phase 1 (user in Org A cannot read/write Org B). No phase that touches data ships without it.

## 2. AI permission levels

The AI's authority is classified into four levels. This is enforced by the orchestrator + permission engine (`packages/core`), combined with the caller's role.

- **Level 1 — Read:** read revenue, bookings, customer history; analyze trends. No confirmation.
- **Level 2 — Prepare:** draft messages, invoices, social posts; suggest booking responses. Produces a proposal only; nothing leaves the system, nothing is written as a side effect.
- **Level 3 — Confirm before action:** send message/email, schedule a post, modify/create bookings/appointments. Requires explicit user confirmation before execution. Audited.
- **Level 4 — High-risk:** financial transfers, bank actions, major destructive actions, sensitive account changes. Requires **strong authentication + explicit confirmation**, always audited. **OBSIDIAN never autonomously moves money or places financial trades.**

The AI proposes structured actions; the system validates them against schemas, permissions, and business rules before anything is committed.

## 3. Tool safety

Tools have **explicit schemas**. The `ai` package calls tools, never raw tables. A tool validates its inputs, checks the caller's permission level and role, enforces tenant scope, executes, and (for Level 3–4) records an audit entry. No "do anything" tool exists; capabilities are enumerated and least-privilege.

## 4. Audit logging

Every Level 3–4 action — and every sensitive read where warranted — writes an `AuditLog` row: who (User), what (action + tool + payload summary), when (UTC), in which Organization, and the outcome. Audit logs are append-oriented and are themselves protected by tenant isolation. This is a first-class requirement across all phases, not an add-on.

## 5. Secrets & configuration

Never expose secrets. All credentials live in environment variables (`.env.local`, never committed — see `.gitignore` and `.env.example`). The Supabase service-role key, Stripe secret key, Stripe webhook secret, Anthropic key, ElevenLabs key, and SMS provider key are server-side only. No secret is ever placed in client bundles, URLs, query strings, or logs.

## 6. Privacy & data handling

Personal and sensitive data is never placed in URL parameters or query strings. Customer PII is tenant-scoped and access-logged where appropriate. Data is not compiled across tenants. Outbound communications (SMS/email) are Level-3 and require confirmation, preventing accidental or injected sends.

## 7. Prompt-injection & untrusted content

Because OBSIDIAN reads external content (emails, call transcripts, documents, web data), that content is treated as **data, not instructions**. The orchestrator does not execute actions requested *inside* retrieved content; it surfaces them to the user. Actions that send data outward, change settings, or move money require explicit user confirmation regardless of what any document "says." This mirrors the assistant's own operating boundary and must be built into the tool layer.

## 8. Authentication

Supabase Auth (or another appropriate provider) handles login. Secure login links; sessions resolve tenant context. High-risk (Level 4) actions require step-up/strong authentication. **Password entry, financial credentials, and payment details are handled by the user or a dedicated secure provider (e.g. Stripe-hosted flows) — OBSIDIAN's automation never types raw credentials or card numbers into forms.**

## 9. Destructive actions

Hard deletion is a Level-4 action. The default is soft-delete for auditability. Bulk/destructive operations require explicit confirmation and are audited.

## 10. Security checklist for every phase

Tenant isolation enforced and negatively tested · secrets only in env vars · audit logs on all Level 3–4 actions · AI actions classified by level · tools schema-validated and least-privilege · no PII in URLs/logs · outbound comms gated by confirmation · untrusted content treated as data. A phase is not "done" until these hold for the code it added.
