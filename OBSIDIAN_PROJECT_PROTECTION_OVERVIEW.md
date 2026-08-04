# Obsidian Project Protection Overview

## Purpose

Obsidian is the parent AI business platform. Obsidian Rides is its first business vertical. The long-term direction is to reuse the secure Obsidian foundation for other service businesses, including lash businesses, while giving each vertical its own name, workflows, language, metrics, and presentation.

## Protected source and production locations

- GitHub repository: `https://github.com/goldenticket550/Obsu`
- Protected branch: `master`
- Production application: `https://obsidian-mvp.vercel.app`
- Feature checkpoint: `47eb8c7`
- Audit and design-reference checkpoint: `a86f490`
- Claude Code handoff checkpoint: `62740aa`

The local and GitHub branches were compared after the handoff push and matched exactly. All pushes were normal, non-force pushes. No remote history was overwritten.

## What was completed

- Rebuilt the dashboard as a cinematic Obsidian Rides Command Center.
- Refined the Eclipse Iris orb with fewer orbital lines, a stronger aura, restrained rings, sparkles, and a polished central glow.
- Removed the bat signal from the active design.
- Reduced the mobile Command Center entry panel so it does not dominate the orb.
- Refined the Business Pulse panel with larger figures, clearer lettering, softer outlines, subtle reflective depth, restrained cyan, and gold reserved for estimated profit.
- Connected ElevenLabs speech-to-text and text-to-speech through server routes.
- Configured the selected Charles voice through `ELEVENLABS_VOICE_ID`.
- Tuned the voice to speak more slowly and naturally.
- Added a full daily spoken briefing on the intended first opening, a shorter repeat greeting, a startup chime, and a Replay daily briefing control.
- Improved spoken dollar formatting.
- Preserved operator confirmation before voice-driven business writes.
- Added voice request caps, validation, timeouts, best-effort rate limiting, and security regression tests.
- Preserved server-only provider keys.
- Added and documented secure password recovery.
- Deployed the refined product to Vercel production.

## Verification performed

- TypeScript typecheck passed.
- 38 Vitest files passed.
- 643 automated tests passed.
- ESLint passed with no warnings or errors.
- The Next.js production build passed and generated 19 routes.
- Vercel reported the production deployment as READY.
- The operator viewed the live mobile experience and confirmed that it looks and sounds good.

Automated tests and compilation do not prove that software is flawless. Codex did not independently authenticate into every production state. Real microphone capture, transcription, cross-browser behavior, production database policies, provider billing controls, and all failure modes still require an independent market-readiness audit.

## What is backed up

GitHub contains the application source, tests, configuration examples, security controls, audit reports, handoff instructions, and design-reference images.

Important records include:

- `CLAUDE_CODE_HANDOFF.md`
- `OBSIDIAN_CORE_AUDIT.md`
- `OBSIDIAN_STATE_2026-08-04.md`
- `desktop-command-target.png`
- `gotham-signal-reference.png`

## What is intentionally not stored in GitHub

- `.env.local`
- Secret values and provider credentials
- Generated ElevenLabs MP3 test output
- Local logs
- `.next` build output
- `.vercel` local linkage data
- `node_modules`
- TypeScript build caches

These exclusions protect credentials and avoid backing up generated or reproducible artifacts as source code.

## Environment variable names

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`

No secret value should ever be placed in a report, source file, screenshot, log, or client-side bundle.

## Important protections already present

- Server-side provider calls.
- Tests guarding against provider secrets entering client components.
- Organization-scoped application behavior.
- Proposal and approval workflow before business writes.
- A 30-second recording limit.
- An 8 MiB audio payload limit plus multipart allowance.
- A 2,000-character speech-output limit.
- A 25-second provider timeout.
- Supported-audio allow-listing.
- Best-effort local voice rate limiting.
- No intended automatic retry for paid voice calls.

## Market-readiness work still requiring independent verification

- Durable, shared per-user and per-organization rate limits.
- Daily and monthly provider-spend ceilings.
- Usage alerts, circuit breakers, and emergency kill switches.
- Application-level password-reset abuse protection.
- Supabase row-level security verification for every table and operation.
- Database backup and restore testing.
- Real microphone, transcription, and voice testing on iOS Safari and supported desktop browsers.
- Privacy and retention policy for recordings, transcripts, customer information, and logs.
- Dependency, vulnerability, secret, license, and supply-chain scans.
- Accessibility, keyboard, focus, contrast, reduced-motion, and mobile-safe-area testing.
- Operational monitoring, incident response, rollback, and recovery procedures.
- Verification of the previously reported amber/Ready mismatch, atmosphere-layer duplication, and `ride` CSS grid-area coupling.

## Safe next-step standard

Claude Code or any future engineer should begin with a read-only audit, verify the repository and current commit, run the complete test/build suite, inspect the saved reports, and work on a separate branch. Changes should be small, tested, reversible, and reviewed before merging or deploying. Production migrations, credential rotation, billing changes, and deployments require explicit operator approval.

The approved visual and voice experience should be preserved while the underlying platform becomes more reusable, observable, cost-bounded, secure, and ready for additional Obsidian business verticals.
