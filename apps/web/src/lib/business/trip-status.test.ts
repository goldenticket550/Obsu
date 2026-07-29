import { describe, expect, it } from "vitest";
import { makeExpense, makeTrip } from "./__factories";
import {
  countsTowardTotals,
  hasQuotedPrice,
  requiresRevenue,
  blockingFormErrors,
  validateTripSubmission,
  validateTripType,
} from "./trip-status";
import { mostCommonTripType } from "./form-defaults";
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

/**
 * U5 — trip type is required on the ride form. A form-level rule enforced
 * server-side too, so it holds even if the browser's validation is bypassed.
 */
describe("validateTripType", () => {
  it("rejects an empty trip type on submit", () => {
    const error = validateTripType("");
    expect(error).not.toBeNull();
    expect(error?.field).toBe("trip_type");
  });

  it("rejects whitespace-only", () => {
    expect(validateTripType("   ")).not.toBeNull();
  });

  it("accepts a chosen type", () => {
    expect(validateTripType("airport")).toBeNull();
  });

  it("says what to do, not what went wrong", () => {
    const message = validateTripType("")?.message ?? "";
    expect(message.toLowerCase()).toContain("pick");
    // No jargon about invalid/null/required-field errors.
    for (const jargon of ["invalid", "null", "undefined", "error"]) {
      expect(message.toLowerCase()).not.toContain(jargon);
    }
  });

  it("is independent of the revenue rule, so closing out a ride is unaffected", () => {
    // markTripCompleted supplies only a final revenue and no trip type; it must
    // not be blocked by the form-level requirement.
    expect(validateTripSubmission({ status: "completed", revenue: "240" })).toEqual([]);
  });
});

/**
 * U5 — an existing ride stored WITHOUT a trip type is untouched by the new form
 * requirement. This is not a data migration.
 */
describe("existing rides with no trip type", () => {
  it("still has a null trip type — nothing backfills a default", () => {
    const legacy = makeTrip({ status: "completed", trip_type: null });
    expect(legacy.trip_type).toBeNull();
  });

  it("renders its absence copy rather than a fabricated default", () => {
    // Mirrors how the Next Ride card renders it: `trip_type ? labelize(...) : "Not set"`.
    const legacy = makeTrip({ status: "completed", trip_type: null });
    const rendered = legacy.trip_type ? String(legacy.trip_type) : "Not set";
    expect(rendered).toBe("Not set");
  });

  it("does not become the org's derived default just by being displayed", () => {
    // The default is derived from history for the FORM; it never rewrites a row.
    const legacy = makeTrip({ status: "completed", trip_type: null });
    const history = [makeTrip({ status: "completed", trip_type: "airport" })];
    expect(mostCommonTripType(history)).toBe("airport");
    expect(legacy.trip_type).toBeNull();
  });
});

/**
 * U5 — "a validation failure preserves every entered field".
 *
 * The server action redirects on failure, which throws away everything typed.
 * Preservation is therefore achieved by catching every blocking rule BEFORE
 * submitting, so a validation failure never reaches that redirect. These tests
 * pin the property that makes it true: the set the form enforces pre-submit is
 * exactly the set the server enforces.
 */
describe("blockingFormErrors — nothing is ever cleared", () => {
  const valid = { status: "completed" as const, revenue: "240", tripType: "airport" };

  it("passes a complete submission", () => {
    expect(blockingFormErrors(valid)).toEqual([]);
  });

  it("catches a missing trip type", () => {
    const errors = blockingFormErrors({ ...valid, tripType: "" });
    expect(errors.map((e) => e.field)).toContain("trip_type");
  });

  it("catches missing revenue on a completed ride", () => {
    const errors = blockingFormErrors({ ...valid, revenue: "" });
    expect(errors.map((e) => e.field)).toContain("revenue");
  });

  it("catches a malformed amount", () => {
    const errors = blockingFormErrors({ ...valid, revenue: "abc" });
    expect(errors.map((e) => e.field)).toContain("revenue");
  });

  it("reports EVERY problem at once, so one round trip fixes the form", () => {
    const errors = blockingFormErrors({
      status: "completed",
      revenue: "",
      tripType: "",
    });
    expect(errors.map((e) => e.field).sort()).toEqual(["revenue", "trip_type"]);
  });

  it("still allows a scheduled ride with no price yet", () => {
    expect(
      blockingFormErrors({ status: "scheduled", revenue: "", tripType: "airport" }),
    ).toEqual([]);
  });

  it("is a pure predicate — it never mutates or clears the submitted values", () => {
    const submission = { status: "completed" as const, revenue: "", tripType: "" };
    const snapshot = { ...submission };
    blockingFormErrors(submission);
    expect(submission).toEqual(snapshot);
  });

  it("covers every rule the server enforces, so no validation failure can reach the redirect", () => {
    // Each case the server would reject must also be caught pre-submit.
    const serverRejects = [
      { status: "completed" as const, revenue: "", tripType: "airport" },
      { status: "completed" as const, revenue: "abc", tripType: "airport" },
      { status: "completed" as const, revenue: "-5", tripType: "airport" },
      { status: "completed" as const, revenue: "240", tripType: "" },
      { status: "scheduled" as const, revenue: "abc", tripType: "airport" },
    ];
    for (const submission of serverRejects) {
      expect(blockingFormErrors(submission).length).toBeGreaterThan(0);
    }
  });
});
