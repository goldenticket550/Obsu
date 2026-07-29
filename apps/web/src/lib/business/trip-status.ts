import type { Trip, TripStatus } from "@/lib/types";

/**
 * S1 — scheduling rules. PURE (no DB, no clock). These encode the two rules
 * that scheduling introduces:
 *
 *  1. Only a COMPLETED trip counts toward money. A ride that is merely booked
 *     has not earned anything yet, so `scheduled` (and `canceled`) must never
 *     move revenue, profit, expense, or trip-count totals.
 *  2. A completed trip must have a final revenue amount; a scheduled one need
 *     not, because the price may not be agreed yet.
 *
 * Storage note (no migration): `trips.revenue_cents` is `not null default 0`,
 * so a scheduled trip with an unknown price is stored as 0. For a scheduled
 * trip, 0 therefore means "no price set" — this business has no $0 rides — and
 * the UI must render that as an explicit empty state, never as "$0.00".
 */

/** Whether a trip in this status contributes to revenue/profit/trip counts. */
export function countsTowardTotals(status: TripStatus): boolean {
  return status === "completed";
}

/** Whether a final revenue amount is mandatory for this status. */
export function requiresRevenue(status: TripStatus): boolean {
  return status === "completed";
}

/**
 * Whether a scheduled trip has a price on it yet. Only meaningful for
 * `scheduled` — see the storage note above.
 */
export function hasQuotedPrice(trip: Trip): boolean {
  return trip.revenue_cents > 0;
}

export interface TripValidationError {
  field: "revenue";
  message: string;
}

export interface TripSubmission {
  status: TripStatus;
  /** The revenue field exactly as submitted, in dollars. Blank = not provided. */
  revenue: string;
}

/**
 * Validates a trip form submission. Returns an empty array when valid.
 *
 * Revenue is REQUIRED for `completed` (that is the moment the money becomes
 * real) and OPTIONAL for `scheduled`/`canceled`. A provided amount must always
 * be a valid non-negative number, whatever the status — parsing/rounding stays
 * in money.ts, this only decides presence and shape.
 */
export function validateTripSubmission(
  input: TripSubmission,
): TripValidationError[] {
  const raw = input.revenue.trim();

  if (raw === "") {
    if (requiresRevenue(input.status)) {
      return [
        {
          field: "revenue",
          message: "Revenue is required to complete a trip.",
        },
      ];
    }
    return [];
  }

  // Mirrors the accepted input of money.dollarsToCents ("$1,240.50").
  const numeric = Number(raw.replace(/[$,\s]/g, ""));
  if (!Number.isFinite(numeric)) {
    return [{ field: "revenue", message: "Enter a valid dollar amount." }];
  }
  if (numeric < 0) {
    return [{ field: "revenue", message: "Amount cannot be negative." }];
  }
  return [];
}
