# Claude Code handoff: Obsidian platform and Obsidian Rides

You are taking over a production-bound application. Begin with a read-only audit, verify every claim below from the repository and provider configuration, and preserve the approved user experience. Do not assume that passing tests means the product is flawless or market-ready.

## Authority and safety rules

- Repository: `https://github.com/goldenticket550/Obsu`
- Protected branch: `master`
- Expected handoff commit: `a86f49035a150f42b451ef22b59978cf5be92532` or a later commit containing this document.
- Never force-push, rewrite history, delete data, rotate credentials, change billing, or deploy without explicit operator approval.
- Never print, commit, log, or expose secret values. Refer to environment variables by name only.
- Preserve tenant/org isolation and the proposal-before-write safety model.
- Work on a new branch for material changes. Keep commits small and reversible.
- Do not commit `.env.local`, generated audio, logs, `.next`, `.vercel`, `node_modules`, or build caches.
- Before editing, fetch, confirm the remote, confirm the branch and clean state, inspect both audit reports, and run the baseline checks.

## Product direction

Obsidian is the parent AI product. Obsidian Rides is the first vertical. The same secure core should later support other service businesses, including lash businesses, under different product names and domain language. Do not perform a broad rename or premature rewrite. First identify stable platform seams for identity/branding, vocabulary, workflows, metrics, AI tools, attention rules, and database entities. Preserve Obsidian Rides while extracting reusable contracts incrementally.

## What is implemented

- A cinematic Obsidian Rides Command Center built in Next.js 14.
- Refined Eclipse Iris orb: restrained orbital lines, aura/rings/sparkles, central glow, and mobile composition.
- Bat signal removed from the current design.
- Compact mobile Command Center entry treatment so it does not cover the orb.
- Refined Business Pulse typography, larger values, softer outlines, subtle reflective depth, cyan hierarchy, and gold reserved for estimated operating profit.
- ElevenLabs server-side voice integration for speech-to-text and text-to-speech.
- Configured operator-selected Charles voice ID: `zNsotODqUhvbJ5wMG7Ei` through `ELEVENLABS_VOICE_ID`.
- TTS model `eleven_multilingual_v2`, MP3 44.1 kHz/128 kbps, speed `0.90`, stability `0.42`, similarity `0.82`, style `0.28`, speaker boost enabled.
- Daily full spoken briefing on first opening that day, shorter greeting on later openings, startup chime, and a Replay daily briefing control.
- Speech-friendly money normalization so dollar amounts are spoken clearly.
- Voice proposals require operator confirmation before a business write; do not weaken this.
- Secure password recovery/callback flow and production site URL handling.
- Server-only provider secrets with tests intended to stop provider keys from entering client components.
- Voice request validation, payload caps, timeouts, and best-effort rate limiting.
- Audit and state reports are stored at `OBSIDIAN_CORE_AUDIT.md` and `OBSIDIAN_STATE_2026-08-04.md`.
- Design references are stored at `desktop-command-target.png` and `gotham-signal-reference.png`.

## Verification already performed

- Local typecheck passed.
- Vitest passed: 38 test files, 643 tests.
- ESLint passed with no warnings or errors.
- Next.js production build passed and generated 19 routes.
- `git diff --check` passed; only Windows LF/CRLF warnings were reported.
- Vercel production build completed successfully.
- Production URL: `https://obsidian-mvp.vercel.app`.
- Deployment produced READY state and was aliased to the production URL.
- The operator personally viewed the live phone experience and reported that it looks and sounds good.
- Codex did not independently authenticate into the production dashboard and visually exercise every state. Microphone capture and real transcription remain not independently verified by Codex. Treat them as requiring browser/device verification.

## Backup state

- Feature checkpoint: `47eb8c7` (`Lock in command center and ElevenLabs voice experience`).
- Audit/reference checkpoint: `a86f490` (`Archive Obsidian audit and design references`).
- At handoff, local `master` and `origin/master` matched at `a86f49035a150f42b451ef22b59978cf5be92532` before this handoff document was added.
- GitHub push was a normal push to an originally empty repository. No force push or remote history overwrite occurred.
- Local-only secrets and reproducible artifacts were intentionally excluded from Git.

