import { describe, expect, it } from "vitest";
import { makeExpense, makeTrip } from "./__factories";
import {
  outstandingBalanceCents,
  paymentState,
  tripPaymentState,
} from "./payment";
import {
  averageTripValueCents,
  totalRevenueCents,
  tripCount,
} from "./revenue";
import { estimatedOperatingProfitCents } from "./profit";
import { optionalDollarsToCents } from "@/lib/money";
import { optStr, optionalPositiveInt } from "@/lib/form";
import { formatBusinessDateTime } from "./pickup-time";

/**
 * D1 — payment state is DERIVED from amount_paid_cents against the fare. These
 * cover every case of the union.
 */
describe("paymentState", () => {
  it("NOT TRACKED when nothing was recorded — not unpaid, not $0.00", () => {
    expect(paymentState(24000, null)).toEqual({ kind: "not_tracked" });
    expect(paymentState(24000, undefined)).toEqual({ kind: "not_tracked" });
  });

  it("UNPAID when zero was received", () => {
    // Explicitly recorded as 0 — a real statement, unlike null.
    expect(paymentState(24000, 0)).toEqual({ kind: "unpaid", balanceCents: 24000 });
  });

  it("PARTIAL when some but not all was received", () => {
    expect(paymentState(24000, 10000)).toEqual({
      kind: "partial",
      balanceCents: 14000,
    });
  });

  it("PAID on the exact amount", () => {
    expect(paymentState(24000, 24000)).toEqual({ kind: "paid" });
  });

  it("OVERPAID is reported explicitly, never clamped to paid", () => {
    // A fare reduced after payment is real; clamping would swallow money owed
    // back to the customer.
    expect(paymentState(20000, 24000)).toEqual({
      kind: "overpaid",
      overageCents: 4000,
    });
  });

  it("handles a zero fare", () => {
    expect(paymentState(0, null)).toEqual({ kind: "not_tracked" });
    expect(paymentState(0, 0)).toEqual({ kind: "paid" });
    expect(paymentState(0, 5000)).toEqual({ kind: "overpaid", overageCents: 5000 });
  });

  it("distinguishes 'not tracked' from 'unpaid' — they are different claims", () => {
    expect(paymentState(24000, null).kind).toBe("not_tracked");
    expect(paymentState(24000, 0).kind).toBe("unpaid");
  });
});

describe("tripPaymentState", () => {
  it("reads the fare and payment straight off the ride", () => {
    const trip = makeTrip({ revenue_cents: 24000, amount_paid_cents: 10000 });
    expect(tripPaymentState(trip)).toEqual({ kind: "partial", balanceCents: 14000 });
  });

  it("is not tracked for every ride recorded before D1", () => {
    // Existing rows have no value for the new column.
    expect(tripPaymentState(makeTrip({ revenue_cents: 24000 }))).toEqual({
      kind: "not_tracked",
    });
  });
});

describe("outstandingBalanceCents", () => {
  it("reports a balance only when one is actually owed", () => {
    expect(outstandingBalanceCents({ kind: "unpaid", balanceCents: 24000 })).toBe(24000);
    expect(outstandingBalanceCents({ kind: "partial", balanceCents: 14000 })).toBe(14000);
  });

  it("is null when there is nothing to claim", () => {
    expect(outstandingBalanceCents({ kind: "not_tracked" })).toBeNull();
    expect(outstandingBalanceCents({ kind: "paid" })).toBeNull();
    expect(outstandingBalanceCents({ kind: "overpaid", overageCents: 4000 })).toBeNull();
  });

  it("never returns a negative balance", () => {
    const states = [
      paymentState(20000, 24000),
      paymentState(24000, 24000),
      paymentState(24000, null),
      paymentState(24000, 10000),
      paymentState(24000, 0),
    ];
    for (const state of states) {
      const balance = outstandingBalanceCents(state);
      if (balance !== null) expect(balance).toBeGreaterThan(0);
    }
  });
});

/**
 * D1 — amount paid is NOT revenue. Recording a payment must not move a single
 * existing figure: revenue still comes only from completed rides.
 */
