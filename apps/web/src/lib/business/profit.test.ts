import { describe, expect, it } from "vitest";
import {
  estimatedOperatingProfitCents,
  estimatedTripProfitCents,
} from "./profit";
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
