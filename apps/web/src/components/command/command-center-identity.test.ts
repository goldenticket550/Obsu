import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const intelligence = readFileSync(join(SRC, "components", "command", "obsidian-intelligence.tsx"), "utf8");
const action = readFileSync(join(SRC, "components", "command", "action-required.tsx"), "utf8");
const shell = readFileSync(join(SRC, "components", "app-shell.tsx"), "utf8");
const layout = readFileSync(join(SRC, "components", "command", "skyline-shell.module.css"), "utf8");

describe("approved Command Center identity", () => {
  it("uses real section buttons with expanded state and focus targets", () => {
    for (const id of ["tonights-flow", "action-required", "business-pulse"]) {
      expect(intelligence).toContain(`aria-controls="${id}"`);
      expect(intelligence).toContain(`expandedSurface === "${id}"`);
      expect(intelligence).toContain(`scrollToSurface("${id}")`);
    }
  });

  it("collapses an empty command attention area to All systems clear", () => {
    expect(action).toContain('items.length === 0 && variant === "command"');
    expect(action).toContain("All systems clear");
    expect(action).not.toContain("mock");
  });

  it("provides compact mobile chrome, safe-area navigation, and a non-overlapping create control", () => {
    expect(shell).toContain("Open profile menu");
    expect(shell).toContain("safe-area-inset-bottom");
    expect(shell).toContain("left-1/2");
    expect(shell).toContain('active ? "block" : "hidden min-[390px]:block"');
  });

  it("uses a dedicated mobile content order and hides the decorative route below the hero", () => {
    const mobile = layout.slice(layout.indexOf(".commandLayout"), layout.indexOf("@media (min-width: 1181px)"));
    expect(mobile.indexOf('"intelligence"')).toBeLessThan(mobile.indexOf('"ride"'));
    expect(mobile.indexOf('"ride"')).toBeLessThan(mobile.indexOf('"pulse"'));
    expect(layout).toContain(".areaRoute { display: none; }");
  });
});
