import type { Trip } from "@/lib/types";
import { BUSINESS_TIME_ZONE } from "./pickup-time";
import { hasQuotedPrice } from "./trip-status";

/**
 * S2 — organising booked rides into what the owner actually needs to see.
 * PURE: `now` is always passed in, never read from the clock here, so the
 * buckets are deterministic and testable.
 *
 * Every day boundary is computed in America/New_York (the business's operating
 * timezone). A pickup at 11pm belongs to that evening's day, not to the next
 * one — which is exactly what naive UTC bucketing gets wrong.
 */

export type UpcomingBucket = "needs_closing_out" | "today" | "tomorrow" | "later";

/** The calendar day (YYYY-MM-DD) a moment falls on in New York. */
export function businessDayKey(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  // en-CA formats as YYYY-MM-DD, which sorts lexicographically.
  return d.toLocaleDateString("en-CA", { timeZone: BUSINESS_TIME_ZONE });
}

/** The day key N days after the given moment, in New York. */
export function addDaysKey(now: Date, days: number): string {
  return businessDayKey(new Date(now.getTime() + days * 24 * 60 * 60 * 1000));
}

/**
 * The day a trip belongs to: its pickup timestamp when one is set, otherwise
 * the trip_date the owner entered. `trip_date` is a plain date column already
 * expressed in business-local terms, so it is used as-is.
 */
export function tripDayKey(trip: Trip): string {
  return trip.start_time ? businessDayKey(trip.start_time) : trip.trip_date;
}

/**
 * Whether a scheduled ride's moment has already passed — i.e. it was probably
 * driven and never closed out.
 *
 * With a pickup time, that's simply "the time has passed". Without one, only a
 * trip dated before today counts: a ride booked for later today with no time
 * set is still upcoming, not overdue.
 */
export function isPastDue(trip: Trip, now: Date): boolean {
  if (trip.start_time) {
    const t = new Date(trip.start_time).getTime();
    return Number.isFinite(t) && t < now.getTime();
  }
  return trip.trip_date < businessDayKey(now);
}

/** Chronological order within the list: earlier pickups first. */
function compareTrips(a: Trip, b: Trip): number {
  const dayA = tripDayKey(a);
  const dayB = tripDayKey(b);
  if (dayA !== dayB) return dayA < dayB ? -1 : 1;

  // Same day: rides with a known pickup time come first, in time order; rides
  // with no time yet sit at the end of that day.
  if (a.start_time && b.start_time) {
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  }
  if (a.start_time) return -1;
  if (b.start_time) return 1;
  return 0;
}

export interface UpcomingGroups<T extends Trip = Trip> {
  /** Scheduled rides whose moment has passed — surfaced first, oldest first. */
  needsClosingOut: T[];
  today: T[];
  tomorrow: T[];
  later: T[];
}

/**
 * Splits scheduled rides into the four groups the Upcoming view renders.
 * Only `scheduled` trips are considered — completed and canceled rides have no
 * place in a list of what is still coming.
 *
 * Generic over the row type so callers keep whatever they joined on (e.g. the
 * customer name) instead of having it erased to a bare Trip.
 */
export function groupUpcomingTrips<T extends Trip>(
  trips: T[],
  now: Date,
): UpcomingGroups<T> {
  const scheduled = trips.filter((t) => t.status === "scheduled");
  const todayKey = businessDayKey(now);
  const tomorrowKey = addDaysKey(now, 1);

  const groups: UpcomingGroups<T> = {
    needsClosingOut: [],
    today: [],
    tomorrow: [],
    later: [],
  };

  for (const trip of scheduled) {
    if (isPastDue(trip, now)) {
      groups.needsClosingOut.push(trip);
      continue;
    }
    const key = tripDayKey(trip);
    if (key === todayKey) groups.today.push(trip);
    else if (key === tomorrowKey) groups.tomorrow.push(trip);
    else groups.later.push(trip);
  }

  groups.needsClosingOut.sort(compareTrips); // oldest overdue first
  groups.today.sort(compareTrips);
  groups.tomorrow.sort(compareTrips);
  groups.later.sort(compareTrips);
  return groups;
}

export interface BookedSummary {
  /** How many scheduled rides are in scope. */
  tripCount: number;
  /** Total of the rides that DO have a price, in cents. */
  quotedTotalCents: number;
  /** How many rides have no price set — reported, never summed as zero. */
  unpricedCount: number;
}

/**
 * Forward-looking summary of booked work.
 *
 * Deliberately NOT a single "projected revenue" number: a ride with no price
 * set is not worth $0, it is unknown. Summing it as zero would understate the
 * book, so unpriced rides are reported as their own count and the quoted total
 * covers only rides that actually have a price (see hasQuotedPrice).
 */
export function bookedSummary(trips: Trip[]): BookedSummary {
  const scheduled = trips.filter((t) => t.status === "scheduled");
  const priced = scheduled.filter(hasQuotedPrice);
  return {
    tripCount: scheduled.length,
    quotedTotalCents: priced.reduce((sum, t) => sum + t.revenue_cents, 0),
    unpricedCount: scheduled.length - priced.length,
  };
}
