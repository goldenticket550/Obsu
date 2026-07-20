import { describe, expect, it } from "vitest";
import { revenuePerHourCents, revenuePerMileCents } from "./trip-rates";
import { makeTrip } from "./__factories";

describe("revenuePerHourCents", () => {
  it("= revenue / hours", () => {
    expect(revenuePerHourCents(makeTrip({ revenue_cents: 30000, hours: 3 }))).toBe(
      10000,
    );
  });

  it("rounds", () => {
    // 10000 / 3 = 3333.33 -> 3333
    expect(revenuePerHourCents(makeTrip({ revenue_cents: 10000, hours: 3 }))).toBe(
      3333,
    );
  });

  it("null when hours missing or not positive", () => {
    expect(revenuePerHourCents(makeTrip({ revenue_cents: 30000, hours: null }))).toBeNull();
    expect(revenuePerHourCents(makeTrip({ revenue_cents: 30000, hours: 0 }))).toBeNull();
  });
});

describe("revenuePerMileCents", () => {
  it("= revenue / mileage (rounded)", () => {
    expect(
      revenuePerMileCents(makeTrip({ revenue_cents: 24000, mileage: 20 })),
    ).toBe(1200);
  });

  it("null when mileage missing or not positive", () => {
    expect(revenuePerMileCents(makeTrip({ revenue_cents: 24000, mileage: null }))).toBeNull();
    expect(revenuePerMileCents(makeTrip({ revenue_cents: 24000, mileage: 0 }))).toBeNull();
  });
});
