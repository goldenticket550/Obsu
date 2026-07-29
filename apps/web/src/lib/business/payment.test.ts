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
