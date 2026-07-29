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
  field: "revenue" | "trip_type";
  message: string;
}

/**
 * U5 — trip type is required when submitting the ride FORM.
 *
 * This is a form-level rule, not a data migration: rides already stored without
 * a type are untouched and keep rendering their absence copy wherever they
 * appear. It is deliberately separate from validateTripSubmission so that
 * closing out a booked ride (which only supplies a final revenue) is unaffected.
 *
 * The message says what to do, not what went wrong.
 */
export function validateTripType(tripType: string): TripValidationError | null {
  return tripType.trim() === ""
    ? { field: "trip_type", message: "Pick the kind of ride this was." }
    : null;
}

export interface TripFormSubmission extends TripSubmission {
  tripType: string;
}

/**
 * Every rule that can block a ride-form submission, in one place.
 *
 * This matters for data preservation: the server action redirects on failure,
 * which throws away everything the operator typed. So the form enforces this
 * same set BEFORE submitting (via native `required` and input patterns), which
 * means a validation failure never reaches that redirect and no field is ever
 * cleared. The server still runs it as defence in depth for a bypassed client.
 *
 * Deliberately NOT used by markTripCompleted — closing out a booked ride
 * supplies only a final revenue and has no trip type to give.
 */
export function blockingFormErrors(
  input: TripFormSubmission,
): TripValidationError[] {
  const errors = validateTripSubmission(input);
  const typeError = validateTripType(input.tripType);
  return typeError ? [...errors, typeError] : errors;
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
