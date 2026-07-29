import type { Customer, PaymentMethod, Trip, TripType } from "@/lib/types";

/**
 * U5 — form defaults derived from the ORG'S OWN history. PURE.
 *
 * The ride form gets used one-handed, at night, in a car. Every default here
 * exists to remove a tap, and every one is earned from what this operator has
 * actually done — never invented, never hard-coded, and never "whichever value
 * happens to be first in the enum".
 *
 * The governing rule: **where there is no history, there is no default.** A
 * required field with no basis for a guess is simply left empty for the
 * operator to choose. Guessing would put a value in a slot that has no evidence
 * behind it, which is the same dishonesty as showing a fabricated number.
 *
 * Only COMPLETED rides count as history — a booking that was never driven, or
 * was canceled, is not evidence of what this business usually does.
 */

/** Rides that count as evidence of the org's habits. */
function completedRides(trips: Trip[]): Trip[] {
  return trips.filter((t) => t.status === "completed");
}

/**
 * The most frequent non-null value of `field` across completed rides.
 *
 * TIE-BREAK: when two values are equally common, the one used on the MOST
 * RECENT completed ride wins. Recency is the better signal of what the
 * operator is doing now, and it makes the result deterministic — an
 * alphabetical or enum-order tie-break would be arbitrary and could flip the
 * default when unrelated data changed.
 *
 * Returns null when no completed ride carries the field.
 */
function mostCommonBy<K extends keyof Trip>(
  trips: Trip[],
  field: K,
): NonNullable<Trip[K]> | null {
  const counts = new Map<NonNullable<Trip[K]>, number>();
  // Most recent first, so the first value seen at a given count is the newest.
  const ordered = [...completedRides(trips)].sort((a, b) =>
    a.trip_date === b.trip_date
      ? b.created_at.localeCompare(a.created_at)
      : b.trip_date.localeCompare(a.trip_date),
  );

  const firstSeen = new Map<NonNullable<Trip[K]>, number>();
  ordered.forEach((trip, index) => {
    const value = trip[field];
    if (value === null || value === undefined) return;
    const key = value as NonNullable<Trip[K]>;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!firstSeen.has(key)) firstSeen.set(key, index);
  });

  let best: NonNullable<Trip[K]> | null = null;
  let bestCount = 0;
  let bestRecency = Number.POSITIVE_INFINITY;

  for (const [value, count] of counts) {
    const recency = firstSeen.get(value) ?? Number.POSITIVE_INFINITY;
    if (count > bestCount || (count === bestCount && recency < bestRecency)) {
      best = value;
      bestCount = count;
      bestRecency = recency;
    }
  }
  return best;
}

/** The org's most common trip type, or null with no history. */
export function mostCommonTripType(trips: Trip[]): TripType | null {
  return mostCommonBy(trips, "trip_type") as TripType | null;
}

/** The org's most common payment method, or null with no history. */
export function mostCommonPaymentMethod(trips: Trip[]): PaymentMethod | null {
  return mostCommonBy(trips, "payment_method") as PaymentMethod | null;
}

/** How many quick-pick customer chips the form offers. */
export const RECENT_CUSTOMER_LIMIT = 5;

/**
 * The customers to offer as quick-pick chips.
 *
 * ORDERING: most recently ridden first, by the date of their latest COMPLETED
 * ride (ties broken by when that ride was recorded, newest first). That answers
 * "who did I drive lately", which is what the operator is reaching for at 2am.
 *
 * COUNT: five — enough to cover the regulars, few enough to stay one thumb-row
 * on a phone without pushing the form off screen.
 *
 * These are a SHORTCUT, not a constraint: the customer field stays a free-text
 * input, so typing a brand-new name is exactly as fast as it was before.
 */
export function recentCustomers(
  trips: Trip[],
  customers: Customer[],
  limit: number = RECENT_CUSTOMER_LIMIT,
): Customer[] {
  const byId = new Map(customers.map((c) => [c.id, c]));

  const latest = new Map<string, { date: string; created: string }>();
  for (const trip of completedRides(trips)) {
    if (!trip.customer_id || !byId.has(trip.customer_id)) continue;
    const current = latest.get(trip.customer_id);
    const candidate = { date: trip.trip_date, created: trip.created_at };
    if (
      !current ||
      candidate.date > current.date ||
      (candidate.date === current.date && candidate.created > current.created)
    ) {
      latest.set(trip.customer_id, candidate);
    }
  }

  return [...latest.entries()]
    .sort((a, b) =>
      a[1].date === b[1].date
        ? b[1].created.localeCompare(a[1].created)
        : b[1].date.localeCompare(a[1].date),
    )
    .slice(0, Math.max(0, limit))
    .map(([id]) => byId.get(id))
    .filter((c): c is Customer => c !== undefined);
}
