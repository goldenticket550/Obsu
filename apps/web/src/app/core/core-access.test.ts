import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(join(process.cwd(), "src", "app", "core", "page.tsx"), "utf8");
const readLayer = readFileSync(join(process.cwd(), "src", "lib", "db", "core-read.ts"), "utf8");
const middleware = readFileSync(join(process.cwd(), "src", "lib", "db", "supabase-middleware.ts"), "utf8");

describe("OBSIDIAN Core route access", () => {
  it("turns every missing or denied Core session into a 404", () => {
    expect(page).toContain("if (!data) notFound()");
    expect(readLayer).toContain("if (!authData.user) return null");
    expect(readLayer).toContain("if (adminError || admin !== true) return null");
    expect(middleware).toContain('if (!user && request.nextUrl.pathname === "/core") return supabaseResponse');
  });

  it("uses only the normal session client and approved read RPCs", () => {
    expect(readLayer).toContain("createSupabaseServerClient");
    expect(readLayer).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(readLayer).not.toMatch(/\.from\(|\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
    for (const rpc of [
      "is_platform_admin",
      "core_portfolio_summary",
      "core_open_feedback",
      "core_activity_counts",
      "core_recent_notable_activity",
    ]) expect(readLayer).toContain(`\"${rpc}\"`);
  });

  it("is unlisted and contains no action, voice, or AI surface", () => {
    expect(page).not.toMatch(/import .*ObsidianIntelligence|<ObsidianIntelligence|<form|<button|server action/i);
  });
});
