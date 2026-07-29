import type { Trip } from "@/lib/types";

/**
 * D1 — payment state, DERIVED. PURE.
 *
 * Payment status and outstanding balance are deliberately not columns: both
 * follow from `amount_paid_cents` against the fare already stored in
 * `revenue_cents`. Storing either would create two sources of truth for one
 * fact, and they would drift the first time a fare was corrected.
 *
 * `amount_paid_cents === null` means PAYMENT IS NOT TRACKED for that ride —
 * which is the truth for every ride recorded before this existed. It is not
 * "unpaid" and it is not "$0.00", and the UI must render it as absence.
 *
 * Overpayment is represented explicitly rather than clamped to "paid". A fare
 * reduced after the customer already paid is a real situation, and clamping it
 * would silently swallow money the operator may owe back.
 */
export type PaymentState =
  | { kind: "not_tracked" }
  | { kind: "unpaid"; balanceCents: number }
  | { kind: "partial"; balanceCents: number }
  | { kind: "paid" }
  | { kind: "overpaid"; overageCents: number };

/**
 * Derives the payment state of a ride from what was charged and what was
 * received. `fareCents` is the ride's own revenue_cents.
 */
export function paymentState(
  fareCents: number,
  amountPaidCents: number | null | undefined,
): PaymentState {
  if (amountPaidCents === null || amountPaidCents === undefined) {
    return { kind: "not_tracked" };
  }

  const fare = Number.isFinite(fareCents) ? fareCents : 0;
  const paid = Number.isFinite(amountPaidCents) ? amountPaidCents : 0;
  const balance = fare - paid;

  if (balance < 0) return { kind: "overpaid", overageCents: -balance };
  if (balance === 0) return { kind: "paid" };
  // Something was received, but not all of it.
  if (paid > 0) return { kind: "partial", balanceCents: balance };
  return { kind: "unpaid", balanceCents: balance };
}

/** Convenience for a whole trip row. */
export function tripPaymentState(trip: Trip): PaymentState {
  return paymentState(trip.revenue_cents, trip.amount_paid_cents);
}

/**
 * Outstanding balance in cents, or null when there is nothing to claim: not
 * tracked, settled, or overpaid. Never negative — an overpayment is reported
 * through the union's `overpaid` case, not as a negative balance.
 */
export function outstandingBalanceCents(state: PaymentState): number | null {
  switch (state.kind) {
    case "unpaid":
    case "partial":
      return state.balanceCents;
    case "not_tracked":
    case "paid":
    case "overpaid":
      return null;
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}
