# OBSIDIAN — state of the tree, 2026-08-04

**Nothing was committed, stashed, discarded, reset, cleaned, checked out, switched or rebased. No file was deleted or moved. No build was run, no server started. No defect found here was repaired.**

Two files were touched: `.gitignore` (appended, Step 0) and this report.

## Git state at the start

```
branch: master
HEAD:   026c76a feat: implement cinematic command center identity
```

19 modified, 9 untracked — including `apps/web/charles-voice-test.mp3` and `apps/web/charles-money-test.mp3`.

---

## Step 0 — the ignore gap is closed

Appended to the end of `.gitignore`, leaving all 40 existing lines untouched and in order:

```
# Generated audio — TTS output and voice test artefacts. Never commit.
*.mp3
*.wav
*.webm
*.m4a
*.ogg
*.opus
```

**Both MP3s are gone from `git status --short`.** Neither is tracked — `git ls-files --error-unmatch` fails for both. And a full-history check confirms the good case:

```
git log --all --name-only --format="" | grep -iE "\.(mp3|wav|m4a|ogg|opus|webm)$"
→ (no output)
```

**No audio file has ever been committed on any branch.** The gap was real but nothing had fallen through it.

**One caveat worth stating:** `*.webm` and `*.mp3` are now ignored *everywhere*, including `apps/web/public/`. If a legitimate audio or video asset is ever added there it will be silently skipped. A negation (`!public/**/*.mp3`) would fix that; I did not add one, because this task permits only the exact lines specified.

---

## Step 1 — what the ten commits actually did

Read from diffs, not messages. **No commit in this range touched `package.json`, any lockfile, or `supabase/migrations`** — verified by name-only log across `aa9de59..HEAD`.

### Capability: the Command Center became a scene (5 commits, ~3,000 lines)

**`e20df72` Build interactive Obsidian Rides command center** — 26 files, +1,532/−214. The largest single change in the range. Introduced `command-center-scene.{tsx,module.css}`, `iris-visualizer.{tsx,module.css,test}`, `iris-visualizer-state.ts`, `route-line.{tsx,module.css}`, `route-visual-state.ts`, `eclipse-iris-enhancements.module.css`, and rewrote `page.tsx`, `app-shell.tsx` and four command panels. Also edited `.gitignore` and `tailwind.config.ts`.

**`231ba78` Rebuild cinematic command center** — 16 files, +581/−61. Added `command-surfaces.module.css` and a raster asset `public/images/obsidian-skyline-command-v2.png`; reworked the scene CSS, route line, and every command panel. Added a `variant` prop pattern to the panels.

**`947c784` Rebuild Eclipse Iris instrument** — 5 files, +351/−7. Almost entirely CSS: `eclipse-iris-enhancements.module.css` and `obsidian-intelligence.module.css`.

**`026c76a` feat: implement cinematic command center identity** — 17 files, +527/−755. **Net −228 lines.** Added `eclipse-iris-canvas.{tsx,test}` and `command-center-identity.test.ts`; deleted a large amount of prior CSS. This is where the orb moved from pure CSS/SVG to a canvas implementation.

### Capability: voice went live (2 commits)

**`751835d` Enable Eclipse Iris voice control** — 12 files, +447/−150. Wired microphone capture into `obsidian-intelligence.tsx`, touching `audio-capture.ts`, `browser-audio.ts`, `obsidian-voice.tsx`, and `orb-interface.test.ts` / `voice-capture.test.ts`. **This is the commit that made the four voice states reachable from the dashboard.**

**`1bbbc30` Fix live voice upload** — 4 files, +24/−2. Small fix in `transcribe-client.ts` plus test updates.

### Capability: password recovery (1 commit + 3 docs)

**`e87e4ff` Add secure password recovery flow** — 12 files, +432/−51. New `lib/auth/recovery.{ts,test.ts}`, `app/forgot-password/{page,actions}`, `app/reset-password/{page,actions}`, `app/auth/callback/route.ts`; modified `lib/db/supabase-middleware.ts`, `lib/nav.{ts,test.ts}`, `login/page.tsx`, `.env.local.example`.

