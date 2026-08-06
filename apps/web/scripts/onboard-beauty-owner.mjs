#!/usr/bin/env node
/**
 * Infinite Beauty Palace — safe owner onboarding.
 *
 * Links one real owner account to the existing Beauty workspace. This script
 * is intentionally separate from workspace setup and pilot activation. It:
 *   - never sets or prints a password,
 *   - never activates or extends the pilot,
 *   - never changes billing,
 *   - uses the service role only (membership INSERT is not available to users).
 *
 * Run manually from apps/web only when ready:
 *   BEAUTY_OWNER_EMAIL=owner@example.com node scripts/onboard-beauty-owner.mjs
 *
 * Optional:
 *   BEAUTY_OWNER_NAME="Owner Name"
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(HERE, "..");

function loadDotEnvLocal() {
  try {
    const text = readFileSync(join(WEB_ROOT, ".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
      if (match && match[1] && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    }
  } catch {
    /* Environment variables may still provide the values. */
  }
}
loadDotEnvLocal();

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_EMAIL = process.env.BEAUTY_OWNER_EMAIL?.trim().toLowerCase() || null;
const OWNER_NAME = process.env.BEAUTY_OWNER_NAME?.trim() || null;
const BEAUTY_SLUG = "infinite-beauty-palace";

for (const [name, value] of [
  ["NEXT_PUBLIC_SUPABASE_URL", URL_],
  ["SUPABASE_SERVICE_ROLE_KEY", SERVICE],
]) {
  if (!value) {
    console.log(`SKIPPED — missing ${name}. Nothing was changed.`);
    process.exit(0);
  }
}

if (OWNER_EMAIL && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(OWNER_EMAIL)) {
  console.log("SKIPPED - BEAUTY_OWNER_EMAIL is not a valid email address. Nothing was changed.");
  process.exit(0);
}

if (!OWNER_EMAIL) {
  console.log(
    "SKIPPED — BEAUTY_OWNER_EMAIL is required. Nothing was changed.",
  );
  process.exit(0);
}

const admin = createClient(URL_, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findAuthUserByEmail(email) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const result = await admin.auth.admin.listUsers({ page, perPage });
    if (result.error) {
      throw new Error(`find auth user: ${result.error.message}`);
    }

    const user = result.data.users.find(
      (candidate) => candidate.email?.trim().toLowerCase() === email,
    );
    if (user) return user;

    if (result.data.users.length < perPage) return null;
    page += 1;
  }
}

async function findOrCreateAuthUser(email) {
  const existing = await findAuthUserByEmail(email);
  if (existing) return { user: existing, created: false };

  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (!created.error && created.data.user) {
    return { user: created.data.user, created: true };
  }

  // A retry or concurrent run may have created the user after our lookup.
  // Resolve that race by looking up the normalized email again.
  const afterCreate = await findAuthUserByEmail(email);
  if (afterCreate) return { user: afterCreate, created: false };

  throw new Error(
    `create auth user: ${created.error?.message ?? "unknown Supabase error"}`,
  );
}

async function main() {
  const orgResult = await admin
    .from("organizations")
    .select("id")
    .eq("slug", BEAUTY_SLUG)
    .maybeSingle();

  if (orgResult.error) {
    throw new Error(`find Beauty organization: ${orgResult.error.message}`);
  }
  if (!orgResult.data) {
    throw new Error(
      `Beauty organization "${BEAUTY_SLUG}" was not found. Run scripts/setup-beauty-workspace.mjs first.`,
    );
  }
  const orgId = orgResult.data.id;

  const { user, created } = await findOrCreateAuthUser(OWNER_EMAIL);

  const membershipResult = await admin
    .from("memberships")
    .select("id, role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipResult.error) {
    throw new Error(`find owner membership: ${membershipResult.error.message}`);
  }

  if (!membershipResult.data) {
    const insertResult = await admin.from("memberships").insert({
      organization_id: orgId,
      user_id: user.id,
      role: "owner",
    });

    // 23505 is PostgreSQL unique_violation. A concurrent/idempotent run that
    // inserted the same (organization_id, user_id) pair already is success.
    if (insertResult.error?.code === "23505") {
      const roleResult = await admin.from("memberships").update({ role: "owner" }).eq("organization_id", orgId).eq("user_id", user.id);
      if (roleResult.error) throw new Error(`confirm duplicate owner membership: ${roleResult.error.message}`);
    } else if (insertResult.error) {
      throw new Error(`create owner membership: ${insertResult.error.message}`);
    }
  } else if (membershipResult.data.role !== "owner") {
    const roleResult = await admin
      .from("memberships")
      .update({ role: "owner" })
      .eq("id", membershipResult.data.id);
    if (roleResult.error) {
      throw new Error(`update owner membership: ${roleResult.error.message}`);
    }
  }

  if (OWNER_NAME) {
    const profileResult = await admin.from("business_profile").upsert(
      { organization_id: orgId, owner_name: OWNER_NAME },
      { onConflict: "organization_id" },
    );
    if (profileResult.error) {
      throw new Error(`save owner name: ${profileResult.error.message}`);
    }
  }

  console.log("Infinite Beauty Palace owner onboarding is ready.");
  console.log(`  org id:  ${orgId}`);
  console.log(`  user id: ${user.id}`);
  console.log(`  account: ${created ? "created and email-confirmed" : "already existed"}`);
  console.log("\nNext steps for the owner:");
  console.log("  1. Open the deployed Obsidian app.");
  console.log('  2. Select "Forgot password" and use her owner email.');
  console.log("  3. Follow the recovery link to set her own password.");
  console.log("  4. Sign in with that email and her new password.");
  console.log("\nThe pilot was not activated and billing was not changed.");
}

main().catch((e) => {
  console.error(
    `ERROR: ${e instanceof Error ? e.message : JSON.stringify(e)}`,
  );
  process.exitCode = 1;
});
