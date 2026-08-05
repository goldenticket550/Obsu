import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "..", "..");
const migration = readFileSync(
  join(ROOT, "supabase", "migrations", "0006_pilot_lifecycle.sql"),
  "utf8",
);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return entry.isFile() && /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

describe("platform administration is not tenant membership", () => {
  it("denies pilot activation and extension to authenticated tenant users", () => {
    expect(migration).toContain(
      "revoke execute on function public.activate_pilot(uuid, int) from anon, authenticated",
    );
    expect(migration).toContain(
      "revoke execute on function public.extend_pilot(uuid, int)   from anon, authenticated",
    );
  });

  it("exposes no tenant application route that activates or extends a pilot", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(join(process.cwd(), "src"))) {
      if (/\.test\.tsx?$/.test(file)) continue;
      const source = readFileSync(file, "utf8");
      if (/activate_pilot|extend_pilot/.test(source)) offenders.push(file);
    }
    expect(offenders).toEqual([]);
  });

  it("keeps the service-role credential out of production application source", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(join(process.cwd(), "src"))) {
      if (/\.test\.tsx?$/.test(file)) continue;
      if (readFileSync(file, "utf8").includes("SUPABASE_SERVICE_ROLE_KEY")) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});
