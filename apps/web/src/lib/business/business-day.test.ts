import { describe, expect, it } from "vitest";
import { makeTrip } from "./__factories";
import {
  BUSINESS_DAY_ROLLOVER_HOUR,
  addCalendarDays,
  addDaysKey,
  businessDayKey,
  businessDayLabelParts,
  calendarDaysBetween,
  closeOutReason,
  groupUpcomingTrips,
  isPastDue,
  joinBusinessDayLabel,
  tripDayKey,
} from "./schedule";
import { closeOutCopy, nextRideHeadline } from "./command-center";
import type { TripStatus } from "@/lib/types";

/**
 * F1 — the business day ends at 4:00 AM New York.
 *
 * Every instant below is written as an explicit UTC literal with its New York
 * wall-clock time in a comment, so no assertion depends on the machine's
 * timezone and `now` is never read from the clock.
 */

// EDT (UTC-4) in July.
const NY_1130PM_JUL15 = "2026-07-16T03:30:00Z"; // 11:30 PM Jul 15
const NY_1230AM_JUL16 = "2026-07-16T04:30:00Z"; // 12:30 AM Jul 16
const NY_359AM_JUL16 = "2026-07-16T07:59:00Z"; // 3:59 AM Jul 16
const NY_400AM_JUL16 = "2026-07-16T08:00:00Z"; // 4:00 AM Jul 16
const NY_401AM_JUL16 = "2026-07-16T08:01:00Z"; // 4:01 AM Jul 16

describe("BUSINESS_DAY_ROLLOVER_HOUR", () => {
  it("is 4 AM — the end of the operator's working night", () => {
    expect(BUSINESS_DAY_ROLLOVER_HOUR).toBe(4);
  });
});

describe("businessDayKey — the 4 AM boundary", () => {
  it("keeps 11:30 PM and the following 12:30 AM on the same business day", () => {
    expect(businessDayKey(NY_1130PM_JUL15)).toBe("2026-07-15");
    expect(businessDayKey(NY_1230AM_JUL16)).toBe("2026-07-15");
    expect(businessDayKey(NY_1130PM_JUL15)).toBe(businessDayKey(NY_1230AM_JUL16));
  });

  it("puts 3:59 AM on the PREVIOUS calendar date's business day", () => {
    expect(businessDayKey(NY_359AM_JUL16)).toBe("2026-07-15");
  });

  it("starts the new business day at exactly 4:00 AM", () => {
    expect(businessDayKey(NY_400AM_JUL16)).toBe("2026-07-16");
  });

  it("stays in the new business day at 4:01 AM", () => {
    expect(businessDayKey(NY_401AM_JUL16)).toBe("2026-07-16");
  });

  it("returns an empty key for an unparseable instant", () => {
    expect(businessDayKey("not-a-date")).toBe("");
  });
});

