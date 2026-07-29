/**
 * S1 — pickup-time helpers. PURE.
 *
 * This business operates in America/New_York, and `trips.start_time` is stored
 * as a UTC timestamptz. Everything the owner sees or types is New York local
 * time, so conversion happens here rather than in components — otherwise a
 * late-night pickup renders on the wrong day for half the year.
 */

export const BUSINESS_TIME_ZONE = "America/New_York";

/**
 * A stored pickup timestamp -> the "HH:MM" value an `<input type="time">`
 * expects, in New York local time. Returns "" when there is no usable time, so
 * the field simply renders empty rather than inventing one.
 */
export function toTimeInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * A stored timestamp -> a dated, timed label in business-local time, e.g.
 * "Jul 28, 7:05 PM". Used where the "when" of an event matters (D1's
 * confirmed_at). Returns null when absent — callers render their own absence
 * copy rather than a fabricated date.
 */
export function formatBusinessDateTime(
  iso: string | null | undefined,
): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * A stored pickup timestamp -> a short display label, e.g. "7:05 PM".
 * Returns null when absent so callers can render their own "time not set"
 * state instead of a fabricated one.
 */
export function formatPickupTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  });
}
