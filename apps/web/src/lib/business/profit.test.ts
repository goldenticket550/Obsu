import { describe, expect, it } from "vitest";
import {
  estimatedOperatingProfitCents,
  estimatedTripProfitCents,
  profitMarginPercent,
} from "./profit";
import { totalRevenueCents } from "./revenue";
import { makeExpense, makeTrip } from "./__factories";

describe("estimatedTripProfitCents", () => {
  it("subtracts only the expenses linked to that trip (by trip_id)", () => {
    const trip = makeTrip({ id: "trip-A", revenue_cents: 24000 });
    const expenses = [
      makeExpense({ trip_id: "trip-A", amount_cents: 1800, category: "gas" }),
      makeExpense({ trip_id: "trip-A", amount_cents: 750, category: "tolls" }),
      makeExpense({ trip_id: "trip-OTHER", amount_cents: 9999 }), // ignored
      makeExpense({ trip_id: null, amount_cents: 5000 }), // standalone, ignored
    ];
    expect(estimatedTripProfitCents(trip, expenses)).toBe(24000 - 2550);
  });

  it("equals revenue when there are no linked expenses", () => {
    const trip = makeTrip({ id: "t", revenue_cents: 12345 });
    expect(estimatedTripProfitCents(trip, [])).toBe(12345);
  });

  it("can be negative", () => {
    const trip = makeTrip({ id: "t", revenue_cents: 1000 });
    const expenses = [makeExpense({ trip_id: "t", amount_cents: 1500 })];
    expect(estimatedTripProfitCents(trip, expenses)).toBe(-500);
  });
});

describe("estimatedOperatingProfitCents", () => {
  it("= completed revenue − ALL expenses incl. standalone overhead", () => {
    const trips = [
      makeTrip({ revenue_cents: 24000 }),
      makeTrip({ revenue_cents: 6000, status: "canceled" }), // excluded from revenue
    ];
    const expenses = [
      makeExpense({ amount_cents: 1800, category: "gas", trip_id: "x" }),
      makeExpense({ amount_cents: 5000, category: "maintenance", trip_id: null }),
    ];
    expect(estimatedOperatingProfitCents(trips, expenses)).toBe(24000 - 6800);
  });

  it("is 0 for empty inputs", () => {
    expect(estimatedOperatingProfitCents([], [])).toBe(0);
  });
});

describe("profitMarginPercent", () => {
  it("expresses profit as a percentage of recorded revenue", () => {
    expect(profitMarginPercent(100_00, 25_00)).toBe(25);
  });

  it("returns null with no revenue, rather than 0% or NaN", () => {
    // 0% would read as "broke even", which is a different claim from
    // "there is nothing to measure yet".
    expect(profitMarginPercent(0, 0)).toBeNull();
    expect(profitMarginPercent(0, -500)).toBeNull();
  });

  it("handles a loss as a negative margin", () => {
    expect(profitMarginPercent(100_00, -50_00)).toBe(-50);
  });

  it("guards against a non-finite revenue figure", () => {
    expect(profitMarginPercent(Number.NaN, 100)).toBeNull();
  });
});

describe("profitMarginPercent — a month with no completed trips", () => {
  it("is null (never NaN, Infinity, or a fake 0%) when only scheduled rides exist", () => {
    // The exact real-world case: rides are booked but none driven yet, so
    // revenue is 0. The UI must render an honest dash, not "0.0%" (which
    // would claim a measured break-even) and not "NaN%".
    const monthTrips = [
      makeTrip({ status: "scheduled", revenue_cents: 50000 }),
      makeTrip({ status: "scheduled", revenue_cents: 0 }),
    ];
    const monthExpenses = [makeExpense({ amount_cents: 4000 })];

    const revenue = totalRevenueCents(monthTrips);
    const profit = estimatedOperatingProfitCents(monthTrips, monthExpenses);
    const margin = profitMarginPercent(revenue, profit);

    expect(revenue).toBe(0); // scheduled rides earn nothing
    expect(profit).toBe(-4000); // real expenses still count
    expect(margin).toBeNull();
    expect(Number.isNaN(margin as unknown as number)).toBe(false);
  });

  it("is null with no trips and no expenses at all", () => {
    const revenue = totalRevenueCents([]);
    const profit = estimatedOperatingProfitCents([], []);
    expect(profitMarginPercent(revenue, profit)).toBeNull();
  });

  it("starts reporting a margin as soon as one ride is completed", () => {
    const trips = [makeTrip({ status: "completed", revenue_cents: 20000 })];
    const expenses = [makeExpense({ amount_cents: 5000 })];
    const revenue = totalRevenueCents(trips);
    const profit = estimatedOperatingProfitCents(trips, expenses);
    expect(profitMarginPercent(revenue, profit)).toBe(75);
  });
});