describe("businessDayKey — DST", () => {
  it("uses 4 AM wall-clock in EDT (summer, UTC-4)", () => {
    expect(businessDayKey("2026-07-16T07:59:00Z")).toBe("2026-07-15"); // 3:59 AM
    expect(businessDayKey("2026-07-16T08:00:00Z")).toBe("2026-07-16"); // 4:00 AM
  });

  it("uses 4 AM wall-clock in EST (winter, UTC-5) — not a fixed UTC offset", () => {
    // If the rule were pinned to the summer offset, these would be off by an
    // hour: 08:00Z in January is 3:00 AM in New York, still the previous night.
    expect(businessDayKey("2026-01-16T08:00:00Z")).toBe("2026-01-15"); // 3:00 AM
    expect(businessDayKey("2026-01-16T08:59:00Z")).toBe("2026-01-15"); // 3:59 AM
    expect(businessDayKey("2026-01-16T09:00:00Z")).toBe("2026-01-16"); // 4:00 AM
  });

  it("handles spring forward without asserting a nonexistent local time", () => {
    // 2026-03-08: 2:00 AM EST jumps to 3:00 AM EDT, so 2:30 AM never occurs.
    // Only valid instants either side of the gap are tested.
    expect(businessDayKey("2026-03-08T06:30:00Z")).toBe("2026-03-07"); // 1:30 AM EST
    expect(businessDayKey("2026-03-08T07:30:00Z")).toBe("2026-03-07"); // 3:30 AM EDT
    expect(businessDayKey("2026-03-08T08:00:00Z")).toBe("2026-03-08"); // 4:00 AM EDT
  });

  it("puts BOTH occurrences of the repeated hour on the previous business day", () => {
    // 2026-11-01: 2:00 AM EDT falls back to 1:00 AM EST, so 1:30 AM happens
    // twice. Both are before 4 AM, so both belong to Oct 31's night.
    expect(businessDayKey("2026-11-01T05:30:00Z")).toBe("2026-10-31"); // 1:30 AM EDT
    expect(businessDayKey("2026-11-01T06:30:00Z")).toBe("2026-10-31"); // 1:30 AM EST
    expect(businessDayKey("2026-11-01T09:00:00Z")).toBe("2026-11-01"); // 4:00 AM EST
  });
});

describe("calendar helpers", () => {
  it("steps a date-only key across a month boundary", () => {
    expect(addCalendarDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addCalendarDays("2026-08-01", -1)).toBe("2026-07-31");
  });

  it("steps across a DST date without drifting", () => {
    expect(addCalendarDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addCalendarDays("2026-11-01", -1)).toBe("2026-10-31");
  });

  it("counts whole calendar days between keys", () => {
    expect(calendarDaysBetween("2026-07-27", "2026-07-28")).toBe(1);
    expect(calendarDaysBetween("2026-07-25", "2026-07-28")).toBe(3);
    // Spanning a DST change — a naive /24h would be off by an hour's worth.
    expect(calendarDaysBetween("2026-03-07", "2026-03-09")).toBe(2);
    expect(calendarDaysBetween("2026-10-31", "2026-11-02")).toBe(2);
  });

  it("addDaysKey steps the BUSINESS day, not the instant", () => {
    // 1:52 AM Jul 29 is still Jul 28's night, so "tomorrow" is Jul 29.
    const now = new Date("2026-07-29T05:52:00Z");
    expect(businessDayKey(now)).toBe("2026-07-28");
    expect(addDaysKey(now, 1)).toBe("2026-07-29");
    expect(addDaysKey(now, -1)).toBe("2026-07-27");
  });
});

describe("tripDayKey — date-only values never shift", () => {
  it("uses trip_date as-is, without timezone conversion", () => {
    // Passing "2026-07-28" through `new Date()` would read it as midnight UTC
    // and shift it to Jul 27 in New York. It must not.
    const trip = makeTrip({ trip_date: "2026-07-28", start_time: null });
    expect(tripDayKey(trip)).toBe("2026-07-28");
  });

  it("does not shift a date-only value at any time of year", () => {
    for (const date of ["2026-01-15", "2026-03-08", "2026-07-28", "2026-11-01"]) {
      expect(tripDayKey(makeTrip({ trip_date: date, start_time: null }))).toBe(date);
    }
  });

  it("applies the rollover to a real pickup instant", () => {
    const trip = makeTrip({ trip_date: "2026-07-16", start_time: NY_1230AM_JUL16 });
    expect(tripDayKey(trip)).toBe("2026-07-15");
  });
});

/**
 * The reference moment for the Part B5 regression cases: 1:52 AM on Jul 29,
 * which is still Jul 28's business day.
 */
const NOW_0152 = new Date("2026-07-29T05:52:00Z");

