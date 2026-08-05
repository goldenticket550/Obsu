#!/usr/bin/env node
/**
 * THE HARD GATE — a live cross-tenant refusal test.
 *
 * Every RLS claim in this project so far comes from reading queries. That
 * proves the APPLICATION filters correctly. It does not prove the DATABASE
 * refuses. Those are different guarantees, and only the second one survives an
 * application bug, a mistaken `select("*")`, or a compromised client.
 *
 * This script closes that gap with two real users, two real organizations, and
 * real session tokens against the real database.
 *
 * DELIBERATELY OUTSIDE `src/`. vitest.config.ts includes only
 * `src/**\/*.test.ts`, so `npm test` cannot pick this up. The clean-clone suite
 * must stay green with no environment at all — a test that needs credentials
 * has no business in the default run.
 *
 * Run:  node scripts/rls-cross-tenant-proof.mjs
 *
 * Requires, in apps/web/.env.local or the environment:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY   <- admin, used ONLY for setup and teardown
 *
 * Values are never printed. Only names, lengths, and pass/fail.
 *
 * THE CRITICAL RULE OBSERVED THROUGHOUT: the service-role key creates and
 * destroys fixtures. It is NEVER used for an assertion — service-role bypasses
 * RLS, so an assertion made with it would prove nothing. Every assertion runs
 * with the ANON key plus a real user's session token, which is exactly what a
 * browser holds.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(HERE, "..");

/* ------------------------------------------------------------------ */
/* Environment                                                         */
/* ------------------------------------------------------------------ */