## Environment variables: names only

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`

Verify that production has the required values, that preview/development separation is correct, and that no values appear in source, logs, client bundles, or documentation. Do not reveal any value in your report.

## Paid-provider paths

- ElevenLabs `/speech-to-text` through `/api/voice/transcribe` using `scribe_v1`.
- ElevenLabs `/text-to-speech/{voice_id}` through `/api/voice/speak` using `eleven_multilingual_v2`.
- Anthropic calls in the Ask Obsidian flow and natural-language ride parsing.
- Supabase and Vercel may incur usage-based platform charges depending on plan and traffic.

Do not quote stale prices. Check current official provider pricing and the operator's actual plans before estimating cost. There are deliberately no automatic retries for metered voice calls. Confirm that remains true.

## Current voice protections and limitations

- Recording UI has a 30-second cap.
- Audio payload cap: 8 MiB plus 64 KiB multipart allowance.
- TTS text cap: 2,000 characters.
- Provider timeout: 25 seconds.
- Supported audio types are allow-listed.
- Best-effort local limiter defaults to 20 requests per 60 seconds and 5,000 in-memory entries.
- The limiter is process-local/per-instance, not durable or globally coordinated. In serverless production, separate instances and route bundles may weaken the effective limit.
- There is no known per-organization spend budget, daily voice quota, provider circuit breaker, or durable abuse-control ledger.
- Password-reset email has no application-level throttle discovered in the audit; Supabase protections may be the only layer.

Before market launch, design durable per-user and per-org limits, spend ceilings, alerts, dashboards, graceful 429/provider-failure behavior, and a documented emergency kill switch. Do not implement a vendor or architecture choice without explaining the tradeoff.

## Known defects and uncertainties to re-check

The saved state audit predates the final aesthetic approval and must not be treated as current truth without re-checking. It reported:

1. Orb treatment could render amber while its caption said `Ready`.
2. Atmosphere layers could be flat, superseded, duplicated, or dead.
3. `skyline-shell.module.css` still uses a grid area named `ride`.

Also verify:

- Microphone opens only from a genuine user gesture, captures on iOS Safari and supported desktop browsers, releases tracks on stop/unmount/page hide, and never displays Listening when capture is inactive.
- Real audio returns real transcription and failures never silently become success.
- Startup briefing plays only under the intended once-per-day rule; replay always works; later openings use only the short greeting.
- Dollar amounts, dates, names, zero values, negatives, and large numbers are spoken naturally.
- No browser-generic voice unexpectedly replaces Charles on the normal production path.
- No paid provider request retries automatically.
- Auth callback, password reset, middleware, cookies, CSRF assumptions, redirects, and session expiry are secure.
- Every database read/write is org-scoped and protected by database RLS, not only application filters.
- AI tools cannot bypass confirmation, alter org IDs, fabricate records, or exceed bounded tool iterations.
- Accessibility, reduced motion, focus order, keyboard support, contrast, mobile safe areas, loading states, and error recovery meet launch quality.
- Logging and analytics do not retain raw audio, sensitive transcripts, customer information, or secrets without an explicit retention/privacy policy.
- Dependency, secret, SAST, license, and supply-chain scans are clean.
- Backups and restore procedures exist for Supabase data, not merely source code.

## Platform extraction guidance

Read `OBSIDIAN_CORE_AUDIT.md` before proposing reuse work. Its snapshot estimated roughly 30% neutral/reusable unchanged, 47% mixed/reusable after renaming or adapters, and 22% genuinely rides-specific. Verify those numbers against the current tree.

Favor explicit seams such as:

- Organization brand and product identity configuration.
- Domain vocabulary packs (`ride`, `trip`, `customer`, `lash appointment`, etc.).
- Domain modules for forms, records, metrics, and attention rules.
- A neutral voice/orb/assistant shell.
- Tool registries with per-domain schemas and permissions.
- Theme tokens and approved presentation variants.
- Versioned database migrations and domain-specific tables with shared tenancy/auth foundations.

Do not simply replace every occurrence of `ride`. Database columns, exported types, routes, tests, and user-visible language have different migration costs. Produce an incremental architecture plan that keeps the current rides product working.

## Required takeover procedure

1. Clone or fetch the repository and verify the handoff commit and remote.
2. Read `OBSIDIAN_CORE_AUDIT.md`, `OBSIDIAN_STATE_2026-08-04.md`, this handoff, and the recent commit history.
3. Inspect the full diff/history rather than trusting summaries.
4. Run install with the lockfile, then typecheck, all tests, lint, production build, and `git diff --check`.
5. Perform a secret scan and dependency/security/license audit. Report findings without exposing secrets.
6. Map architecture, trust boundaries, tenant isolation, provider calls, data retention, and all billable actions.
7. Test the authenticated production-equivalent flow in supported browsers/devices, including real microphone/STT/TTS and failure states. Mark each item observed, tested, inferred, or not verified.
8. Verify the three open visual/code defects above without changing the operator-approved look casually.
9. Produce a prioritized market-readiness report: critical launch blockers, high-priority hardening, product polish, and platform-extraction work.
10. For safe fixes, create a new branch, add regression tests, make small reversible commits, rerun all checks, and show the exact diff. Do not merge, deploy, migrate production data, rotate keys, or change billing without operator approval.
11. End with a backup confirmation, rollback instructions, remaining risk register, estimated provider-cost model based on current official prices, and a go/no-go recommendation.

## Acceptance standard

Do not say `done`, `secure`, `protected`, `production-ready`, or `without flaw` based only on compilation. Separate:

- Built but not exercised.
- Covered by automated tests.
- Rendered and personally observed.
- Verified against production/provider configuration.
- Still inferred or unknown.

Protect the current approved experience while making the underlying system safer, reusable, observable, cost-bounded, and ready to become the shared Obsidian platform.
