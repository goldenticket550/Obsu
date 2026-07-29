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

/**
 * F1 — the working night, not the calendar day.
 *
 * This operator drives nights: a ride at 11:30 PM and a ride at 12:30 AM are
 * the same shift, and calling them different days made the dashboard lie. The
 * business day therefore rolls over at 04:00:00.000 New York local time.
 *
 * The rollover is defined in NEW YORK WALL-CLOCK time, not as a UTC offset,
 * because the operator's night is anchored to the clock on the wall — 4 AM is
 * 4 AM whether the date is in EDT or EST. Modelling it as a fixed offset or a
 * fixed number of milliseconds would drift by an hour twice a year.
 */
export const BUSINESS_DAY_ROLLOVER_HOUR = 4;

/** Zero-padded YYYY-MM-DD from calendar numbers. Sorts lexicographically. */
function toDayKey(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Splits a YYYY-MM-DD key into calendar numbers. Null when unparseable. */
function parseDayKey(
  dayKey: string,
): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dayKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return { year, month, day };
}

/**
 * A date-only key as a UTC instant at midnight. Used ONLY for calendar
 * arithmetic and formatting of date-only values — never to represent a real
 * moment. UTC is deliberate: a date-only value has no timezone, and UTC days
 * are all exactly 24h, so day arithmetic here is DST-independent.
 */