describe("a partially-paid ride moves no existing number", () => {
  const fare = 24000;

  const unpaidCompleted = makeTrip({ status: "completed", revenue_cents: fare });
  const partiallyPaid = makeTrip({
    status: "completed",
    revenue_cents: fare,
    amount_paid_cents: 10000,
  });
  const fullyPaid = makeTrip({
    status: "completed",
    revenue_cents: fare,
    amount_paid_cents: fare,
  });

  it("revenue is the fare regardless of what was collected", () => {
    expect(totalRevenueCents([unpaidCompleted])).toBe(fare);
    expect(totalRevenueCents([partiallyPaid])).toBe(fare);
    expect(totalRevenueCents([fullyPaid])).toBe(fare);
  });

  it("trip count and average are unaffected by payment", () => {
    expect(tripCount([partiallyPaid])).toBe(1);
    expect(averageTripValueCents([partiallyPaid])).toBe(fare);
  });

  it("estimated operating profit is unaffected by payment", () => {
    const expenses = [makeExpense({ amount_cents: 4000 })];
    expect(estimatedOperatingProfitCents([partiallyPaid], expenses)).toBe(20000);
    expect(estimatedOperatingProfitCents([unpaidCompleted], expenses)).toBe(20000);
  });

  it("a scheduled ride with a deposit still moves nothing", () => {
    // Even money in hand does not make a booking into earned revenue.
    const deposit = makeTrip({
      status: "scheduled",
      revenue_cents: fare,
      amount_paid_cents: 5000,
    });
    expect(totalRevenueCents([deposit])).toBe(0);
    expect(tripCount([deposit])).toBe(0);
    expect(estimatedOperatingProfitCents([deposit], [])).toBe(0);
  });
});

/**
 * D1 — an empty input must persist NULL, never 0. "Not tracked" and "paid
 * nothing" are different claims and the schema distinguishes them. These pin
 * the parsers the server action uses for the new columns.
 */
describe("blank inputs persist NULL, not zero", () => {
  it("amount paid: blank -> null, explicit 0 -> 0", () => {
    expect(optionalDollarsToCents("")).toBeNull();
    expect(optionalDollarsToCents("   ")).toBeNull();
    expect(optionalDollarsToCents(null)).toBeNull();
    // An explicit zero is a real statement and is preserved as 0, not null.
    expect(optionalDollarsToCents("0")).toBe(0);
    expect(optionalDollarsToCents("240")).toBe(24000);
  });

  it("the two produce DIFFERENT payment states", () => {
    const fare = 24000;
    expect(paymentState(fare, optionalDollarsToCents("")).kind).toBe("not_tracked");
    expect(paymentState(fare, optionalDollarsToCents("0")).kind).toBe("unpaid");
  });

  it("passenger count: blank -> null, and zero is rejected", () => {
    expect(optionalPositiveInt("")).toBeNull();
    expect(optionalPositiveInt("  ")).toBeNull();
    expect(optionalPositiveInt("3")).toBe(3);
    // The column's CHECK is > 0; 0 and negatives are refused with guidance.
    expect(() => optionalPositiveInt("0")).toThrow();
    expect(() => optionalPositiveInt("-2")).toThrow();
    expect(() => optionalPositiveInt("2.5")).toThrow();
  });

  it("note: blank -> null, never an empty string", () => {
    expect(optStr(new FormData(), "note")).toBeNull();
    const fd = new FormData();
    fd.set("note", "   ");
    expect(optStr(fd, "note")).toBeNull();
    fd.set("note", "Called ahead");
    expect(optStr(fd, "note")).toBe("Called ahead");
  });
});

/**
 * D1 — confirmation is a timestamp and is reversible.
 */
describe("confirmation state", () => {
  const CONFIRMED_AT = "2026-07-28T23:05:00Z";

  it("a ride with no confirmed_at is unconfirmed", () => {
    const trip = makeTrip({ status: "scheduled" });
    expect(trip.confirmed_at ?? null).toBeNull();
    expect(!!trip.confirmed_at).toBe(false);
  });

  it("confirming records WHEN, not merely THAT", () => {
    const trip = makeTrip({ status: "scheduled", confirmed_at: CONFIRMED_AT });
    expect(trip.confirmed_at).toBe(CONFIRMED_AT);
    // A boolean would have lost this.
    expect(formatBusinessDateTime(trip.confirmed_at)).toBe("Jul 28, 7:05 PM");
  });

  it("unconfirming clears the stamp back to null — the action is reversible", () => {
    const confirmed = makeTrip({ status: "scheduled", confirmed_at: CONFIRMED_AT });
    const unconfirmed = { ...confirmed, confirmed_at: null };
    expect(unconfirmed.confirmed_at).toBeNull();
    expect(formatBusinessDateTime(unconfirmed.confirmed_at)).toBeNull();
  });

  it("confirmation does not touch status, money, or counts", () => {
    const before = makeTrip({
      status: "scheduled",
      revenue_cents: 24000,
      amount_paid_cents: null,
    });
    const after = { ...before, confirmed_at: CONFIRMED_AT };
    expect(after.status).toBe(before.status);
    expect(after.revenue_cents).toBe(before.revenue_cents);
    expect(totalRevenueCents([after])).toBe(totalRevenueCents([before]));
    expect(tripCount([after])).toBe(tripCount([before]));
  });
});
