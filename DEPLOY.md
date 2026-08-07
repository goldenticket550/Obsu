# OBSIDIAN — Deployment

## Current path

Phase 0 enforces manual deployments for Vercel project `obsidian-mvp`. Confirm the current Git-connection state in Vercel before relying on push behavior. Until a separately approved Git-integration change is completed, use only the explicit manual production procedure below.

## Production procedure

Deployment is a separate, explicitly approved operation and is outside Phase 0 execution.

Before a future production deployment:

1. Verify the repository remote and fetch `origin`.
2. Verify the working tree is clean.
3. Verify local `master` exactly matches `origin/master`.
4. Verify required CI checks pass for that commit.
5. From `apps/web`, preview the command and obtain explicit deployment approval.
6. Run `npx vercel --prod` only after approval, then record the deployed commit SHA and resulting URL.

Never deploy from a feature branch, stale clone, dirty tree, or unverified commit.

## Possible future Git integration

Git-connected deployment is a separate change requiring explicit approval and a rollout plan. Before enabling it, confirm the repository, root directory `apps/web`, production branch `master`, ignored build settings, environment scopes, and whether connecting the repository will immediately deploy.
