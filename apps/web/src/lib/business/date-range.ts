/**
 * Date-range helpers.
 *
 * `filterByDateRange` is PURE — it takes explicit start/end bounds and never
 * looks at the clock, so it is fully unit-testable. The only clock-aware piece
 * is `currentMonthRange`, kept deliberately tiny and separate; callers (M6)
 * compute the range there and pass it into the pure calcs.
 */

/**
 * Keep items whose date field falls within [startDate, endDate], inclusive.
 * Bounds are "YYYY-MM-DD"; the item's field is compared on its date portion,
 * so it works for both date and timestamp columns.
 */
export function filterByDateRange<T>(
  items: T[],
  dateField: keyof T,
  startDate: string,
  endDate: string,
): T[] {
  return items.filter((item) => {
    const day = String(item[dateField]).slice(0, 10);
    return day >= startDate && day <= endDate;
  });
}

/**
 * First and last calendar day of the current month in America/New_York, as
 * "YYYY-MM-DD" strings. NOT pure (reads the clock) — pass `now` to make it
 * deterministic in tests.
 */
export function currentMonthRange(now: Date = new Date()): {
  start: string;
  end: string;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // e.g. "2026-07-20"
  const year = Number(parts.slice(0, 4));
  const month = Number(parts.slice(5, 7)); // 1-12
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

/**
 * Today's date as "YYYY-MM-DD" in America/New_York. NOT pure (reads the clock)
 * — pass `now` to make it deterministic in tests. Callers feed this into the
 * pure calcs (e.g. inactiveCustomers' asOfDate).
 */
export function todayInNewYork(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Previous month's span through the same New York calendar day. */
export function previousComparableMonthRange(now: Date = new Date()): { start: string; end: string } {
  const today = todayInNewYork(now);
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const day = Number(today.slice(8, 10));
  const previous = new Date(Date.UTC(year, month - 2, 1));
  const previousYear = previous.getUTCFullYear();
  const previousMonth = previous.getUTCMonth() + 1;
  const previousLastDay = new Date(Date.UTC(previousYear, previousMonth, 0)).getUTCDate();
  const comparableDay = Math.min(day, previousLastDay);
  const mm = String(previousMonth).padStart(2, "0");
  return {
    start: `${previousYear}-${mm}-01`,
    end: `${previousYear}-${mm}-${String(comparableDay).padStart(2, "0")}`,
  };
}
