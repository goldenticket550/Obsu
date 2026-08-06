import { describe, expect, it } from "vitest";
import { previousComparableMonthRange } from "@/lib/business/date-range";
import { performanceTrend } from "./mobile-dashboard-model";

describe("mobile business metrics", () => {
  it("compares the same month span", () => {
    expect(previousComparableMonthRange(new Date("2026-08-05T22:00:00Z"))).toEqual({ start: "2026-07-01", end: "2026-07-05" });
  });
  it("reports positive, flat, and negative trends honestly", () => {
    expect(performanceTrend(200, 100).direction).toBe("up");
    expect(performanceTrend(100, 100).direction).toBe("flat");
    expect(performanceTrend(50, 100).direction).toBe("down");
    expect(performanceTrend(0, 0).label).not.toContain("up");
  });
});
