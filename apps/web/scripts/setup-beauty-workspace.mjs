#!/usr/bin/env node
/** Idempotent Infinite Beauty Palace workspace seed. Never creates users or activates pilots. */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = join(HERE, "..");
function loadDotEnvLocal() {
  try {
    for (const line of readFileSync(join(WEB_ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line.trim());
      if (match?.[1] && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch { /* Environment variables may still provide the values. */ }
}
loadDotEnvLocal();
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !SERVICE) { console.log("SKIPPED - missing Supabase server environment. Nothing was created."); process.exit(0); }
const admin = createClient(URL_, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });
const SLUG = "infinite-beauty-palace";
const SERVICES = [
  ["lash_set", "Bestie Deal (bottom lashes not incl.)", 130, 27000, null],
  ["lash_set", "Light Volume / Wet Set (12-15mm)", 60, 11500, 1500],
  ["lash_set", "Short Fluff (Baby Feather)", 81, 14000, null],
  ["lash_set", "Spice Gyal (17-20mm)", 90, 16000, null],
  ["lash_set", "Mega Volume", 120, 18000, 2000],
  ["lash_fill", "2-Week Fill - Short Fluff", 70, 11500, null],
  ["lash_fill", "2-Week Fill - Spice Gyal", 80, 13500, null],
  ["lash_fill", "2-Week Fill - Mega Volume", 86, 15000, null],
  ["bottom_lash", "Bottom Lashes Only", 20, 4500, null],
  ["cleansing", "Lash Bath", 30, 1500, null],
  ["removal", "Lash Removal", 30, 2500, null],
  ["brow", "Brow Lamination", 90, 6000, null],
  ["brow", "Wax & Brow Henna", 50, 4500, null],
  ["brow", "Tint Combo", 45, 4000, null],
  ["brow", "Tint Only", 20, 3000, null],
  ["brow", "Hybrid Tint", 30, 4500, null],
  ["brow", "Tweeze & Tint", 35, 3000, null],
  ["lip_filler", "Hyaluronic Needleless 1ml (Russian/Doll)", 60, 13000, null],
  ["lip_filler", "Hyaluronic Needleless 1.5 (Russian/Doll)", 45, 13000, null],
  ["lip_filler", "Hyaluronic Needleless 2.0 (fullest)", 50, 27500, null],
  ["lip_filler", "Filler Second Session (after 3-4 wks)", 30, 17500, null],
  ["lip_filler", "Filler Package (1st & 2nd session)", 45, 33000, null],
];

async function main() {
  const found = await admin.from("organizations").select("id").eq("slug", SLUG).maybeSingle();
  if (found.error) throw found.error;
  let org = found.data;
  if (!org) {
    const created = await admin.from("organizations").insert({ name: "Infinite Beauty Palace", slug: SLUG, status: "pilot", plan: "free_pilot", billing_enabled: false, vertical: "beauty" }).select("id").single();
    if (created.error) throw created.error;
    org = created.data;
  } else {
    const update = await admin.from("organizations").update({ vertical: "beauty" }).eq("id", org.id);
    if (update.error) throw update.error;
  }
  const profile = await admin.from("business_profile").upsert({ organization_id: org.id, display_name: "Infinite Beauty Palace", phone: "516-846-8444", email: "infinitebeautypalace@yahoo.com", service_area: "Bed-Stuy, Brooklyn NY", timezone: "America/New_York", primary_color: "#8A5A44", secondary_color: "#D6AD60", workspace_label: "BEAUTY", settings: { instagram: "Minks_byiris", grace_minutes: 10, late_fee_cents: 1500, cancel_after_minutes: 15, min_lead_hours: 24, cash_only: true } }, { onConflict: "organization_id" });
  if (profile.error) throw profile.error;
  for (const [sortOrder, values] of SERVICES.entries()) {
    const [category, name, durationMinutes, priceCents, depositCents] = values;
    const foundService = await admin.from("services").select("id").eq("organization_id", org.id).eq("name", name).maybeSingle();
    if (foundService.error) throw foundService.error;
    const row = { organization_id: org.id, category, name, duration_minutes: durationMinutes, price_cents: priceCents, deposit_cents: depositCents, active: true, sort_order: sortOrder };
    const result = foundService.data ? await admin.from("services").update(row).eq("id", foundService.data.id) : await admin.from("services").insert(row);
    if (result.error) throw result.error;
  }
  const existingHours = await admin.from("working_hours").select("weekday,start_time,end_time").eq("organization_id", org.id);
  if (existingHours.error) throw existingHours.error;
  for (const weekday of [2, 3, 4, 5, 6]) {
    if (existingHours.data.some((row) => row.weekday === weekday && row.start_time.startsWith("11:00") && row.end_time.startsWith("19:00"))) continue;
    const result = await admin.from("working_hours").insert({ organization_id: org.id, weekday, start_time: "11:00", end_time: "19:00" });
    if (result.error) throw result.error;
  }
  console.log(`Beauty workspace ready: ${org.id}`);
  console.log("No account was created, no pilot was activated, no billing was enabled, and no secrets were printed.");
}
function printable(error) { return error instanceof Error ? error.message : JSON.stringify(error); }
main().catch((error) => { console.error(`ERROR: ${printable(error)}`); process.exitCode = 1; });
