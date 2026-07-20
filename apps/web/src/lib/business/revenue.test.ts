import { describe, expect, it } from "vitest";
import {
  averageTripValueCents,
  totalRevenueCents,
  tripCount,
} from "./revenue";
import { makeTrip } from "./__factories";

describe("revenue", () => {
  it("totals completed-trip revenue only (canceled/scheduled excluded)", () => {
    const trips = [
      makeTrip({ revenue_cents: 24000, status: "completed" }),
      makeTrip({ revenue_cents: 10000, status: "completed" }),
      makeTrip({ revenue_cents: 99999, status: "canceled" }),
      makeTrip({ revenue_cents: 5000, status: "scheduled" }),
    ];
    expect(totalRevenueCents(trips)).toBe(34000);
  });

  it("returns 0 / 0 / 0 for empty input", () => {
    expect(totalRevenueCents([])).toBe(0);
    expect(tripCount([])).toBe(0);
    expect(averageTripValueCents([])).toBe(0);
  });

  it("counts completed trips only", () => {
    const trips = [
      makeTrip(),
      makeTrip({ status: "canceled" }),
      makeTrip({ status: "scheduled" }),
    ];
    expect(tripCount(trips)).toBe(1);
  });

  it("averages completed trips with Math.round", () => {
    // (10000 + 10001) / 2 = 10000.5 -> 10001
    const trips = [
      makeTrip({ revenue_cents: 10000 }),
      makeTrip({ revenue_cents: 10001 }),
    ];
    expect(averageTripValueCents(trips)).toBe(10001);
  });

  it("average excludes canceled from both total and count", () => {
    const trips = [
      makeTrip({ revenue_cents: 30000 }),
      makeTrip({ revenue_cents: 999, status: "canceled" }),
    ];
    expect(averageTripValueCents(trips)).toBe(30000);
  });
});
