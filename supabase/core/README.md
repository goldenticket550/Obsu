# OBSIDIAN Core

Core Staging is the Supabase project `bensoqslkfeyjxpvzrrm`.

Migrations `0001` through `0003` are applied to **staging only**. They have not
been applied to Core production, and no Core production project exists yet.

Applications report versioned `event` and `health` signals to the
`ingest-signal` Edge Function. Each request includes a per-application key ID
and an HMAC-SHA256 signature over the timestamp and exact request body. The
function rejects missing authentication headers, oversized bodies, stale
timestamps, invalid signatures, application mismatches, and excessive request
rates. Accepted signals are insert-only and idempotent by application and
`dedupKey`.

Before Core production:

1. Rotate the staging database password before creating or configuring Core
   production.
2. Either move credential decryption into the Edge Function with WebCrypto so
   `CORE_CREDENTIAL_ENCRYPTION_KEY` never leaves the Edge runtime, or confirm
   that Supabase does not log RPC parameters.
