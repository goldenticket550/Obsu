import type { Trip } from "@/lib/types";

/**
 * Per-unit rates for a single trip. PURE. Return cents-per-unit (rounded), or
 * null when the divisor (hours / mileage) is missing or not positive.
 * Formatting to dollars happens later in the UI.
 */

export function revenuePerHourCents(trip: Trip): number | null {
  if (trip.hours != null && trip.hours > 0) {
    return Math.round(trip.revenue_cents / trip.hours);
  }
  return null;
}

export function revenuePerMileCents(trip: Trip): number | null {
  if (trip.mileage != null && trip.mileage > 0) {
    return Math.round(trip.revenue_cents / trip.mileage);
  }
  return null;
}
