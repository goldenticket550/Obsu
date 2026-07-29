import type { Trip } from "@/lib/types";
import { formatPickupTime } from "./pickup-time";
import {
  BUSINESS_DAY_ROLLOVER_HOUR,
  businessDayKey,
  businessDayLabelParts,
  businessLocalHour,
  closeOutReason,
  groupUpcomingTrips,
  tripDayKey,
  type BusinessDayLabel,
  type CloseOutReason,
} from "./schedule";

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
  | { kind: "needs_closing_out"; trip: T; reason: CloseOutReason }
  | { kind: "upcoming"; trip: T; msUntil: number | null; sameDay: boolean }
  | { kind: "none" };

export function selectNextRide<T extends Trip>(
  trips: T[],
  now: Date,
): NextRideView<T> {
  const groups = groupUpcomingTrips(trips, now);

  const overdue = groups.needsClosingOut[0];
  if (overdue) {
    // Carried on the view so the card never re-infers WHY it is open — there
    // is one implementation of that rule (closeOutReason).
    const reason = closeOutReason(overdue, now);
    if (reason) return { kind: "needs_closing_out", trip: overdue, reason };
  }

  const next = groups.today[0] ?? groups.tomorrow[0] ?? groups.later[0];
  if (!next) return { kind: "none" };

  return {
    kind: "upcoming",
    trip: next,
    msUntil: msUntilPickup(next, now),
    sameDay: tripDayKey(next) === businessDayKey(now),
  };
}

/**
 * Greeting keyed to the business day's local hour, not the viewer's.
 *
 * F1: the boundaries follow the working night, not the calendar. 00:00–03:59
 * is still the previous evening's shift, so at 1:52 AM the operator sees
 * "Good evening" rather than being told it is morning.
 *   04:00–11:59 morning · 12:00–16:59 afternoon · 17:00–03:59 evening
 */
export function greetingFor(now: Date): string {
  const hour = businessLocalHour(now);
  if (hour === null) return "Welcome";
  if (hour < BUSINESS_DAY_ROLLOVER_HOUR) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * The current BUSINESS day as a date, e.g. "Tuesday, July 28".
 *
 * F2: this used to report the calendar date, which contradicted the rest of the
 * screen. At 1:52 AM the header said "Wednesday, July 29" while the greeting
 * said "Good evening" and the Next Ride card said "Tonight · Tuesday, July 28"
 * — two dates on one screen, each correct under a different definition. The
 * header now speaks the same language as everything else.
 *
 * Returns the DATE PART ONLY. The relative word is deliberately omitted: the
 * greeting sits immediately beside it and the Next Ride card carries it below,
 * so "Tonight · " here would be redundant twice over. This is exactly why the
 * formatter returns parts.
 *
 * Delegates to the single business-day formatter — no second date path, no
 * inline formatting, and `now` stays injected.
 */
export function businessDateLabel(now: Date): string {
  return businessDayLabelParts(businessDayKey(now), now).dateLabel;
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

/**
 * Copy for why a ride is still open. EXHAUSTIVE over CloseOutReason: the
 * `never` branch means adding a future reason fails the type check until its
 * wording exists, so a new reason can never silently render the wrong
 * sentence.
 *
 * Deliberately avoids the phrase "business days" — that reads as "weekdays
 * excluding weekends", and this operator works nights including weekends.
 *
 * Lives here rather than in the component so it is pure and testable; the card
 * only renders what this returns.
 */
export function closeOutCopy(reason: CloseOutReason): string {
  switch (reason.kind) {
    case "pickup_time_passed":
      return "Pickup time has passed — still open";
    case "scheduled_day_passed":
      return reason.daysAgo === 1
        ? "Scheduled for yesterday — still open"
        : `Scheduled ${reason.daysAgo} days ago — still open`;
    default: {
      const exhaustive: never = reason;
      return exhaustive;
    }
  }
}

/**
 * The Next Ride headline: the customer when we know them, otherwise the day
 * this ride is for. A missing-field message ("No time set") is NEVER the
 * headline — it belongs in the time field. Never returns undefined, null, an
 * empty string, or a raw record id.
 */
export function nextRideHeadline(
  customerName: string | null | undefined,
  dayLabel: BusinessDayLabel,
): string {
  const name = typeof customerName === "string" ? customerName.trim() : "";
  if (name) return name;
  if (dayLabel.relative) {
    return dayLabel.relative.charAt(0).toUpperCase() + dayLabel.relative.slice(1);
  }
  return dayLabel.dateLabel || "Scheduled ride";
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
