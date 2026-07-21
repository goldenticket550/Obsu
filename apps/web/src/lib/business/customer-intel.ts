import type { Customer, Trip } from "@/lib/types";
import { customerLifetimeRevenueCents } from "./customers";

/**
 * Customer intelligence (M9). PURE detection over already-fetched data —
 * `asOfDate` is passed in (no clock inside), so it's fully unit-testable.
 * Follow-ups are DRAFTS only; nothing is ever sent.
 */

/** Days of inactivity before a repeat customer is flagged for follow-up. */
export const INACTIVE_THRESHOLD_DAYS = 30;

export interface InactiveCustomer {
  customer: Customer;
  name: string;
  lastTripDate: string;
  daysSinceLastTrip: number;
  tripCount: number;
  lifetimeRevenueCents: number;
}

/** Whole days between two "YYYY-MM-DD" dates (UTC-day math, DST-independent). */
function toUtcDay(dateStr: string): number {
  const p = dateStr.slice(0, 10).split("-");
  return Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}
function daysBetween(from: string, to: string): number {
  return Math.round((toUtcDay(to) - toUtcDay(from)) / 86_400_000);
}

/**
 * Repeat customers (>= 2 completed trips) whose most recent completed trip is
 * older than `thresholdDays` as of `asOfDate`. Canceled/scheduled trips are
 * ignored for both the 2-trip test and the last-trip date. Sorted most-overdue
 * first. With fresh data this can legitimately be empty — that is correct.
 */
export function inactiveCustomers(
  trips: Trip[],
  customers: Customer[],
  thresholdDays: number,
  asOfDate: string,
): InactiveCustomer[] {
  const flagged: InactiveCustomer[] = [];

  for (const customer of customers) {
    const completed = trips.filter(
      (t) => t.customer_id === customer.id && t.status === "completed",
    );
    if (completed.length < 2) continue; // must be a repeat customer

    let lastTripDate = completed[0]!.trip_date;
    for (const t of completed) {
      if (t.trip_date > lastTripDate) lastTripDate = t.trip_date;
    }

    const daysSinceLastTrip = daysBetween(lastTripDate, asOfDate);
    if (daysSinceLastTrip > thresholdDays) {
      flagged.push({
        customer,
        name: customer.name,
        lastTripDate,
        daysSinceLastTrip,
        tripCount: completed.length,
        lifetimeRevenueCents: customerLifetimeRevenueCents(trips, customer.id),
      });
    }
  }

  return flagged.sort((a, b) => b.daysSinceLastTrip - a.daysSinceLastTrip);
}