describe("closeOutReason", () => {
  it("the current business day at 1:52 AM is the previous calendar date", () => {
    expect(businessDayKey(NOW_0152)).toBe("2026-07-28");
  });

  it("returns pickup_time_passed for an eligible ride whose pickup has passed", () => {
    const trip = makeTrip({
      status: "scheduled",
      start_time: "2026-07-29T03:00:00Z", // 11 PM Jul 28
    });
    expect(closeOutReason(trip, NOW_0152)).toEqual({ kind: "pickup_time_passed" });
  });

  it("returns null for a future pickup", () => {
    const trip = makeTrip({
      status: "scheduled",
      start_time: "2026-07-29T07:00:00Z", // 3 AM Jul 29, still ahead of 1:52
    });
    expect(closeOutReason(trip, NOW_0152)).toBeNull();
  });

  it("returns null for an untimed ride on the CURRENT business day", () => {
    const trip = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-28",
      start_time: null,
    });
    expect(closeOutReason(trip, NOW_0152)).toBeNull();
  });

  it("returns scheduled_day_passed for an untimed ride from the previous night", () => {
    const trip = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-27",
      start_time: null,
    });
    expect(closeOutReason(trip, NOW_0152)).toEqual({
      kind: "scheduled_day_passed",
      daysAgo: 1,
    });
  });

  it("counts multi-day overdue correctly", () => {
    const trip = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-25",
      start_time: null,
    });
    expect(closeOutReason(trip, NOW_0152)).toEqual({
      kind: "scheduled_day_passed",
      daysAgo: 3,
    });
  });

  it("returns null for every ineligible status", () => {
    const ineligible: TripStatus[] = ["completed", "canceled"];
    for (const status of ineligible) {
      expect(
        closeOutReason(
          makeTrip({ status, start_time: "2026-07-01T03:00:00Z" }),
          NOW_0152,
        ),
      ).toBeNull();
      expect(
        closeOutReason(
          makeTrip({ status, trip_date: "2026-07-01", start_time: null }),
          NOW_0152,
        ),
      ).toBeNull();
    }
  });

  it("an untimed ride can NEVER report pickup_time_passed", () => {
    for (const date of ["2026-07-01", "2026-07-27", "2026-07-28", "2026-08-30"]) {
      const reason = closeOutReason(
        makeTrip({ status: "scheduled", trip_date: date, start_time: null }),
        NOW_0152,
      );
      expect(reason?.kind).not.toBe("pickup_time_passed");
    }
  });
});

/**
 * isPastDue is derived from closeOutReason. This is the agreement test — the
 * same pattern used for customerActivity() vs inactiveCustomers().
 */
describe("isPastDue agrees with closeOutReason on every fixture", () => {
  const statuses: TripStatus[] = ["scheduled", "completed", "canceled"];

  const fixtures = [
    ...statuses.flatMap((status) => [
      // timed past
      makeTrip({ status, start_time: "2026-07-29T03:00:00Z" }),
      // timed future
      makeTrip({ status, start_time: "2026-07-29T20:00:00Z" }),
      // untimed current business day
      makeTrip({ status, trip_date: "2026-07-28", start_time: null }),
      // untimed previous business day
      makeTrip({ status, trip_date: "2026-07-27", start_time: null }),
      // untimed multi-day past
      makeTrip({ status, trip_date: "2026-07-20", start_time: null }),
    ]),
  ];

  it("covers timed, untimed and every status", () => {
    expect(fixtures).toHaveLength(15);
  });

  it("never disagrees", () => {
    for (const trip of fixtures) {
      const reason = closeOutReason(trip, NOW_0152);
      expect(isPastDue(trip, NOW_0152)).toBe(reason !== null);
    }
  });

  it("flags exactly the eligible overdue fixtures", () => {
    const overdue = fixtures.filter((t) => isPastDue(t, NOW_0152));
    // Only `scheduled`: timed-past, untimed-previous-day, untimed-multi-day.
    expect(overdue).toHaveLength(3);
    expect(overdue.every((t) => t.status === "scheduled")).toBe(true);
  });
});

