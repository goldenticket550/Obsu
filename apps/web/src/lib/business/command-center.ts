import type { Trip } from "@/lib/types";
import { BUSINESS_TIME_ZONE, formatPickupTime } from "./pickup-time";
import { businessDayKey, groupUpcomingTrips, tripDayKey } from "./schedule";

/**
 * U2 — Command Center selection logic. PURE: `now` is always injected, never
 * read from the clock here, so every view is deterministic and testable.
 *
 * All day/time reasoning delegates to the S2 helpers (businessDayKey,
 * tripDayKey, groupUpcomingTrips) so there is exactly one definition of "what
 * day is this ride on" in the codebase.
 */

/** A ride identifier the owner can actually say out loud. It is a prefix of
 * the real row id — shortened, never invented. */
export function shortRideId(id: string): string {
  const compact = id.replace(/-/g, "");
  return `#${compact.slice(0, 6).toUpperCase()}`;
}

/** Rounded, human phrasing for the gap until a pickup. */
export function timeUntilLabel(msUntil: number): string {
  if (msUntil <= 0) return "now";
  const minutes = Math.round(msUntil / 60_000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest === 0 ? `in ${hours}h` : `in ${hours}h ${rest}m`;
  const days = Math.round(hours / 24);
  return days === 1 ? "in 1 day" : `in ${days} days`;
}

/** Milliseconds until a ride's pickup, or null when no time is set. */
export function msUntilPickup(trip: Trip, now: Date): number | null {
  if (!trip.start_time) return null;
  const t = new Date(trip.start_time).getTime();
  if (!Number.isFinite(t)) return null;
  return t - now.getTime();
}

/**
 * What the Next Ride card should show.
 *
 * `needs_closing_out` outranks everything: a ride whose pickup has passed but
 * is still open is missing from every total until it is closed out, so it is
 * the most useful thing to put in front of the owner.
 *
 * `sameDay: false` is the "no more rides today" case — there is still a next
 * ride, it just is not today.
 */
export type NextRideView<T extends Trip = Trip> =
  | { kind: "needs_closing_out"; trip: T }
  | { kind: "upcoming"; trip: T; msUntil: number | null; sameDay: boolean }
  | { kind: "none" };

export function selectNextRide<T extends Trip>(
  trips: T[],
  now: Date,
): NextRideView<T> {
  const groups = groupUpcomingTrips(trips, now);

  const overdue = groups.needsClosingOut[0];
  if (overdue) return { kind: "needs_closing_out", trip: overdue };

  const next = groups.today[0] ?? groups.tomorrow[0] ?? groups.later[0];
  if (!next) return { kind: "none" };

  return {
    kind: "upcoming",
    trip: next,
    msUntil: msUntilPickup(next, now),
    sameDay: tripDayKey(next) === businessDayKey(now),
  };
}

/** Greeting keyed to the business day's local hour, not the viewer's. */
export function greetingFor(now: Date): string {
  const hour = Number(
    now.toLocaleString("en-US", {
      timeZone: BUSINESS_TIME_ZONE,
      hour: "2-digit",
      hour12: false,
    }),
  );
  if (!Number.isFinite(hour)) return "Welcome";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** The business-local date, e.g. "Tuesday, July 15". */
export function businessDateLabel(now: Date): string {
  return now.toLocaleDateString("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/**
 * One honest line about the day, built only from scheduled-ride data. Makes no
 * claim about weather, traffic, or system health — none of that is backed by
 * anything this app knows.
 */
export function operationalSummary(trips: Trip[], now: Date): string {
  const groups = groupUpcomingTrips(trips, now);
  const todayCount = groups.today.length;
  const openCount = groups.needsClosingOut.length;

  const parts: string[] = [];

  if (todayCount > 0) {
    parts.push(`${todayCount} ${todayCount === 1 ? "ride" : "rides"} scheduled today`);
    const nextToday = groups.today[0];
    const pickup = nextToday ? formatPickupTime(nextToday.start_time) : null;
    if (pickup) parts.push(`next pickup ${pickup}`);
  } else if (groups.tomorrow.length + groups.later.length > 0) {
    parts.push("No rides left today");
  } else if (openCount === 0) {
    parts.push("Nothing scheduled");
  }

  if (openCount > 0) {
    parts.push(
      `${openCount} ${openCount === 1 ? "ride needs" : "rides need"} closing out`,
    );
  }

  return parts.join(" · ");
}

export interface FlowEntry<T extends Trip = Trip> {
  trip: T;
  /** Completed rides are history; scheduled ones are still ahead. */
  kind: "completed" | "scheduled";
  /** True for the single ride the Next Ride card is showing. */
  isNext: boolean;
}

/**
 * The current business day as an ordered timeline: rides already completed,
 * the next ride, and later scheduled rides.
 *
 * Canceled rides are excluded — they did not happen and are not going to.
 * Ordering is deterministic: rides with a pickup time come first in time
 * order, then rides without one ordered by when they were recorded, so the
 * list never shuffles between renders.
 */
export function todaysFlow<T extends Trip>(trips: T[], now: Date): FlowEntry<T>[] {
  const dayKey = businessDayKey(now);
  const next = selectNextRide(trips, now);
  const nextId = next.kind === "none" ? null : next.trip.id;

  return trips
    .filter((t) => t.status !== "canceled" && tripDayKey(t) === dayKey)
    .sort((a, b) => {
      const aTime = a.start_time ? new Date(a.start_time).getTime() : null;
      const bTime = b.start_time ? new Date(b.start_time).getTime() : null;
      if (aTime !== null && bTime !== null) return aTime - bTime;
      if (aTime !== null) return -1;
      if (bTime !== null) return 1;
      return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
    })
    .map((trip) => ({
      trip,
      kind: trip.status === "completed" ? ("completed" as const) : ("scheduled" as const),
      isNext: trip.id === nextId,
    }));
}
