import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const read = (...parts: string[]) => readFileSync(join(SRC, ...parts), "utf8");

describe("pilot lifecycle enforcement reaches every write boundary", () => {
  it("gates shared trip creation before the first insert", () => {
    const source = read("lib", "db", "trips.ts");
    expect(source.indexOf("await assertOrgWriteAllowed")).toBeLessThan(source.indexOf(".insert("));
  });

  it("gates customer, expense, and trip server actions", () => {
    const customers = read("app", "customers", "actions.ts");
    const expenses = read("app", "expenses", "actions.ts");
    const trips = read("app", "trips", "actions.ts");
    expect(customers.match(/assertOrgWriteAllowed/g)).toHaveLength(3);
    expect(expenses.match(/assertOrgWriteAllowed/g)).toHaveLength(3);
    expect(trips.match(/assertOrgWriteAllowed/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it("gates every allowlisted voice proposal write and approval", () => {
    const writes = read("lib", "db", "proposal-writes.ts");
    const assistant = read("app", "ask", "assistant-actions.ts");
    expect(writes.match(/await assertOrgWriteAllowed/g)).toHaveLength(5);
    expect(assistant).toContain("await assertOrgWriteAllowed(supabase, who.orgId)");
    expect(assistant).toContain("ORG_WRITE_BLOCKED_MESSAGE");
  });

  it("keeps the append-only action log behind the same lifecycle gate", () => {
    const source = read("lib", "db", "action-log.ts");
    expect(source.indexOf("assertOrgWriteAllowed")).toBeLessThan(source.indexOf('.from("action_log").insert'));
    expect(source).not.toContain('.from("action_log").delete');
    expect(source).not.toContain("billing_enabled");
  });
});