**`4c78d77`, `2f7c22b`, `2bf2b5e`** — documentation only. Each touches exactly `AI_HANDOFF.md` and `CURRENT_STATE.md`, 2–7 lines.

### Flagged categories

| category | touched? |
|---|---|
| Financial formulas | **No.** `profit.ts`, `revenue.ts`, `payment.ts`, `expenses.ts` untouched. (`lib/money.ts` is modified in the *working tree* — uncommitted, not in these ten.) |
| Auth rules | **Yes** — `e87e4ff` added a recovery flow and modified `supabase-middleware.ts`. New surface, not a change to existing session rules. |
| Trip-status transitions | **No.** `trip-status.ts` untouched. |
| Database migrations | **No.** None added. |
| Dependencies | **No.** No `package.json` or lockfile change. |

---

## Step 2 — production

**Deployed to Vercel.** Evidence in config, not commit messages: `apps/web/.vercel/project.json` exists and contains a project link — `projectName: "obsidian-mvp"`, with a project id and org id. There is no `vercel.json`, `Dockerfile`, `netlify.toml` or `fly.toml`.

**Production URL:** `https://obsidian-mvp.vercel.app`, recorded in `AI_HANDOFF.md` and `CURRENT_STATE.md`. **This is a documentation claim, not a config fact** — the URL appears in no config file, and I did not fetch it.

### Environment variables — names only

| name | required |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **build time and request time** — inlined into the client bundle and read server-side |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **build time and request time** — same |
| `NEXT_PUBLIC_SITE_URL` | **build time and request time** — read in `forgot-password/actions.ts`; `recovery.ts:31` throws if absent in production |
| `ANTHROPIC_API_KEY` | **request time only** — `lib/ai/ask.ts:15`, `lib/ai/parse-trip.ts:102` |
| `ELEVENLABS_API_KEY` | **request time only** — `lib/voice/elevenlabs.ts:42` |
| `ELEVENLABS_VOICE_ID` | **request time, optional** — `elevenlabs.ts:32` falls back to a default voice id |
| `SUPABASE_SERVICE_ROLE_KEY` | **declared in `.env.local.example` but referenced by no code** except a test's banned-name list |
| `NODE_ENV` | request time |

No value was printed, logged or echoed.

### Client/server boundary

Every provider key is read only in server modules. The `NEXT_PUBLIC_` set is Supabase URL, Supabase anon key, and site URL — the anon key is public by design and RLS-scoped.

The enforcing test is **`lib/voice/assistant.test.ts`, suite "no provider secret can reach the browser"** (~line 234), which walks `src/`, collects files whose first directive is `"use client"`, and fails if any names `ELEVENLABS_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY`, calls a provider host directly, or introduces a `NEXT_PUBLIC_` name matching `KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL`. It includes a non-vacuity assertion that it found client files to scan.

**I did not execute it.** Its current pass/fail status is unknown to me. `assistant.test.ts` is modified in the working tree by the other agent.

### What "production auth configuration repair" repaired

`2f7c22b` changes **only prose** in `AI_HANDOFF.md` and `CURRENT_STATE.md`. Per that prose, two things were wrong **in Vercel's environment**, not in code: `NEXT_PUBLIC_SUPABASE_ANON_KEY` was missing, and the Supabase project URL was **stale and non-resolving** — pointing at an obsolete project. Both were fixed by editing Vercel env vars. **No code change was involved, so I cannot verify this from the repository.**

### Password recovery, end to end

`forgot-password/page.tsx` → `forgot-password/actions.ts` calls Supabase's reset-password-for-email with a redirect built by `lib/auth/recovery.ts`, which **refuses to fall back to a guessed origin in production** (`throw new Error("NEXT_PUBLIC_SITE_URL is not configured.")`). The emailed link lands on `app/auth/callback/route.ts`, which exchanges the code for a session (SSR/PKCE), then `reset-password/page.tsx` → `reset-password/actions.ts` sets the new password.

