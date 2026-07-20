import type { Trip } from "@/lib/types";

/**
 * Revenue calcs. PURE — take already-fetched trips, return integer cents.
 * "Earned" revenue counts only trips with status = 'completed'
 * (canceled = 0, scheduled excluded).
 */

const isCompleted = (t: Trip): boolean => t.status === "completed";

export function totalRevenueCents(trips: Trip[]): number {
  return trips
    .filter(isCompleted)
    .reduce((sum, t) => sum + t.revenue_cents, 0);
}

export function tripCount(trips: Trip[]): number {
  return trips.filter(isCompleted).length;
}

/** Average completed-trip value in cents (Math.round). 0 when there are none. */
export function averageTripValueCents(trips: Trip[]): number {
  const count = tripCount(trips);
  if (count === 0) return 0;
  return Math.round(totalRevenueCents(trips) / count);
}
