#!/usr/bin/env node
/**
 * Covered by CCG — safe workspace setup.
 *
 * Creates (idempotently) the CCG organization and its branding profile, with
 * BILLING DISABLED and the pilot NOT yet started. It deliberately does NOT:
 *   - create the friend's real user account,
 *   - add a real person's membership,
 *   - activate the pilot (that is a separate, deliberate action),
 *   - store real customer PII (placeholders only).
 *
 * Run:  node scripts/setup-ccg-workspace.mjs
 *
 * Requires (already in apps/web/.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY     <- admin, used for setup only
 *
 * The service-role key is used only to create rows the RLS policies do not
 * expose an INSERT path for. No secret value is ever printed.
 *
 * Optional preview: set CCG_PREVIEW_MEMBER_EMAIL to an EXISTING user's email to
 * attach yourself as an owner so you can view the workspace before the friend
 * is onboarded. Omit it to keep the workspace empty (nobody can read it yet).
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
      const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
      if (m && m[1] && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* env may still supply the values */
  }
}
loadDotEnvLocal();

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PREVIEW_EMAIL = process.env.CCG_PREVIEW_MEMBER_EMAIL || null;

for (const [n, v] of [
  ["NEXT_PUBLIC_SUPABASE_URL", URL_],
  ["SUPABASE_SERVICE_ROLE_KEY", SERVICE],
]) {
  if (!v) {
    console.log(`\nSKIPPED — missing ${n}. Nothing was created.`);
    process.exit(0);
  }
}

const SLUG = "covered-by-ccg";
const admin = createClient(URL_, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// CCG branding — the only "customer-specific" values, kept as data, not code.
const PROFILE = {
  display_name: "COVERED BY CCG",
  legal_name: "Covered by CCG",
  owner_name: "TBD",                 // placeholder — fill at real onboarding
  phone: null,
  email: null,
  service_area: "New York City",
  timezone: "America/New_York",
  vehicle_description: "New-model fully blacked-out Chevrolet Suburban",
  primary_color: "#E8B04B",          // warm orbital gold
  secondary_color: "#37E8FF",        // electric cyan
  workspace_label: "CCG",
  settings: { luxury: true, nightlife: true },
};

async function main() {
  // 1. Org — find by slug, else create. status='pilot', billing OFF, no dates.
  let { data: org } = await admin
    .from("organizations")
    .select("id, name, status, plan, billing_enabled, pilot_started_at, pilot_ends_at")
    .eq("slug", SLUG)
    .maybeSingle();

  if (!org) {
    const ins = await admin
      .from("organizations")
      .insert({
        name: "Covered by CCG",
        slug: SLUG,
        status: "pilot",
        plan: "free_pilot",
        billing_enabled: false,
      })
      .select("id, name, status, plan, billing_enabled, pilot_started_at, pilot_ends_at")
      .single();
    if (ins.error) throw new Error(`create org: ${ins.error.message}`);
    org = ins.data;
    console.log(`Created organization "Covered by CCG"  id=${org.id}`);
  } else {
    console.log(`Organization already exists  id=${org.id} (leaving it as-is)`);
  }

  // 2. Business profile — upsert branding (idempotent).
  const up = await admin
    .from("business_profile")
    .upsert({ organization_id: org.id, ...PROFILE }, { onConflict: "organization_id" })
    .select("organization_id")
    .single();
  if (up.error) throw new Error(`upsert business_profile: ${up.error.message}`);
  console.log("Branding profile written (blacked-out Suburban, gold/cyan, NYC).");

  // 3. Optional preview membership for an EXISTING user (no new accounts).
  if (PREVIEW_EMAIL) {
    const list = await admin.auth.admin.listUsers();
    if (list.error) throw new Error(`list users: ${list.error.message}`);
    const user = list.data.users.find(
      (u) => (u.email || "").toLowerCase() === PREVIEW_EMAIL.toLowerCase(),
    );
    if (!user) {
      console.log(`Preview user ${PREVIEW_EMAIL} not found — skipping membership.`);
    } else {
      const mem = await admin
        .from("memberships")
        .upsert(
          { organization_id: org.id, user_id: user.id, role: "owner" },
          { onConflict: "organization_id,user_id" },
        )
        .select("id")
        .single();
      if (mem.error) throw new Error(`preview membership: ${mem.error.message}`);
      console.log(`Preview owner membership added for ${PREVIEW_EMAIL}.`);
    }
  } else {
    console.log("No CCG_PREVIEW_MEMBER_EMAIL set — workspace has no members yet.");
  }

  // 4. Status readout — pilot is NOT started.
  console.log("\n--- CCG workspace ---");
  console.log(`  org id:          ${org.id}`);
  console.log(`  slug:            ${SLUG}`);
  console.log(`  status:          pilot`);
  console.log(`  plan:            free_pilot`);
  console.log(`  billing_enabled: false`);
  console.log(`  pilot started:   NO (dates unset — activation is deliberate)`);
  console.log("\nWhen you are ready to onboard the friend (Stage 9):");
  console.log("  1. Have them sign up, then add their OWNER membership to this org.");
  console.log("  2. Start the 14-day clock (service role / SQL editor):");
  console.log(`       select public.activate_pilot('${org.id}'::uuid, 14);`);
  console.log("Nothing was billed and no real customer data was stored.\n");
}

main().catch((err) => {
  console.log(`\n*** ERROR: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
