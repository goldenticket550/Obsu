import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "..", "..");
const up = readFileSync(join(root, "supabase", "migrations", "0010_core_read_layer.sql"), "utf8");
const down = readFileSync(join(root, "supabase", "migrations", "0010_core_read_layer_down.sql"), "utf8");

describe("0010 Core read layer", () => {
  it("creates an empty, policy-free platform-admin boundary", () => {
    expect(up).toContain("create table if not exists public.platform_admins");
    expect(up).toContain("alter table public.platform_admins enable row level security");
    expect(up).toContain("revoke all on table public.platform_admins from public, anon, authenticated");
    expect(up).not.toMatch(/insert into public\.platform_admins/i);
    expect(up).not.toMatch(/create policy .*platform_admins/i);
    expect(up).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
  });

  it("locks every SECURITY DEFINER function and fails non-admins closed", () => {
    expect(up.match(/security definer/g)).toHaveLength(5);
    expect(up.match(/set search_path = pg_catalog, public/g)).toHaveLength(5);
    expect(up.match(/errcode = '42501'/g)).toHaveLength(6);
    for (const name of [
      "core_portfolio_summary",
      "core_open_feedback",
      "core_activity_counts",
      "core_recent_notable_activity",
    ]) {
      const start = up.indexOf(`create or replace function public.${name}`);
      const next = up.indexOf("create or replace function", start + 1);
      const body = up.slice(start, next === -1 ? undefined : next);
      expect(body).toContain("public.is_platform_admin(auth.uid())");
      expect(body).toContain("raise exception 'insufficient privilege'");
    }
  });

  it("returns no submitter identity, user identity, attachment, or metadata payload", () => {
    const returnedSql = up.slice(up.indexOf("create or replace function public.core_portfolio_summary"));
    expect(returnedSql).not.toMatch(/submitted_by_user_id|attachment_reference|ae\.user_id|ae\.metadata/);
  });

  it("drops dependent functions before the predicate and table", () => {
    const coreDrop = down.indexOf("drop function if exists public.core_recent_notable_activity");
    const predicateDrop = down.indexOf("drop function if exists public.is_platform_admin");
    const tableDrop = down.indexOf("drop table if exists public.platform_admins");
    expect(coreDrop).toBeGreaterThanOrEqual(0);
    expect(coreDrop).toBeLessThan(predicateDrop);
    expect(predicateDrop).toBeLessThan(tableDrop);
  });
});