**Protections observed:** the redirect target is server-configured and cannot be supplied by the caller; the callback is a server route; `supabase-middleware.ts` was modified to let the recovery path through session enforcement. **What I did not find: any rate limit on the forgot-password action.** The `voiceRateLimiter` guards only the two voice routes. Whatever abuse protection exists for password-reset email is Supabase's own, not this application's.

---

## Step 3 — voice, as built

### Capture

Opened **only** by `startListening()` in `obsidian-intelligence.tsx:385`, via `requestMicrophone(userGesture(), …)` — the `UserGesture` token cannot be minted outside an event handler. Format is chosen by `createBrowserRecorder` in `browser-audio.ts`, preferring `audio/webm;codecs=opus`, falling back through `audio/webm`, `audio/mp4`, `audio/ogg`. A hard cap `MAX_RECORDING_MS = 30_000` stops it.

Release runs through **one** function, `releaseMic()` (line 118), which clears the level interval and the recording timer, calls `session.abandon()`, and aborts any in-flight transcription. It is invoked from `send()` (line 156) on **every** state transition where `shouldReleaseMicrophone(next)` is true — that is every orb state except `listening`.

| terminal state | released? |
|---|---|
| explicit stop | **yes** |
| success | **yes** (via state change) |
| error | **yes** |
| permission denial | **yes** — never opened |
| offline | **yes** — `offline` listener → `went_offline` |
| sign-out | **yes** — `SIGN_OUT_EVENT` listener |
| unmount | **yes** — effect cleanup calls `releaseMic()` |
| 30-second cap | **yes** |
| **tab hidden / backgrounded** | **NO** |
| **page navigation (`pagehide`/`beforeunload`)** | **NO** |

A tree-wide search for `visibilitychange`, `document.hidden`, `pagehide` and `beforeunload` returns hits **only** in `command-center-scene.tsx:138` and `eclipse-iris-canvas.tsx:204` — both pausing *animation*, neither touching the microphone. **Backgrounding the tab mid-recording leaves the stream open**, bounded only by the 30-second cap. In-app navigation unmounts the component and is covered; a full page unload is not explicitly handled, though the browser tears the stream down anyway.

### Transcription

Provider **ElevenLabs Scribe**, via `POST /api/voice/transcribe`. Validation, in order: authenticated user (401) → per-user rate limit (429 + `Retry-After`) → `content-length` vs `MAX_VOICE_MULTIPART_BYTES` (413) → blob present and non-empty (400) → `blob.size` vs `MAX_VOICE_AUDIO_BYTES` (413) → MIME in `SUPPORTED_VOICE_AUDIO_TYPES` (415). Provider errors are logged by `error.name` only and returned as a generic 502 — **no stack or provider detail reaches the client.**

**No automatic retry exists.** `transcribe-client.ts` makes exactly one `fetch` and returns `failed` on rejection. The rule is written as executable code: `mayRetryAutomatically()` in `speech-outcome.ts` returns `false`, and `transcribe()` throws if it ever returns true.

### Rate limiting

`limits.ts` bounds **bytes and characters**, not cost: audio ≤ 8 MiB, multipart ≤ 8 MiB + 64 KiB, TTS text ≤ 2,000 characters, provider timeout 25 s.

`rate-limit.ts` bounds **requests**: `LocalVoiceRateLimiter`, default **20 requests per 60 s**, keyed `transcribe:${user.id}` — **per user, per process.** On breach it returns `allowed: false` and the route responds **429 with `Retry-After`**. It prunes expired entries every 100 checks and caps at 5,000 entries; at capacity, *new* keys are rejected outright.

**Two honest limits.** It is in-memory and per-instance — the file says so: *"Replace with a durable shared adapter in multi-instance production."* On Vercel's serverless model each instance holds its own counter, so the effective limit is 20 × instances. And **nothing bounds spend**: 20 requests/minute of 8 MiB audio is a large provider bill, and there is no per-org or global ceiling.

### Speech output