describe("businessDayLabelParts", () => {
  // Current business day is Tuesday, July 28, 2026.
  const EVENING = new Date("2026-07-29T01:00:00Z"); // 9 PM Jul 28
  const MORNING = new Date("2026-07-28T14:00:00Z"); // 10 AM Jul 28

  it("labels the current business day 'today' before 5 PM", () => {
    const parts = businessDayLabelParts("2026-07-28", MORNING);
    expect(parts).toEqual({ relative: "today", dateLabel: "Tuesday, July 28" });
    expect(joinBusinessDayLabel(parts)).toBe("Today · Tuesday, July 28");
  });

  it("labels the current business day 'tonight' from 5 PM", () => {
    const parts = businessDayLabelParts("2026-07-28", EVENING);
    expect(parts).toEqual({ relative: "tonight", dateLabel: "Tuesday, July 28" });
    expect(joinBusinessDayLabel(parts)).toBe("Tonight · Tuesday, July 28");
  });

  it("labels the previous business day 'yesterday'", () => {
    const parts = businessDayLabelParts("2026-07-27", EVENING);
    expect(parts.relative).toBe("yesterday");
    expect(joinBusinessDayLabel(parts)).toBe("Yesterday · Monday, July 27");
  });

  it("labels the next business day 'tomorrow'", () => {
    const parts = businessDayLabelParts("2026-07-29", EVENING);
    expect(parts.relative).toBe("tomorrow");
    expect(joinBusinessDayLabel(parts)).toBe("Tomorrow · Wednesday, July 29");
  });

  it("gives a non-adjacent day the date alone", () => {
    const parts = businessDayLabelParts("2026-07-30", EVENING);
    expect(parts.relative).toBeNull();
    expect(joinBusinessDayLabel(parts)).toBe("Thursday, July 30");
  });

  it("returns parts, so a caller can use the relative word alone", () => {
    // The card headline needs just the word — no splitting on " · ".
    expect(businessDayLabelParts("2026-07-28", EVENING).relative).toBe("tonight");
  });

  it("does not shift the date label across timezones", () => {
    // Formatting a date-only key through a real timezone would render July 27.
    expect(businessDayLabelParts("2026-07-28", EVENING).dateLabel).toBe(
      "Tuesday, July 28",
    );
  });

  it("still labels correctly at 1:52 AM, when the day has not rolled over", () => {
    const parts = businessDayLabelParts("2026-07-28", NOW_0152);
    expect(joinBusinessDayLabel(parts)).toBe("Tonight · Tuesday, July 28");
  });
});

describe("grouping across midnight", () => {
  const NOW_EVENING = new Date("2026-07-29T01:00:00Z"); // 9 PM Jul 28

  it("puts an 11:30 PM and a 12:30 AM ride in the same current-day group", () => {
    const before = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-28",
      start_time: "2026-07-29T03:30:00Z", // 11:30 PM Jul 28
    });
    const after = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-29",
      start_time: "2026-07-29T04:30:00Z", // 12:30 AM Jul 29
    });
    const g = groupUpcomingTrips([after, before], NOW_EVENING);
    expect(g.today.map((t) => t.id)).toEqual([before.id, after.id]);
    expect(g.tomorrow).toEqual([]);
  });

  it("sorts chronologically by pickup instant across midnight", () => {
    const t1 = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-28",
      start_time: "2026-07-29T02:00:00Z", // 10 PM
    });
    const t2 = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-28",
      start_time: "2026-07-29T03:30:00Z", // 11:30 PM
    });
    const t3 = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-29",
      start_time: "2026-07-29T05:00:00Z", // 1 AM
    });
    const g = groupUpcomingTrips([t3, t1, t2], NOW_EVENING);
    expect(g.today.map((t) => t.id)).toEqual([t1.id, t2.id, t3.id]);
  });

  it("starts the next group at 4 AM, not midnight", () => {
    const nextDay = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-29",
      start_time: "2026-07-29T08:00:00Z", // 4 AM Jul 29 — new business day
    });
    const g = groupUpcomingTrips([nextDay], NOW_EVENING);
    expect(g.today).toEqual([]);
    expect(g.tomorrow.map((t) => t.id)).toEqual([nextDay.id]);
  });
});

