# OBSIDIAN — Source of Truth

## Authoritative systems

- Platform code: `github.com/goldenticket550/Obsu`, branch `master`. Code is authoritative only after it is committed and pushed to `master`.
- Production database: the production Supabase project identified through the project's existing secure configuration. Migration status is recorded in `supabase/MIGRATIONS.md`; no project identifier or credentials belong in this document.
- Live application: Vercel project `obsidian-mvp` at <https://obsidian-mvp.vercel.app>.

## Naming (locked 2026-08-06)

- **OBSIDIAN Core**: the control-plane application (the cross-company orb / command plane).
- **core kernel / core packages**: the shared library layer under `packages/`, consumed by vertical applications.
- Divisions: Rides, Beauty, Trader.
- Client organizations: Midnight Rydes, CCG, Infinite Beauty.

## Working copies

- Canonical local clone: `C:\Users\golde\Downloads\obsidian-rides-mvp\obsidian` until an explicitly approved relocation is completed and verified.
- Preferred future location: `C:\Users\golde\projects\obsidian`.
- `C:\Users\golde\obsidian-mvp`: stale single-tenant towing prototype. It is not the platform and must never be deployed.
- `obsidian-rides-mvp*`, `obsidian-foundation.zip`, and `*-milestone*.zip` under `Downloads` are archives unless separately verified as Git working trees.

## Operating rules

1. Begin each session by fetching and checking divergence. Commit coherent changes and push approved work before ending the session.
2. Deploy only from a clean, up-to-date `master`, only after required CI checks pass, and only with explicit deployment approval.
3. Every schema change must have a numbered file in `supabase/migrations/` and a corresponding entry in `supabase/MIGRATIONS.md`. Apply it through the approved process, then update the ledger the same day.
4. Never hand-edit production schema without first creating and reviewing the matching migration.
5. A dedicated staging Supabase project and staging-only cross-tenant RLS gate must exist and pass before onboarding the next client organization and before any OBSIDIAN Core write path (Milestone 2). Never run the destructive or residue-producing proof against production.