Triggered from `obsidian-intelligence.tsx` via `createDefaultTts()` → `POST /api/voice/speak` → ElevenLabs TTS (`eleven_multilingual_v2`, mp3 44.1 kHz/128 kbps). There is also a startup chime synthesised locally with `OscillatorNode` — **that one costs nothing and calls no provider.**

**Output is not cached.** The speak route sets `cache-control: no-store`, and no cache layer exists in `tts.ts`. Cost is one paid call per spoken response.

**The two loose MP3s do not indicate a caching path.** No code writes audio to disk anywhere in `src` — a scan for `writeFile`, `writeFileSync`, `createWriteStream`, `appendFile`, `fs.write`, `os.tmpdir` and `node:fs` finds nothing outside tests. Both files carry ID3v2.4 tags with encoder `Lavf60.16.101` (libavformat), which the browser's `MediaRecorder` never produces. Their names — `charles-voice-test`, `charles-money-test` — match the TTS-failure string *"The Charles voice is temporarily unavailable"* at `obsidian-intelligence.tsx:225` and `:236`, and `charles-money-test.mp3` appeared alongside uncommitted edits to `money.ts` and a new `money.test.ts`. **Manual testing of spoken money formatting.** That is an inference from metadata and timing, not an observation of the act.

### Transcript handling — the operator does NOT press send

`stopListening()` completes and, at line 371–372:

```ts
send({ type: "transcript_ready", transcript: transcription.text });
await run(transcription.text, "voice");
```

**The transcript auto-submits.** There is no review step and no send control on the voice path.

**Can a transcript reach a write, a send, or an approval?** A transcript reaches `submitTranscript`, which can return a **proposal** — but never an execution. `approveProposal` is called only from `approve()` (line 445), reached only through `<ProposalCard onApprove={approve}>` (line 620), which is a button. Approval-shaped speech is caught upstream: `classifyIntent` returns `bare_approval` for "yes", "do it", "confirm", "approve", "go ahead", "send it" and others, and the orchestrator declines with an explanation.

Enforcing test: **`lib/voice/assistant.test.ts`, "refuses approval-shaped speech instead of acting on it"** (line 142). There is no message-sending capability in the application at all, so "send" is unreachable by construction.

### Visible operator states

All read from code. **I rendered none of them.**

| state | implemented? |
|---|---|
| unsupported browser | **yes** — `mic-permission.ts` returns `unsupported / no_api` with copy |
| insecure context | **yes** — checked *before* touching the API; own copy and `retryable: false` |
| permission prompt | **partially** — `requesting_permission` exists in the orb machine with copy "Waiting for microphone", but I did not confirm the new canvas orb renders a distinct treatment for it |
| permission denied | **yes** — distinguished from `dismissed`; `retryable: false` because re-asking cannot help |
| idle | **yes** |
| listening | **yes** |
| processing | **yes** — `transcribing` and `thinking` |
| error | **yes** |
| offline | **yes** — real `online`/`offline` listeners |

### Does anything display "Listening" when the microphone is not open?

**Not that I can find, and the risk is now real rather than theoretical.** Three sources of the word exist: `orb.ts:295` (`"Listening…"`), `iris-visualizer-state.ts:31` (`"Listening"`), and `mic-permission.ts:137` (`"Listening."` as permission copy). All are driven by the `listening` orb state, which is entered only after a granted stream.

**But the Gate-1 guarantee is gone.** Phase 2 asserted the voice states were *unreachable from the dashboard* and tested it by proving the component dispatched none of the events leading to them. `751835d` deliberately wired capture in, so `listening` is now reachable — correctly, since a microphone really does open. What I cannot verify without running it: whether the label clears at exactly the moment `releaseMic()` fires in the **tab-hidden** case, which is the one path that does not release. If a stream is left open while hidden, the orb is not lying; if the state changed but the stream did not, the display is right and the hardware is wrong. **Uncertain — I would need to render it and background the tab.**

---

## Step 4 — the three open defects

### 1. Amber treatment vs "Ready" caption — **STILL PRESENT**