/**
 * F1 Part B5 — the exact regression cases, at 2026-07-29 01:52 America/New_York
 * (current business day = 2026-07-28).
 */
describe("B5 regression — closeout card accuracy at 1:52 AM", () => {
  it("current-shift untimed ride is NOT overdue and reads 'Tonight · Tuesday, July 28'", () => {
    const trip = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-28",
      start_time: null,
      customer_id: "cust-1",
    });

    expect(isPastDue(trip, NOW_0152)).toBe(false);
    expect(closeOutReason(trip, NOW_0152)).toBeNull();

    const label = businessDayLabelParts(tripDayKey(trip), NOW_0152);
    expect(joinBusinessDayLabel(label)).toBe("Tonight · Tuesday, July 28");
  });

  it("previous-shift untimed ride is overdue, headlined by customer, dated 'Yesterday · Monday, July 27'", () => {
    const trip = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-27",
      start_time: null,
      customer_id: "cust-jojo",
    });

    expect(isPastDue(trip, NOW_0152)).toBe(true);

    const reason = closeOutReason(trip, NOW_0152);
    expect(reason).toEqual({ kind: "scheduled_day_passed", daysAgo: 1 });

    const label = businessDayLabelParts(tripDayKey(trip), NOW_0152);
    expect(joinBusinessDayLabel(label)).toBe("Yesterday · Monday, July 27");

    // Headline is the customer, never a missing-field message.
    expect(nextRideHeadline("Jojo Henderson", label)).toBe("Jojo Henderson");

    // The copy states the real reason and never claims a pickup time passed.
    const copy = reason ? closeOutCopy(reason) : "";
    expect(copy).toBe("Scheduled for yesterday — still open");
    expect(copy).not.toContain("Pickup time has passed");
  });

  it("timed overdue ride reads 'Pickup time has passed — still open'", () => {
    const trip = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-28",
      start_time: "2026-07-29T03:00:00Z", // 11 PM Jul 28, before 1:52 AM
    });
    const reason = closeOutReason(trip, NOW_0152);
    expect(reason).toEqual({ kind: "pickup_time_passed" });
    expect(reason ? closeOutCopy(reason) : "").toBe(
      "Pickup time has passed — still open",
    );
  });

  it("multi-day overdue uses the real count, not a hard-coded 'yesterday'", () => {
    const trip = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-25",
      start_time: null,
    });
    const reason = closeOutReason(trip, NOW_0152);
    expect(reason ? closeOutCopy(reason) : "").toBe(
      "Scheduled 3 days ago — still open",
    );
  });

  it("no user-facing copy says 'business days'", () => {
    // It reads as "weekdays excluding weekends"; this operator works weekends.
    const samples = [
      closeOutCopy({ kind: "pickup_time_passed" }),
      closeOutCopy({ kind: "scheduled_day_passed", daysAgo: 1 }),
      closeOutCopy({ kind: "scheduled_day_passed", daysAgo: 5 }),
    ];
    for (const copy of samples) {
      expect(copy.toLowerCase()).not.toContain("business day");
    }
  });

  it("headline falls back to the day, never to a missing-field message", () => {
    const label = businessDayLabelParts("2026-07-27", NOW_0152);
    expect(nextRideHeadline(null, label)).toBe("Yesterday");
    expect(nextRideHeadline("   ", label)).toBe("Yesterday");
    expect(nextRideHeadline(undefined, label)).toBe("Yesterday");
    // Non-adjacent day falls back to the formatted date, not a raw key.
    const far = businessDayLabelParts("2026-07-20", NOW_0152);
    expect(nextRideHeadline(null, far)).toBe("Monday, July 20");
  });
});