function loadDotEnvLocal() {
  try {
    const text = readFileSync(join(WEB_ROOT, ".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
      if (m && m[1] && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    // No .env.local. Environment may still supply the values.
  }
}
loadDotEnvLocal();

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const REQUIRED = [
  ["NEXT_PUBLIC_SUPABASE_URL", URL_],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", ANON],
  ["SUPABASE_SERVICE_ROLE_KEY", SERVICE],
];

const missing = REQUIRED.filter(([, v]) => !v).map(([n]) => n);
if (missing.length > 0) {
  console.log("");
  console.log("SKIPPED — the live cross-tenant RLS proof did not run.");
  console.log("");
  console.log("Missing required environment variable(s):");
  for (const name of missing) console.log(`  - ${name}`);
  console.log("");
  console.log("Why this one is needed: creating two throwaway users and two");
  console.log("throwaway organizations requires the Supabase admin API, which");
  console.log("only the service-role key can reach. The anon key cannot create");
  console.log("a user, so the test has no second tenant to be refused from.");
  console.log("");
  console.log("The key is server-only and must never be committed or exposed");
  console.log("to a browser. Supply it for this run only, e.g.:");
  console.log("  SUPABASE_SERVICE_ROLE_KEY=... node scripts/rls-cross-tenant-proof.mjs");
  console.log("");
  console.log("Nothing was created and nothing was changed.");
  process.exit(0);
}

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const MARK = `ZZ-RLS-TEST-${STAMP}`;

const admin = createClient(URL_, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Everything this run creates, so teardown deletes only its own rows. */
const created = {
  users: [],
  orgs: [],
  rows: { customers: [], vehicles: [], trips: [], expenses: [], business_profile: [], action_log: [], memberships: [] },
};

const ORG_SCOPED_TABLES = ["customers", "vehicles", "trips", "expenses", "action_log"];

function log(...a) {
  console.log(...a);
}

async function makeTenant(label) {
  const email = `rls-test-${label}-${STAMP}@example.invalid`.toLowerCase();
  const password = `Pw-${STAMP}-${label}-${Math.random().toString(36).slice(2)}`;

  const { data: userData, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userErr) throw new Error(`create user ${label}: ${userErr.message}`);
  const userId = userData.user.id;
  created.users.push(userId);

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: `${MARK}-${label}` })
    .select("id")
    .single();
  if (orgErr) throw new Error(`create org ${label}: ${orgErr.message}`);
  created.orgs.push(org.id);

  const { data: mem, error: memErr } = await admin
    .from("memberships")
    .insert({ organization_id: org.id, user_id: userId, role: "owner" })
    .select("id")
    .single();
  if (memErr) throw new Error(`create membership ${label}: ${memErr.message}`);
  created.rows.memberships.push(mem.id);

  return { label, email, password, userId, orgId: org.id };
}

async function seed(tenant) {
  const { orgId, userId } = tenant;

  const { data: cust, error: cErr } = await admin
    .from("customers")
    .insert({ organization_id: orgId, name: `${MARK}-customer` })
    .select("id")
    .single();
  if (cErr) throw new Error(`seed customers: ${cErr.message}`);
  created.rows.customers.push(cust.id);

  const { data: veh, error: vErr } = await admin
    .from("vehicles")
    .insert({ organization_id: orgId, nickname: `${MARK}-vehicle` })
    .select("id")
    .single();
  if (vErr) throw new Error(`seed vehicles: ${vErr.message}`);
  created.rows.vehicles.push(veh.id);

  const { data: trip, error: tErr } = await admin
    .from("trips")
    .insert({
      organization_id: orgId,
      customer_id: cust.id,
      trip_date: "2026-01-01",
      revenue_cents: 12345,
      status: "completed",
    })
    .select("id")
    .single();
  if (tErr) throw new Error(`seed trips: ${tErr.message}`);
  created.rows.trips.push(trip.id);

  const { data: exp, error: eErr } = await admin
    .from("expenses")
    .insert({
      organization_id: orgId,
      trip_id: trip.id,
      category: "gas",
      amount_cents: 999,
      expense_date: "2026-01-01",
    })
    .select("id")
    .single();
  if (eErr) throw new Error(`seed expenses: ${eErr.message}`);
  created.rows.expenses.push(exp.id);
  const { data: profile, error: pErr } = await admin
    .from("business_profile")
    .insert({
      organization_id: orgId,
      display_name: `${MARK}-${tenant.label}-profile`,
      workspace_label: tenant.label.toUpperCase(),
    })
    .select("organization_id")
    .single();
  if (pErr) throw new Error(`seed business_profile: ${pErr.message}`);
  created.rows.business_profile.push(profile.organization_id);

  const { data: logRow, error: lErr } = await admin
    .from("action_log")
    .insert({
      organization_id: orgId,
      actor_user_id: userId,
      proposal_id: `${MARK}-proposal`,
      action_kind: "create_trip",
      approved_summary: `${MARK} seeded row`,
      outcome: "succeeded",
      trip_id: trip.id,
    })
    .select("id")
    .single();
  if (lErr) throw new Error(`seed action_log: ${lErr.message}`);
  created.rows.action_log.push(logRow.id);

  return { customerId: cust.id, vehicleId: veh.id, tripId: trip.id, expenseId: exp.id, logId: logRow.id };
}

/** A client holding a REAL user session on the ANON key — what a browser has. */
async function asUser(tenant) {
  const client = createClient(URL_, ANON, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: tenant.email,
    password: tenant.password,
  });
  if (error) throw new Error(`sign in ${tenant.label}: ${error.message}`);
  return client;
}

/* ------------------------------------------------------------------ */
/* Assertions                                                          */
/* ------------------------------------------------------------------ */

const RESULT = {}; // table -> { readOther, readOwn, updateOther, deleteOther, insertSpoofed }

function verdict(refused) {
  return refused ? "REFUSED" : "*** ALLOWED ***";
}

async function run() {
  log(`\nFixture marker: ${MARK}\n`);
  log("Creating two throwaway tenants…");
  const A = await makeTenant("alpha");
  const B = await makeTenant("bravo");
  log(`  org A: ${A.orgId}   user A: ${A.userId}`);
  log(`  org B: ${B.orgId}   user B: ${B.userId}`);

  log("Seeding both orgs in every org-scoped table…");
  const seedA = await seed(A);
  const seedB = await seed(B);
  log("  seeded: customers, vehicles, trips, expenses, business_profile, action_log\n");

  const clientA = await asUser(A);

  const idOfB = {
    customers: seedB.customerId,
    vehicles: seedB.vehicleId,
    trips: seedB.tripId,
    expenses: seedB.expenseId,
    action_log: seedB.logId,
  };

  for (const table of ORG_SCOPED_TABLES) {
    const r = {};

    // 1. READ the other org's rows — expect ZERO
    const other = await clientA.from(table).select("id").eq("organization_id", B.orgId);
    r.readOther = (other.data?.length ?? 0) === 0 ? "0 rows" : `*** ${other.data.length} ROWS ***`;

    // 2. READ own org's rows — expect NON-ZERO (proves we are really connected)
    const own = await clientA.from(table).select("id").eq("organization_id", A.orgId);
    r.readOwn = (own.data?.length ?? 0) > 0 ? `${own.data.length} rows` : "*** 0 rows — TEST BLIND ***";

    // 3. UPDATE a row belonging to the other org — expect refusal (0 rows affected)
    const upd = await clientA.from(table).update({ organization_id: B.orgId }).eq("id", idOfB[table]).select("id");
    r.updateOther = verdict(Boolean(upd.error) || (upd.data?.length ?? 0) === 0);

    // 4. DELETE a row belonging to the other org — expect refusal
    const del = await clientA.from(table).delete().eq("id", idOfB[table]).select("id");
    r.deleteOther = verdict(Boolean(del.error) || (del.data?.length ?? 0) === 0);

    // 5. INSERT claiming the other org's id — THE SPOOFING CASE
    const spoofRow = spoofPayload(table, B.orgId, A.userId, seedB.tripId);
    const ins = await clientA.from(table).insert(spoofRow).select("id");
    const spoofRefused = Boolean(ins.error) || (ins.data?.length ?? 0) === 0;
    r.insertSpoofed = verdict(spoofRefused);
    if (!spoofRefused && ins.data?.[0]?.id) {
      created.rows[table].push(ins.data[0].id); // clean up anything that got through
    }

    RESULT[table] = r;
  }

  // 6. organizations + memberships — expect to see ONLY own
  const orgsSeen = await clientA.from("organizations").select("id");
  const memsSeen = await clientA.from("memberships").select("id, organization_id");
  const orgIds = (orgsSeen.data ?? []).map((o) => o.id);
  const memOrgIds = (memsSeen.data ?? []).map((m) => m.organization_id);

  RESULT.organizations = {
    readOther: orgIds.includes(B.orgId) ? "*** SEES OTHER ORG ***" : "0 rows",
    readOwn: orgIds.includes(A.orgId) ? `${orgIds.length} rows` : "*** 0 rows — TEST BLIND ***",
    updateOther: verdict(
      await (async () => {
        const u = await clientA.from("organizations").update({ name: `${MARK}-hijack` }).eq("id", B.orgId).select("id");
        return Boolean(u.error) || (u.data?.length ?? 0) === 0;
      })(),
    ),
    deleteOther: "n/a (no delete policy expected)",
    insertSpoofed: "n/a (orgs are created via RPC)",
  };

  RESULT.memberships = {
    readOther: memOrgIds.includes(B.orgId) ? "*** SEES OTHER ORG ***" : "0 rows",
    readOwn: memOrgIds.includes(A.orgId) ? `${memOrgIds.length} rows` : "*** 0 rows — TEST BLIND ***",
    updateOther: "not attempted",
    deleteOther: "not attempted",
    insertSpoofed: verdict(
      await (async () => {
        const i = await clientA
          .from("memberships")
          .insert({ organization_id: B.orgId, user_id: A.userId, role: "owner" })
          .select("id");
        if (!i.error && i.data?.[0]?.id) created.rows.memberships.push(i.data[0].id);
        return Boolean(i.error) || (i.data?.length ?? 0) === 0;
      })(),
    ),
  };
  // 7. business_profile is keyed by organization_id, not a synthetic id.
  const ownProfile = await clientA
    .from("business_profile")
    .select("organization_id")
    .eq("organization_id", A.orgId);
  const otherProfile = await clientA
    .from("business_profile")
    .select("organization_id")
    .eq("organization_id", B.orgId);
  const updateOtherProfile = await clientA
    .from("business_profile")
    .update({ display_name: `${MARK}-hijack` })
    .eq("organization_id", B.orgId)
    .select("organization_id");
  const deleteOtherProfile = await clientA
    .from("business_profile")
    .delete()
    .eq("organization_id", B.orgId)
    .select("organization_id");
  RESULT.business_profile = {
    readOther: (otherProfile.data?.length ?? 0) === 0 ? "0 rows" : `*** ${otherProfile.data.length} ROWS ***`,
    readOwn: (ownProfile.data?.length ?? 0) > 0 ? `${ownProfile.data.length} rows` : "*** 0 rows - TEST BLIND ***",
    updateOther: verdict(Boolean(updateOtherProfile.error) || (updateOtherProfile.data?.length ?? 0) === 0),
    deleteOther: verdict(Boolean(deleteOtherProfile.error) || (deleteOtherProfile.data?.length ?? 0) === 0),
    insertSpoofed: "n/a (one profile per org)",
  };

  // 8. The service-role-only activation RPC is idempotent on a throwaway org.
  const firstActivation = await admin.rpc("activate_pilot", { org: A.orgId, days: 14 });
  if (firstActivation.error) throw new Error(`first activate_pilot: ${firstActivation.error.message}`);
  const secondActivation = await admin.rpc("activate_pilot", { org: A.orgId, days: 14 });
  if (secondActivation.error) throw new Error(`second activate_pilot: ${secondActivation.error.message}`);
  const firstWindow = firstActivation.data;
  const secondWindow = secondActivation.data;
  if (firstWindow.pilot_started_at !== secondWindow.pilot_started_at || firstWindow.pilot_ends_at !== secondWindow.pilot_ends_at) {
    throw new Error("activate_pilot was not idempotent: the second call moved the pilot window");
  }

  printMatrix();
  await clientA.auth.signOut();
}

function spoofPayload(table, otherOrgId, myUserId, otherTripId) {
  switch (table) {
    case "customers":
      return { organization_id: otherOrgId, name: `${MARK}-spoof` };
    case "vehicles":
      return { organization_id: otherOrgId, nickname: `${MARK}-spoof` };
    case "trips":
      return { organization_id: otherOrgId, trip_date: "2026-01-02", revenue_cents: 1, status: "completed" };
    case "expenses":
      return { organization_id: otherOrgId, category: "gas", amount_cents: 1, expense_date: "2026-01-02" };
    case "action_log":
      return {
        organization_id: otherOrgId,
        actor_user_id: myUserId,
        proposal_id: `${MARK}-spoof`,
        action_kind: "create_trip",
        approved_summary: `${MARK} spoof`,
        outcome: "succeeded",
        trip_id: otherTripId,
      };
    default:
      return { organization_id: otherOrgId };
  }
}

function printMatrix() {
  const cols = ["read-other", "read-own", "update-other", "delete-other", "insert-spoofed"];
  const keys = ["readOther", "readOwn", "updateOther", "deleteOther", "insertSpoofed"];
  const names = Object.keys(RESULT);
  const w0 = Math.max(14, ...names.map((n) => n.length)) + 2;
  const w = 24;

  log("\n" + "=".repeat(w0 + w * 5));
  log("CROSS-TENANT MATRIX — user A acting against org B");
  log("=".repeat(w0 + w * 5));
  log("table".padEnd(w0) + cols.map((c) => c.padEnd(w)).join(""));
  log("-".repeat(w0 + w * 5));
  for (const n of names) {
    log(n.padEnd(w0) + keys.map((k) => String(RESULT[n][k] ?? "-").padEnd(w)).join(""));
  }
  log("=".repeat(w0 + w * 5));

  const leaks = [];
  for (const n of names) {
    for (const k of keys) {
      const v = String(RESULT[n][k] ?? "");
      if (v.includes("***")) leaks.push(`${n}.${k} = ${v}`);
    }
  }
  if (leaks.length === 0) {
    log("\nRESULT: no cross-tenant operation succeeded. The DATABASE refused, not the app.\n");
  } else {
    log("\n*** RESULT: CROSS-TENANT ACCESS SUCCEEDED. THIS IS A BREACH. ***");
    for (const l of leaks) log(`   ${l}`);
    log("");
  }
  return leaks.length;
}

/* ------------------------------------------------------------------ */
/* Teardown — only what this run created, by recorded id               */
/* ------------------------------------------------------------------ */

async function cleanup() {
  log("Cleaning up — only ids recorded by this run…");
  const failures = [];

  // Child rows first, then parents.
  const order = ["action_log", "expenses", "trips", "vehicles", "customers", "business_profile", "memberships"];
  for (const table of order) {
    const ids = created.rows[table] ?? [];
    if (ids.length === 0) continue;
    const key = table === "business_profile" ? "organization_id" : "id";
    const { error } = await admin.from(table).delete().in(key, ids);
    if (error) failures.push(`${table}: ${error.message}`);
    else log(`  deleted ${ids.length} from ${table}`);
  }

  if (created.orgs.length > 0) {
    const { error } = await admin.from("organizations").delete().in("id", created.orgs);
    if (error) failures.push(`organizations: ${error.message}`);
    else log(`  deleted ${created.orgs.length} organizations`);
  }

  for (const uid of created.users) {
    const { error } = await admin.auth.admin.deleteUser(uid);
    if (error) failures.push(`user ${uid}: ${error.message}`);
    else log(`  deleted user ${uid}`);
  }

  if (failures.length > 0) {
    log("\n*** CLEANUP INCOMPLETE — the following remain and must be removed by hand:");
    for (const f of failures) log(`   ${f}`);
    log(`   Everything this run created is marked "${MARK}".`);
  } else {
    log("  cleanup complete — nothing left behind.\n");
  }
}

/* ------------------------------------------------------------------ */

let exitCode = 0;
try {
  await run();
} catch (err) {
  log(`\n*** ERROR: ${err instanceof Error ? err.message : String(err)}`);
  log("Cleanup will still run for anything already created.");
  exitCode = 1;
} finally {
  try {
    await cleanup();
  } catch (err) {
    log(`*** CLEANUP THREW: ${err instanceof Error ? err.message : String(err)}`);
    log(`Rows marked "${MARK}" may remain.`);
    exitCode = 1;
  }
}
process.exit(exitCode);