function dayKeyToUtcMs(dayKey: string): number | null {
  const parts = parseDayKey(dayKey);
  if (!parts) return null;
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

/** Calendar-day arithmetic on a date-only key. DST-independent by construction. */
export function addCalendarDays(dayKey: string, days: number): string {
  const parts = parseDayKey(dayKey);
  if (!parts) return dayKey;
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return toDayKey(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  );
}

/** Whole calendar days from one date-only key to another (to − from). */
export function calendarDaysBetween(from: string, to: string): number {
  const a = dayKeyToUtcMs(from);
  const b = dayKeyToUtcMs(to);
  if (a === null || b === null) return 0;
  return Math.round((b - a) / 86_400_000);
}

/**
 * An instant expressed as New York calendar parts. Uses Intl rather than any
 * offset arithmetic, so DST is handled by the platform's timezone database.
 */
function businessParts(
  instant: Date,
): { year: number; month: number; day: number; hour: number } | null {
  if (Number.isNaN(instant.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);

  const value = (type: string): number => {
    const found = parts.find((p) => p.type === type)?.value;
    return found === undefined ? Number.NaN : Number(found);
  };

  const year = value("year");
  const month = value("month");
  const day = value("day");
  const hour = value("hour");
  if (![year, month, day, hour].every(Number.isFinite)) return null;
  return { year, month, day, hour };
}

/** The New York wall-clock hour (0–23) of an instant. */
export function businessLocalHour(instant: Date): number | null {
  return businessParts(instant)?.hour ?? null;
}

/**
 * The business day (YYYY-MM-DD) an INSTANT belongs to, with the 4 AM rollover.
 *
 * Technique: format the instant into New York calendar parts, and if the local
 * hour is before the rollover, step the local calendar DATE back one day. No
 * offset and no millisecond duration is ever assumed, so both DST transitions
 * are correct by construction rather than by special case. The result never
 * depends on the host machine's timezone.
 */
export function businessDayKey(value: Date | string): string {
  const instant = value instanceof Date ? value : new Date(value);
  const parts = businessParts(instant);
  if (!parts) return "";

  const calendarKey = toDayKey(parts.year, parts.month, parts.day);
  return parts.hour < BUSINESS_DAY_ROLLOVER_HOUR
    ? addCalendarDays(calendarKey, -1)
    : calendarKey;
}

/** The business-day key `days` after the business day containing `now`. */
export function addDaysKey(now: Date, days: number): string {
  // Stepped on the KEY, not by adding 24h to the instant — a DST day is 23 or
  // 25 hours long, and instant arithmetic would land on the wrong date.
  return addCalendarDays(businessDayKey(now), days);
}

/**
 * The business day a trip belongs to.
 *
 * The two inputs have DIFFERENT semantics and must not be treated alike:
 *
 *  • `start_time` is a real instant, so the 4 AM rollover applies to it.
 *  • `trip_date` is a calendar date the operator typed. It has no clock time
 *    and no timezone. It is used AS-IS — deliberately never passed through the
 *    Date constructor, which would read "2026-07-28" as midnight UTC and shift
 *    it to July 27 in New York. Please do not "fix" this later by parsing it.
 */
export function tripDayKey(trip: Trip): string {
  if (trip.start_time) return businessDayKey(trip.start_time);
  const parts = parseDayKey(trip.trip_date ?? "");
  return parts ? toDayKey(parts.year, parts.month, parts.day) : "";
}

/**
 * Why a ride still needs closing out, or null when it does not.
 *
 * This is the SINGLE SOURCE OF TRUTH for "is this ride still open" — isPastDue
 * is derived from it below, so the two can never drift apart. Status
 * eligibility is the existing rule (only `scheduled` rides can be overdue);
 * this does not widen it.
 */
export type CloseOutReason =
  | { kind: "pickup_time_passed" }
  | { kind: "scheduled_day_passed"; daysAgo: number };

export function closeOutReason(trip: Trip, now: Date): CloseOutReason | null {
  if (trip.status !== "scheduled") return null;

  // A real pickup instant: compare instants.
  if (trip.start_time) {
    const pickup = new Date(trip.start_time).getTime();
    if (!Number.isFinite(pickup) || pickup >= now.getTime()) return null;
    return { kind: "pickup_time_passed" };
  }

  // No pickup time: compare business days. A ride on the CURRENT business day
  // is not overdue — at 1:52 AM the current business day is still yesterday's
  // date, so tonight's untimed rides are correctly left alone.
  const tripKey = tripDayKey(trip);
  const currentKey = businessDayKey(now);
  if (!tripKey || !currentKey || tripKey >= currentKey) return null;

  return {
    kind: "scheduled_day_passed",
    daysAgo: calendarDaysBetween(tripKey, currentKey),
  };
}

/**
 * Whether a ride still needs closing out. DERIVED from closeOutReason so there
 * is exactly one implementation of the rule (see the agreement test).
 */
export function isPastDue(trip: Trip, now: Date): boolean {
  return closeOutReason(trip, now) !== null;
}

/** Hour from which the current business day is spoken of as "tonight". */
const EVENING_FROM_HOUR = 17;

export interface BusinessDayLabel {
  /** Null when the day is not adjacent to the current business day. */
  relative: "today" | "tonight" | "tomorrow" | "yesterday" | null;
  /** e.g. "Tuesday, July 28". */
  dateLabel: string;
}

/**
 * Display parts for a business-day key. Returns PARTS, not a joined string, so
 * a caller that wants only the relative word does not have to split on a
 * separator. All business-day display text comes from here.
 */
export function businessDayLabelParts(
  dayKey: string,
  now: Date,
): BusinessDayLabel {
  const utcMs = dayKeyToUtcMs(dayKey);
  const dateLabel =
    utcMs === null
      ? ""
      : // Formatted in UTC because the key is a date-only value: using a real
        // timezone here would shift it to the previous day.
        new Date(utcMs).toLocaleDateString("en-US", {
          timeZone: "UTC",
          weekday: "long",
          month: "long",
          day: "numeric",
        });

  const currentKey = businessDayKey(now);
  if (!dayKey || !currentKey) return { relative: null, dateLabel };

  if (dayKey === currentKey) {
    // The current business day is "today" during daylight hours and "tonight"
    // once the working evening has begun. At 10 AM "Tonight" would mislabel a
    // ride that already ran at 6 AM; at 1:52 AM "Today" would be equally wrong,
    // because the small hours are still that night. The night therefore runs
    // from 17:00 through to the 4 AM rollover — the same span the greeting
    // treats as evening.
    const hour = businessLocalHour(now);
    const night =
      hour !== null &&
      (hour >= EVENING_FROM_HOUR || hour < BUSINESS_DAY_ROLLOVER_HOUR);
    return { relative: night ? "tonight" : "today", dateLabel };
  }
  if (dayKey === addCalendarDays(currentKey, 1)) {
    return { relative: "tomorrow", dateLabel };
  }
  if (dayKey === addCalendarDays(currentKey, -1)) {
    return { relative: "yesterday", dateLabel };
  }
  return { relative: null, dateLabel };
}

/**
 * Presentation join: "Tonight · Tuesday, July 28", or just the date when the
 * day is not adjacent. Casing is applied here, so the formatter's semantic
 * output stays lowercase.
 */
export function joinBusinessDayLabel(label: BusinessDayLabel): string {
  if (!label.relative) return label.dateLabel;
  const relative =
    label.relative.charAt(0).toUpperCase() + label.relative.slice(1);
  return label.dateLabel ? `${relative} · ${label.dateLabel}` : relative;
}

/**
 * The same day, worded to sit INSIDE a sentence rather than stand as a heading.
 *
 * `joinBusinessDayLabel` is a display label — capitalised, `·`-separated, meant
 * to be read on its own line. Dropping that into prose produces "on Tonight ·
 * Wednesday, July 29", which is wrong twice: "on" does not precede a relative
 * word, and a middot is a layout device, not punctuation you read aloud.
 *
 * The preposition is therefore carried by this function rather than the call
 * site, because whether one belongs depends entirely on which branch was taken:
 *
 *   relative + date  →  "tonight (Wednesday, July 29)"
 *   relative only    →  "tonight"
 *   date only        →  "on Saturday, August 8"
 *   neither          →  ""   (caller omits the clause entirely)
 *
 * A caller that pasted "on " in front of this would break the first two cases,
 * which is exactly the bug this replaces. Both forms still derive from the same
 * `businessDayLabelParts`, so there remains one answer to "what day is this".
 */
export function businessDayPhrase(label: BusinessDayLabel): string {
  if (!label.relative) return label.dateLabel ? `on ${label.dateLabel}` : "";
  // Lower case: mid-sentence, not a heading.
  return label.dateLabel
    ? `${label.relative} (${label.dateLabel})`
    : label.relative;
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