Two separate computations feed the same visual moment:

```
line 471:  const copy = orbCopy(state);                                   // 12-state orb machine
line 489:  const visual = deriveIrisVisualState({ capability, phase, needsAttention });
line 586:  visual={visual}        → the orb's colour
line 597:  {copy.label}           → the caption
```

`needsAttention` reaches **only** `visual`. When the orb is `idle` and `actionItems.length > 0`, `copy.label` is **"Ready"** while the treatment is **amber**. The caption is not derived from the same value as the treatment.

### 2. Atmosphere rendering flat — **SUPERSEDED, and now duplicated**

`.atmos` and `.horizon` still exist in `skyline-shell.module.css` (lines 24–72), and `SkylineAtmosphere()` is still **exported** from `skyline-shell.tsx:21` — but **nothing imports or renders it**. A tree-wide search finds the definition and no call site.

`page.tsx` now wraps everything in `<CommandCenterScene>`, which paints its own layered background: `sky`, `horizonGlow`, `rainFar`, `rainNear`, `reflectionZone`, `routeGlow`, `attentionGlow`, `focusGlow`, `contentVeil`, `stormSignal`, plus SVG skyline groups.

So the original defect is moot — but it left **dead code**: an exported component and ~50 lines of CSS that render nowhere. I did not remove them.

### 3. CSS grid area named `ride` — **STILL PRESENT, and expanded**

`skyline-shell.module.css` line 219 `"ride"`, line 229 `.areaRide { grid-area: ride; min-width: 0; }`, line 257 `"intelligence ride attention"`, line 272 a second `.areaRide` rule in a media query. `page.tsx` now imports `SkylineRideArea` alongside `SkylineRouteArea`, `SkylineFlowArea`, `SkylinePulseArea` and others — the rides vocabulary is now part of the layout API, not just one class name.

---

## Step 5 — health and exposure

### Tests

**38 test files, 633 `it()`/`test()` blocks.** Counted by reading the files. **I did not execute them.** I do not know the current pass rate, and four test files are modified in the working tree by the other agent while I write this.

### Untracked files that are real source

| file | bytes | lost forever if the disk failed? |
|---|---|---|
| `apps/web/src/lib/voice/limits.ts` | 721 | **Yes** — no copy anywhere |
| `apps/web/src/lib/voice/rate-limit.ts` | 2,119 | **Yes** — the only rate limiter |
| `apps/web/src/lib/voice/tts-cleanup.test.ts` | 5,069 | **Yes** |
| `apps/web/src/lib/voice/voice-security.test.ts` | 2,404 | **Yes** |
| `apps/web/src/lib/money.test.ts` | 801 | **Yes** |
| `OBSIDIAN_CORE_AUDIT.md` | 25,660 | Yes, but reproducible |

**Critically, `limits.ts` and `rate-limit.ts` are imported by `app/api/voice/transcribe/route.ts`, which is a tracked, modified file.** The committed tree does not contain them. **A fresh clone of `master` would not build.**

Not source: `desktop-command-target.png` (1,248,584 B) and `gotham-signal-reference.png` (603,500 B) — design references; and the two MP3s, now ignored.

### Dependencies added in the last ten commits

**None.** No commit touched `package.json` or any lockfile.

### Migrations

**None added.** The set remains `0001`–`0005`. Applied: `0001`, `0002`, `0003`, `0005`. **Unapplied: `0004_drop_redundant_trip_note.sql`** — hardened earlier to check `to_regclass` and `information_schema.columns` before acting, issuing its guard through `execute` so it cannot raise 42703 on a schema where the column is already gone. Every applied migration uses `if not exists` / `drop … if exists` / guarded `do $$` blocks and is safe to run twice and safe to run late. `0005` additionally carries a reconciliation block that corrects an `ON DELETE CASCADE` to `RESTRICT` if an older draft was applied.

---

## Step 6 — say it straight

