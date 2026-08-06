import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (...parts: string[]) => readFileSync(join(root, ...parts), "utf8");

describe("Beauty write boundaries", () => {
  it("uses atomic RPCs instead of multi-request appointment and client writes", () => {
    const source = read("src", "lib", "db", "beauty", "index.ts");
    expect(source).toContain('.rpc("save_beauty_appointment"');
    expect(source).toContain('.rpc("save_beauty_client"');
    expect(source).not.toMatch(/from\("appointments"\)\.insert/);
    expect(source).not.toMatch(/from\("appointment_services"\)\.(?:insert|delete)/);
    expect(source).not.toMatch(/from\("customers"\)\.(?:insert|update)/);
    expect(source.match(/assertOrgWriteAllowed/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it("ships guarded, authenticated transactional functions", () => {
    const migration = read("..", "..", "supabase", "migrations", "0009_beauty_atomic_writes.sql");
    expect(migration).toContain("add column if not exists category");
    expect(migration).toContain("public.save_beauty_appointment");
    expect(migration).toContain("public.save_beauty_client");
    expect(migration).toContain("auth.uid()");
    expect(migration).toContain("public.is_org_active(v_org_id)");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("to authenticated");
    expect(migration).toContain("from public, anon");
  });

  it("handles the client-details primary key explicitly in the RLS proof", () => {
    const proof = read("scripts", "rls-cross-tenant-proof.mjs");
    expect(proof).toContain('table === "beauty_client_details" ? "customer_id" : "id"');
    expect(proof).toContain("if (other.error) throw");
    expect(proof).toContain("if (own.error) throw");
    expect(proof).toContain("if (printMatrix() > 0) throw");
  });
});

describe("Beauty setup and onboarding safety", () => {
  it("does not activate pilots or create users during workspace setup", () => {
    const setup = read("scripts", "setup-beauty-workspace.mjs");
    expect(setup).not.toContain("activate_pilot");
    expect(setup).not.toContain("createUser(");
    expect(setup).toContain('billing_enabled: false');
    expect(setup).toContain('vertical: "beauty"');
  });

  it("creates owner accounts without supplying or printing a password", () => {
    const onboarding = read("scripts", "onboard-beauty-owner.mjs");
    const createCall = onboarding.slice(onboarding.indexOf("createUser({"), onboarding.indexOf("});", onboarding.indexOf("createUser({")) + 3);
    expect(createCall).toContain("email_confirm: true");
    expect(createCall).not.toContain("password");
    expect(onboarding).not.toContain("activate_pilot");
    expect(onboarding).not.toContain("SUPABASE_SERVICE_ROLE_KEY}`");
    expect(onboarding).toContain("JSON.stringify(e)");
  });
});
