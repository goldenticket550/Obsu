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

  it("derives every Home metric and schedule row from fetched records", () => {
    const home = read("app", "beauty", "page.tsx");
    expect(home).toContain("beautyDayRevenueCents(appointments");
    expect(home).toContain("beautyPreviousDayRevenueCents(appointments");
    expect(home).toContain("todaysRemainingAppointments(appointments");
    expect(home).toContain("nextAppointment?.client?.name");
    expect(home).toContain("beautyGreeting(profile.owner_name");
    expect(home).toContain("remaining.map((appointment)");
    expect(home).toContain('href="/beauty/appointments/new"');
    expect(home).toContain('href="/beauty/clients/new"');
    expect(home).not.toMatch(/\$1,?245|18%|Good (?:morning|afternoon|evening), Iris/);
  });

  it("keeps the cream-card system Beauty-scoped and shared command styles clean", () => {
    const sharedBeauty = read("components", "beauty", "beauty-ui.module.css");
    const layout = read("app", "beauty", "beauty-layout.module.css");
    const sharedCommand = read("components", "command", "obsidian-intelligence.module.css");
    expect(sharedBeauty).toContain("background: #f7efe3");
    expect(layout).toContain(".scope");
    expect(sharedCommand).not.toContain("beauty-cream");
    expect(sharedCommand).not.toContain("todayOverview");
  });

  it("renders services through a code-native local filter without image assumptions", () => {
    const page = read("app", "beauty", "services", "page.tsx");
    const menu = read("components", "beauty", "service-menu.tsx");
    expect(page).toContain("<ServiceMenu services={services}");
    expect(menu).toContain("filterServicesByCategory(services, activeFilter)");
    expect(menu).not.toMatch(/<img|<Image|image_url|image column/i);
  });

  it("keeps the approved mobile presentation wired to existing business helpers", () => {
    const appointments = read("app", "beauty", "appointments", "page.tsx");
    const clients = read("app", "beauty", "clients", "page.tsx");
    expect(appointments).toContain("appointmentStatusLabel(appointment, now)");
    expect(appointments).toContain("appointment.price_cents");
    expect(appointments).toContain("appointment.ends_at");
    expect(clients).toContain("fillsDueClients(clients, appointments");
    expect(clients).toContain("due.map((item, index)");
    expect(clients).toContain("isMissingAddOn(item.lastAppointment)");
    expect(clients).toContain("<ReminderDrafts rows={[fillDraft]}");
    expect(clients).not.toContain("Open ?");
  });

  it("uses 44px minimum targets and reduced-motion fallbacks for Beauty controls", () => {
    const sharedStyles = read("components", "beauty", "beauty-ui.module.css");
    const homeStyles = read("app", "beauty", "beauty-home.module.css");
    const serviceStyles = read("app", "beauty", "services", "services.module.css");
    expect(sharedStyles).toContain("min-height: 44px");
    expect(sharedStyles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(homeStyles).toContain("min-height: 44px");
    expect(serviceStyles).toContain("min-height: 132px");
    expect(serviceStyles).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
