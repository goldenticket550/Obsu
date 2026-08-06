import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const read = (...parts: string[]) => readFileSync(join(SRC, ...parts), "utf8");

describe("Beauty data-honesty boundaries", () => {
  it("selects owner_name and keeps the stored status enum exact", () => {
    const db = read("lib", "db", "beauty", "index.ts");
    const types = read("lib", "types", "beauty.ts");
    expect(db).toContain('select("display_name,owner_name,timezone,primary_color,secondary_color,settings")');
    expect(types).toContain('"booked" | "completed" | "canceled" | "no_show"');
    expect(types).not.toContain('"confirmed"');
    expect(types).not.toContain('"in_progress"');
  });
  it("derives every Home metric from fetched records and contains no mock figures", () => {
    const home = read("app", "beauty", "page.tsx");
    expect(home).toContain("beautyDayRevenueCents(appointments");
    expect(home).toContain("beautyPreviousDayRevenueCents(appointments");
    expect(home).toContain("todaysRemainingAppointments(appointments");
    expect(home).toContain("nextAppointment?.client?.name");
    expect(home).toContain("beautyGreeting(profile.owner_name");
    expect(home).not.toMatch(/\$1,?245|18%|Good (?:morning|afternoon|evening), Iris/);
  });
  it("keeps Beauty cream-card styles local and shared command styles clean", () => {
    const home = read("app", "beauty", "page.tsx");
    const shared = read("components", "command", "obsidian-intelligence.module.css");
    expect(home).toContain('from "./beauty-home.module.css"');
    expect(shared).not.toContain("beauty-cream");
    expect(shared).not.toContain("todayOverview");
  });
  it("renders services as code-native cards without image assumptions", () => {
    const services = read("app", "beauty", "services", "page.tsx");
    expect(services).toContain('from "./services.module.css"');
    expect(services).not.toMatch(/<img|<Image|image_url|image column/i);
  });
  it("uses 44px minimum targets for Beauty controls", () => {
    const ui = read("components", "beauty", "beauty-ui.tsx");
    const homeStyles = read("app", "beauty", "beauty-home.module.css");
    const serviceStyles = read("app", "beauty", "services", "services.module.css");
    expect(ui).toContain("min-h-[44px]");
    expect(homeStyles).toContain("min-height: 44px");
    expect(serviceStyles).toContain("min-height: 132px");
  });
});
