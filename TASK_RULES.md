# Task rules

Standing rules for every task in this repository. Task prompts do not restate these.

## Protected files

**None at present.** No file in this repository is currently frozen.

### The voice freeze ended 2026-07-29

`apps/web/src/components/obsidian-voice.tsx` and
`apps/web/src/app/api/voice/transcribe/route.ts` were held **byte-identical** from M11.1
through V2 Part 1. They carried uncommitted paused work with no second copy, so any edit
risked destroying it irrecoverably — that, and only that, is what the freeze protected.

It ended because V2 owns those files: the voice layer cannot be split into modules while the
component that fuses every concern is untouchable. Before the first edit, both files were
committed verbatim to the branch **`paused/voice-pre-v2`** (commit `6803919`), which is not
merged, not pushed, and not built on. The recovery point the freeze existed to preserve now
exists in git, so the freeze has nothing left to do.

Recorded hashes at the moment of unfreezing, matching every prior task's verification:

- `obsidian-voice.tsx` — `a887c15dfc9c1b06ab2e0fe62b6d8399b603f0f492288bccf4de537ccb2e8fd5`
- `voice/transcribe/route.ts` — `d6d7ab813fb748b91218fe7b85c67e6a2b97ca21c3017e6ac0c4de77ef420a49`

**The freeze was never violated.** Every task from V1 onward verified both hashes and reported
them unchanged. If a future reader finds those files edited after this date, this is why.

The temporary debug file-write that saved captured audio to the OS temp directory never
existed on `master` — it lived only in the uncommitted working tree, and it survives only on
`paused/voice-pre-v2`. It is a privacy defect and must not be carried forward.

## Never without explicit written approval in the task prompt

Deploy · push · publish · open a pull request · touch remote services or production data ·
create or apply a database migration · change the schema · install or upgrade a dependency ·
change a financial formula · change auth or authorization rules · change trip-status
transitions · modify `supabase/seed_dev.sql`.

## Never at all

- Hard-code a business name or hard-code pricing.
- Let the AI layer produce a business number that did not come from a schema-typed,
  org-scoped, read-only tool.
- Trust an organization id from the client.
- Auto-send any SMS or email.
- Reference, import from, or inspect the Trading Scanner codebase (ADR-007).

## Architecture

- Business logic lives in `src/lib/business/` as **pure functions with `now` injected**. No
  ambient `new Date()` or equivalent clock read in the business layer.
- Money is **integer cents** with a single conversion boundary.
- Dates and day boundaries go through `schedule.ts`. The business day rolls over at
  `BUSINESS_DAY_ROLLOVER_HOUR` in America/New_York.
- **No component formats a date inline.**
- **Two functions must never answer the same question** — derive one from the other and add
  an agreement test.
- **Every migration must be safe to run twice and safe to run late.** Migrations are applied
  by hand in the Supabase SQL Editor and there is no tracking table, so nothing knows or
  enforces what has already run — and a change may have been made manually before its file is
  ever executed. Each migration therefore asks the schema what is true right now (does the
  table exist, does the column exist, does the constraint or policy exist) and skips cleanly
  with a `raise notice` when its work is already done. It never assumes it is the first or the
  only thing to have touched that object. Where a guard must reference a column that might not
  exist, issue it through `execute` so plpgsql does not parse it on a schema where it is
  absent — an unguarded reference raises 42703 before any check can run.

## Honesty in the interface

- Absence of data is **never** displayed in a slot meant for data.
- A missing field **never** occupies a headline.
- Copy is derived from a **typed discriminated union with exhaustive handling**, so adding a
  case fails the type check until its presentation exists.

## Every task

1. Run `git status --short` first and record pre-existing changes.
2. Run the focused tests, the full suite, `tsc --noEmit`, lint, and the production build.
3. **Stop the dev server before running a build.** Building against a running server's
   `.next` directory clobbers its chunks and produces fake 500s.
4. Report exact **passed / failed / skipped** counts, and separate pre-existing failures from
   new ones.
5. Never claim a check passed unless it actually ran. If one cannot run, report the command,
   why, what you did instead, and the remaining uncertainty.
6. Existing tests may have their **expectations updated** when a rule legitimately changes —
   never deleted, never weakened. List every changed expectation with its reason.

## Commits

Local and focused, **one per task part**. Never push.

Before committing: list the files, inspect the staged diff, and confirm no unrelated hunks,
no protected file, and no migration, lockfile, seed file, or generated DB type is staged.

## Editing source

**Never use `sed`, `perl`, or regex substitution to edit TypeScript source.** Use the Edit
tool with an exact, unique string match.

Regex delimiters that appear inside the pattern — `|` in a union type, `/` in a path —
silently corrupt adjacent lines.

If a multi-file mechanical rename is genuinely needed: print the planned diff for approval
first, then run `tsc` immediately afterwards and diff the **whole file**, not just the
intended hunk.
