import { describe, expect, it } from "vitest";
import { makeExpense, makeTrip } from "./__factories";
import {
  countsTowardTotals,
  hasQuotedPrice,
  requiresRevenue,
  validateTripSubmission,
} from "./trip-status";
import {
  averageTripValueCents,
  totalRevenueCents,
  tripCount,
} from "./revenue";
import { estimatedOperatingProfitCents } from "./profit";
import { topCustomers } from "./customers";
import { makeCustomer } from "./__factories";

describe("countsTowardTotals", () => {
  it("counts completed trips only", () => {
    expect(countsTowardTotals("completed")).toBe(true);
    expect(countsTowardTotals("scheduled")).toBe(false);
    expect(countsTowardTotals("canceled")).toBe(false);
  });
});

describe("requiresRevenue", () => {
  it("requires a final amount only when completing", () => {
    expect(requiresRevenue("completed")).toBe(true);
    expect(requiresRevenue("scheduled")).toBe(false);
    expect(requiresRevenue("canceled")).toBe(false);
  });
});

describe("hasQuotedPrice", () => {
  it("treats 0 on a scheduled trip as 'no price set', not $0.00", () => {
    expect(hasQuotedPrice(makeTrip({ status: "scheduled", revenue_cents: 0 }))).toBe(
      false,
    );
    expect(
      hasQuotedPrice(makeTrip({ status: "scheduled", revenue_cents: 24000 })),
    ).toBe(true);
  });
});

describe("validateTripSubmission", () => {
  it("rejects a completed trip with no revenue", () => {
    const errors = validateTripSubmission({ status: "completed", revenue: "" });
    expect(errors).toHaveLength(1);
    expect(errors[0]?.field).toBe("revenue");
  });

  it("rejects a completed trip whose revenue is only whitespace", () => {
    expect(validateTripSubmission({ status: "completed", revenue: "   " })).toHaveLength(
      1,
    );
  });

  it("accepts a completed trip with revenue", () => {
    expect(
      validateTripSubmission({ status: "completed", revenue: "240" }),
    ).toEqual([]);
  });

  it("accepts a scheduled trip with NO revenue (price not agreed yet)", () => {
    expect(validateTripSubmission({ status: "scheduled", revenue: "" })).toEqual(
      [],
    );
  });

  it("accepts a scheduled trip that already has a quoted price", () => {
    expect(
      validateTripSubmission({ status: "scheduled", revenue: "240" }),
    ).toEqual([]);
  });

  it("accepts a canceled trip with no revenue", () => {
    expect(validateTripSubmission({ status: "canceled", revenue: "" })).toEqual(
      [],
    );
  });

  it("rejects a malformed amount whatever the status", () => {
    expect(
      validateTripSubmission({ status: "scheduled", revenue: "abc" }),
    ).toHaveLength(1);
    expect(
      validateTripSubmission({ status: "completed", revenue: "abc" }),
    ).toHaveLength(1);
  });

  it("rejects a negative amount", () => {
    expect(
      validateTripSubmission({ status: "completed", revenue: "-10" }),
    ).toHaveLength(1);
  });

  it("accepts formatted currency input the money boundary already supports", () => {
    expect(
      validateTripSubmission({ status: "completed", revenue: "$1,240.50" }),
    ).toEqual([]);
  });
});

/**
 * The guarantee that matters most: a booked-but-not-driven ride must not move
 * a single number anywhere. These assert it against the real calc functions.
 */
describe("scheduled trips never move the totals", () => {
  const completed = makeTrip({ status: "completed", revenue_cents: 24000 });
  const scheduled = makeTrip({ status: "scheduled", revenue_cents: 50000 });

  it("is excluded from revenue", () => {
    expect(totalRevenueCents([completed, scheduled])).toBe(24000);
  });

  it("is excluded from the trip count", () => {
    expect(tripCount([completed, scheduled])).toBe(1);
  });

  it("is excluded from the average trip value", () => {
    // Including the scheduled 500.00 would drag the average to 370.00.
    expect(averageTripValueCents([completed, scheduled])).toBe(24000);
  });

  it("is excluded from estimated operating profit", () => {
    const expenses = [makeExpense({ amount_cents: 4000 })];
    expect(estimatedOperatingProfitCents([completed, scheduled], expenses)).toBe(
      20000,
    );
  });

  it("is excluded from customer rankings", () => {
    const customer = makeCustomer({ name: "Ashley" });
    const trips = [
      makeTrip({ status: "completed", customer_id: customer.id, revenue_cents: 24000 }),
      makeTrip({ status: "scheduled", customer_id: customer.id, revenue_cents: 90000 }),
    ];
    const ranked = topCustomers(trips, [customer], 3);
    expect(ranked[0]?.revenueCents).toBe(24000);
    expect(ranked[0]?.tripCount).toBe(1);
  });

  it("a scheduled trip with no price set contributes nothing", () => {
    expect(totalRevenueCents([makeTrip({ status: "scheduled", revenue_cents: 0 })])).toBe(
      0,
    );
  });
});

/**
 * The other half of the rule: completing the trip is the moment it starts
 * counting. Same row, same revenue — only the status changes.
 */
describe("completing a trip moves it into the totals", () => {
  const booked = makeTrip({ status: "scheduled", revenue_cents: 24000 });

  it("counts once completed", () => {
    expect(totalRevenueCents([booked])).toBe(0);
    expect(tripCount([booked])).toBe(0);

    const completed = { ...booked, status: "completed" as const };
    expect(totalRevenueCents([completed])).toBe(24000);
    expect(tripCount([completed])).toBe(1);
  });

  it("flows through to estimated operating profit", () => {
    const expenses = [makeExpense({ trip_id: booked.id, amount_cents: 4000 })];
    expect(estimatedOperatingProfitCents([booked], expenses)).toBe(-4000);

    const completed = { ...booked, status: "completed" as const };
    expect(estimatedOperatingProfitCents([completed], expenses)).toBe(20000);
  });
});
