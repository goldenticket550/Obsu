import { describe, expect, it } from "vitest";
import { makeTrip } from "./__factories";
import {
  addDaysKey,
  bookedSummary,
  businessDayKey,
  groupUpcomingTrips,
  isPastDue,
  tripDayKey,
} from "./schedule";

/** 2026-07-15T18:00Z = 2:00 PM EDT on Tue Jul 15 in New York. */
const NOW = new Date("2026-07-15T18:00:00Z");

describe("businessDayKey", () => {
  it("uses the New York calendar day, not the UTC one", () => {
    // 03:30 UTC on Jul 16 is still 11:30 PM on Jul 15 in New York.
    expect(businessDayKey("2026-07-16T03:30:00Z")).toBe("2026-07-15");
  });

  it("handles the winter offset too", () => {
    expect(businessDayKey("2026-01-16T04:30:00Z")).toBe("2026-01-15");
  });

  it("returns empty string for an unparseable value", () => {
    expect(businessDayKey("nope")).toBe("");
  });
});

describe("addDaysKey", () => {
  it("returns tomorrow's New York day key", () => {
    expect(addDaysKey(NOW, 1)).toBe("2026-07-16");
  });
});

describe("tripDayKey", () => {
  it("prefers the pickup timestamp when one is set", () => {
    const trip = makeTrip({
      trip_date: "2026-07-20",
      start_time: "2026-07-16T03:30:00Z", // 11:30 PM Jul 15 in NY
    });
    expect(tripDayKey(trip)).toBe("2026-07-15");
  });

  it("falls back to trip_date when there is no pickup time", () => {
    expect(tripDayKey(makeTrip({ trip_date: "2026-07-20", start_time: null }))).toBe(
      "2026-07-20",
    );
  });
});

describe("isPastDue", () => {
  it("is true when the pickup time has passed", () => {
    expect(
      isPastDue(makeTrip({ start_time: "2026-07-15T16:00:00Z" }), NOW),
    ).toBe(true);
  });

  it("is false for a pickup later today", () => {
    expect(
      isPastDue(makeTrip({ start_time: "2026-07-15T23:00:00Z" }), NOW),
    ).toBe(false);
  });

  it("is true for a ride dated before today with no pickup time", () => {
    expect(
      isPastDue(makeTrip({ trip_date: "2026-07-14", start_time: null }), NOW),
    ).toBe(true);
  });

  it("is FALSE for a ride dated today with no pickup time (still upcoming)", () => {
    // No time was set, so we cannot claim it was missed just because it is 2pm.
    expect(
      isPastDue(makeTrip({ trip_date: "2026-07-15", start_time: null }), NOW),
    ).toBe(false);
  });
});

