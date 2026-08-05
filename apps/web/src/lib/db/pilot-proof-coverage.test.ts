import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "..", "..");
const proof = readFileSync(
  join(process.cwd(), "scripts", "rls-cross-tenant-proof.mjs"),
  "utf8",
);
const lifecycle = readFileSync(
  join(ROOT, "supabase", "migrations", "0006_pilot_lifecycle.sql"),
  "utf8",
);

describe("live pilot and business-profile proof coverage", () => {
  it("tests cross-tenant business_profile reads, updates, and deletes as user A", () => {
    const assertions = proof.slice(proof.indexOf("const ownProfile"));
    expect(assertions).toContain('clientA\n    .from("business_profile")');
    expect(assertions).toContain("updateOtherProfile");
    expect(assertions).toContain("deleteOtherProfile");
    expect(assertions).toContain("RESULT.business_profile");
  });

  it("uses service role only for fixture activation, never a tenant assertion", () => {
    expect(proof).toContain('admin.rpc("activate_pilot"');
    expect(proof).not.toContain('clientA.rpc("activate_pilot"');
  });

  it("proves activation idempotency and the migration preserves both dates", () => {
    expect(proof).toContain("firstWindow.pilot_started_at !== secondWindow.pilot_started_at");
    expect(proof).toContain("firstWindow.pilot_ends_at !== secondWindow.pilot_ends_at");
    expect(lifecycle).toContain("pilot_started_at = coalesce(pilot_started_at, now())");
    expect(lifecycle).toContain("pilot_ends_at    = coalesce(pilot_ends_at, now() + days * interval '1 day')");
  });
});
