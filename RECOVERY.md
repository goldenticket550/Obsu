# RECOVERY

You are probably reading this because something is broken. Follow it literally.

## What this recovers

Source code only. **It does not recover your data.** See "What a restore does NOT recover" below before you assume you are safe.

## Clone

```
git clone https://github.com/goldenticket550/Obsu.git
cd Obsu/apps/web
```

## From clone to a running app

Measured on a Windows laptop, 2026-08-04, from a cold clone. Your times will differ with network and disk.

| step | command | measured |
|---|---|---|
| 1. clone | `git clone https://github.com/goldenticket550/Obsu.git` | 1 s |
| 2. install | `npm ci` | 23 s |
| 3. typecheck | `npx tsc --noEmit` | 4 s |
| 4. tests | `npx vitest run` | 4 s — **643 passed, 38 files** |
| 5. lint | `npm run lint` | 5 s |
| 6. build | `npm run build` | 37 s — **21 routes** |
| | **total** | **74 s** |

Run `npm ci`, not `npm install` — it installs exactly what the lockfile pins.

To run it locally after that:

```
npm run dev
```

It serves on port 3000. Confirm the port is free first: `netstat -ano | findstr :3000`.

## Environment values

The app will build without them but will not function. **No value is in this repository and none ever should be.** Take every value from the Vercel project settings for `obsidian-mvp` (Settings → Environment Variables), or from the provider's own dashboard if Vercel is also gone.

Names only:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`

Put them in `apps/web/.env.local`. That file is git-ignored and must stay that way.

## What a restore does NOT recover

**The Supabase database — customers, trips, expenses, and `action_log`.** This repository contains schema migrations, not data. A restore gives you an empty application. Every ride and every dollar ever recorded lives only in Supabase, and **a separate database backup does not currently exist.**

Also not recovered: the environment values held in Vercel, and `apps/web/.env.local`.

## Migrations

`supabase/migrations/` holds `0001`–`0005`. Applied to production: `0001`, `0002`, `0003`, `0005`. **`0004` is written and not applied.** Every migration is guarded and safe to run twice and safe to run late. Apply them by pasting into the Supabase SQL Editor, in numerical order.

## The tag

**`rides-v1`** → commit `77380fd`.

Obsidian Rides in its single-tenant production state, immediately before any second-tenant work. Restore from it was verified from a clean clone of the remote on 2026-08-04: 643 of 643 tests, typecheck, lint and production build all green in 74 seconds.

```
git checkout rides-v1
```

That is the known-good point to return to.