describe("groupUpcomingTrips", () => {
  it("buckets into today, tomorrow and later", () => {
    const today = makeTrip({ status: "scheduled", trip_date: "2026-07-15" });
    const tomorrow = makeTrip({ status: "scheduled", trip_date: "2026-07-16" });
    const later = makeTrip({ status: "scheduled", trip_date: "2026-07-20" });

    const g = groupUpcomingTrips([later, tomorrow, today], NOW);
    expect(g.today.map((t) => t.id)).toEqual([today.id]);
    expect(g.tomorrow.map((t) => t.id)).toEqual([tomorrow.id]);
    expect(g.later.map((t) => t.id)).toEqual([later.id]);
  });

  it("keeps an 11:30pm pickup on TODAY rather than pushing it to tomorrow", () => {
    // The whole reason day bucketing is timezone-aware.
    const lateNight = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-15",
      start_time: "2026-07-16T03:30:00Z",
    });
    const g = groupUpcomingTrips([lateNight], NOW);
    expect(g.today.map((t) => t.id)).toEqual([lateNight.id]);
    expect(g.tomorrow).toEqual([]);
  });

  it("surfaces past-due scheduled rides as needs-closing-out", () => {
    const overdue = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-14",
      start_time: "2026-07-14T20:00:00Z",
    });
    const g = groupUpcomingTrips([overdue], NOW);
    expect(g.needsClosingOut.map((t) => t.id)).toEqual([overdue.id]);
    expect(g.today).toEqual([]);
  });

  it("orders needs-closing-out oldest first", () => {
    const older = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-10",
      start_time: "2026-07-10T20:00:00Z",
    });
    const newer = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-14",
      start_time: "2026-07-14T20:00:00Z",
    });
    const g = groupUpcomingTrips([newer, older], NOW);
    expect(g.needsClosingOut.map((t) => t.id)).toEqual([older.id, newer.id]);
  });

  it("orders each day soonest first, with unscheduled-time rides last", () => {
    const at7pm = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-16",
      start_time: "2026-07-16T23:00:00Z",
    });
    const at3pm = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-16",
      start_time: "2026-07-16T19:00:00Z",
    });
    const noTime = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-16",
      start_time: null,
    });

    const g = groupUpcomingTrips([noTime, at7pm, at3pm], NOW);
    expect(g.tomorrow.map((t) => t.id)).toEqual([at3pm.id, at7pm.id, noTime.id]);
  });

  it("ignores completed and canceled trips entirely", () => {
    const trips = [
      makeTrip({ status: "completed", trip_date: "2026-07-15" }),
      makeTrip({ status: "canceled", trip_date: "2026-07-15" }),
    ];
    const g = groupUpcomingTrips(trips, NOW);
    expect(g.today).toEqual([]);
    expect(g.needsClosingOut).toEqual([]);
    expect(g.tomorrow).toEqual([]);
    expect(g.later).toEqual([]);
  });

  it("returns empty groups for no trips", () => {
    const g = groupUpcomingTrips([], NOW);
    expect(g).toEqual({
      needsClosingOut: [],
      today: [],
      tomorrow: [],
      later: [],
    });
  });
});

describe("bookedSummary", () => {
  it("reports unpriced rides as a count and never sums them as zero", () => {
    const trips = [
      makeTrip({ status: "scheduled", revenue_cents: 24000 }),
      makeTrip({ status: "scheduled", revenue_cents: 0 }), // no price set
      makeTrip({ status: "scheduled", revenue_cents: 18000 }),
    ];
    const summary = bookedSummary(trips);
    expect(summary.tripCount).toBe(3);
    expect(summary.quotedTotalCents).toBe(42000); // only the two priced rides
    expect(summary.unpricedCount).toBe(1);
  });

  it("does not let an unpriced ride drag a quoted total down", () => {
    // The quoted total describes the priced rides only — it is not an average
    // and must not imply the unpriced ride is worth nothing.
    const priced = bookedSummary([
      makeTrip({ status: "scheduled", revenue_cents: 24000 }),
    ]);
    const withUnpriced = bookedSummary([
      makeTrip({ status: "scheduled", revenue_cents: 24000 }),
      makeTrip({ status: "scheduled", revenue_cents: 0 }),
    ]);
    expect(withUnpriced.quotedTotalCents).toBe(priced.quotedTotalCents);
    expect(withUnpriced.unpricedCount).toBe(1);
  });

  it("excludes completed and canceled rides from the forward-looking book", () => {
    const trips = [
      makeTrip({ status: "completed", revenue_cents: 99000 }),
      makeTrip({ status: "canceled", revenue_cents: 99000 }),
      makeTrip({ status: "scheduled", revenue_cents: 24000 }),
    ];
    const summary = bookedSummary(trips);
    expect(summary.tripCount).toBe(1);
    expect(summary.quotedTotalCents).toBe(24000);
  });

  it("is all zeros with nothing booked", () => {
    expect(bookedSummary([])).toEqual({
      tripCount: 0,
      quotedTotalCents: 0,
      unpricedCount: 0,
    });
  });
});
