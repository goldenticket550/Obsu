import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deriveRouteVisualState } from "./route-visual-state";

describe("route presentation is truthful by construction", () => {
  it("derives all four states without inferring missing data", () => {
    expect(deriveRouteVisualState(null, null)).toBe("empty");
    expect(deriveRouteVisualState("  ", "")).toBe("empty");
    expect(deriveRouteVisualState("JFK", null)).toBe("pickup-only");
    expect(deriveRouteVisualState(null, "Midtown")).toBe("destination-only");
    expect(deriveRouteVisualState("JFK", "Midtown")).toBe("complete");
  });

  it("offers explicit missing-detail actions and no fake map language", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "components", "command", "route-line.tsx"),
      "utf8",
    );
    expect(source).toContain("Add route details");
    expect(source).toContain("Add destination");
    expect(source).toContain("Add pickup");
    expect(source).toContain('if (state === "empty")');
    expect(source).not.toMatch(/GPS|live location|vehicle position/i);
  });
});
