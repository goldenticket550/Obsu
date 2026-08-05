import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const page = readFileSync(join(SRC, "app", "page.tsx"), "utf8");
const shell = readFileSync(join(SRC, "components", "app-shell.tsx"), "utf8");

describe("business-profile-driven command center branding", () => {
  it("loads the profile through the current membership organization", () => {
    expect(page).toContain('.from("business_profile")');
    expect(page).toContain('.eq("organization_id", membership.organization_id)');
    expect(page).toContain("resolveBusinessBranding(org?.name, profile)");
  });

  it("shows profile display, workspace, and vehicle fields without hardcoding CCG", () => {
    expect(page).toContain("branding.displayName");
    expect(page).toContain("branding.workspaceLabel");
    expect(page).toContain("branding.vehicleDescription");
    expect(page).not.toContain("COVERED BY CCG");
    expect(page).not.toContain("Chevrolet Suburban");
  });

  it("keeps OBSIDIAN RIDES as the platform identity", () => {
    expect(shell).toContain("OBSIDIAN");
    expect(shell).toContain("Rides");
  });
});