**What this application does today.** It is a single-tenant business operating system for a black-car operator, deployed to Vercel at `obsidian-mvp.vercel.app`. It records rides, customers and expenses; computes month-to-date revenue, expenses, estimated profit and margin from stored data; shows a Command Center with a next-ride card, a timeline, a metrics panel and a prioritised attention list; answers questions through seven schema-typed, RLS-scoped, read-only AI tools; turns free text into ride proposals that require a button press to execute; and writes every approved action to an append-only `action_log`. It now also listens: a tap opens the microphone, audio goes to a rate-limited server route, ElevenLabs returns a transcript, and the transcript is submitted automatically.

**Genuinely finished, and verified.** The approval path — proposal, on-screen approval, execution, logged outcome — was watched end to end on 2026-07-30 and confirmed by an independent number: recorded expenses moved $728.50 → $758.50. The business-day rollover is verified against a real log row. Money is integer cents with one conversion boundary. Org scoping and the no-client-org-id rule survived a full read of every query.

**Half-built.** Rate limiting is per-process and per-user, bounds requests but not spend, and says so in its own comment. Password recovery has no application-level throttle. The microphone is not released when the tab is hidden. `SkylineAtmosphere` and ~50 lines of CSS render nowhere. Two computations decide one orb moment, so the caption can read "Ready" while the treatment is amber.

**Claimed finished but unverified — the important list.** I have not executed a single test in this task. I have not rendered any screen. I have never seen the orb, the scene, the rain, the amber state, or any voice state — the dashboard is behind auth and I do not enter passwords. The production URL is a claim in a markdown file, not a config fact; I did not fetch it. The auth repair happened in Vercel's environment and is invisible to this repository. Audio → text remains the one hop no test on this machine can prove, because the microphone here records silence.

**The most dangerous fact.** `limits.ts` and `rate-limit.ts` are untracked but imported by a tracked route. `master` does not build. That is not a design opinion — it is a missing file, and it exists on one disk.

**Where I am uncertain, and what would settle it:** run `npx vitest run` for a real pass count; render the dashboard signed in and background the tab to see whether the stream closes; and `curl -I` the production URL to confirm the deployment is live rather than documented.

---

## Git state at the end

```
branch: master
HEAD:   026c76a feat: implement cinematic command center identity
```

```
 M .gitignore                                    ← this task, Step 0
 M apps/web/.env.local.example
 M apps/web/src/app/api/voice/speak/route.ts
 M apps/web/src/app/api/voice/transcribe/route.ts
 M apps/web/src/app/obsidian/page.tsx
 M apps/web/src/app/page.tsx
 M apps/web/src/components/command/action-required.tsx
 M apps/web/src/components/command/command-center-identity.test.ts
 M apps/web/src/components/command/command-center-scene.module.css
 M apps/web/src/components/command/command-center-scene.test.ts
 M apps/web/src/components/command/command-center-scene.tsx
 M apps/web/src/components/command/eclipse-iris-canvas.test.ts
 M apps/web/src/components/command/eclipse-iris-canvas.tsx
 M apps/web/src/components/command/eclipse-iris.module.css
 M apps/web/src/components/command/obsidian-intelligence.module.css
 M apps/web/src/components/command/obsidian-intelligence.tsx
 M apps/web/src/lib/money.ts
 M apps/web/src/lib/voice/assistant.test.ts
 M apps/web/src/lib/voice/elevenlabs.ts
 M apps/web/src/lib/voice/transcribe-client.ts
 M apps/web/src/lib/voice/tts.ts
?? OBSIDIAN_CORE_AUDIT.md
?? OBSIDIAN_STATE_2026-08-04.md                  ← this report
?? apps/web/src/lib/money.test.ts
?? apps/web/src/lib/voice/limits.ts
?? apps/web/src/lib/voice/rate-limit.ts
?? apps/web/src/lib/voice/tts-cleanup.test.ts
?? apps/web/src/lib/voice/voice-security.test.ts
?? desktop-command-target.png
?? gotham-signal-reference.png
```

The two MP3s are absent from this list because they are now ignored. Nothing was committed.
