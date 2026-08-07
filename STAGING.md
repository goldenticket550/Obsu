# OBSIDIAN Staging

- Project: `Obsidian Staging`
- Supabase project ref: `ngvxfkmmhkgrlnsgixle`
- Organization: `Obsisdian-mvp` (Pro)
- Region: AWS `us-east-1`

Credentials are stored only as the GitHub Actions repository secrets
`STAGING_SUPABASE_URL`, `STAGING_SUPABASE_ANON_KEY`, and
`STAGING_SUPABASE_SERVICE_ROLE_KEY`. Never use production credentials for the
RLS proof.

Migrations 0001 through 0011 were applied in order and verified on 2026-08-07.
Every future migration must be applied and verified on staging before it is
applied to production.

Run the manual **Staging RLS Gate** GitHub Actions workflow before Core write
work. The proof creates two isolated tenant fixtures and must report every
cross-tenant operation as refused. Its append-only audit rows intentionally
remain in staging; the proof must never be run against production.
