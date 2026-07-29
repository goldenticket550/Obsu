import { describe, expect, it } from "vitest";
import { makeTrip } from "./__factories";
import {
  businessDateLabel,
  greetingFor,
  msUntilPickup,
  operationalSummary,
  selectNextRide,
  shortRideId,
  timeUntilLabel,
  todaysFlow,
} from "./command-center";

/** 2026-07-15T18:00Z = 2:00 PM EDT on Wed Jul 15 in New York. */
const NOW = new Date("2026-07-15T18:00:00Z");

describe("shortRideId", () => {
  it("shortens the real row id rather than inventing a number", () => {
    expect(shortRideId("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe("#A1B2C3");
  });
});

describe("timeUntilLabel", () => {
  it("reads 'now' at or past the pickup", () => {
    expect(timeUntilLabel(0)).toBe("now");
    expect(timeUntilLabel(-5 * 60_000)).toBe("now");
  });
  it("uses minutes under an hour", () => {
    expect(timeUntilLabel(45 * 60_000)).toBe("in 45m");
  });
  it("uses hours and minutes under a day", () => {
    expect(timeUntilLabel(2 * 3_600_000 + 15 * 60_000)).toBe("in 2h 15m");
    expect(timeUntilLabel(3 * 3_600_000)).toBe("in 3h");
  });
  it("uses days beyond that", () => {
    expect(timeUntilLabel(48 * 3_600_000)).toBe("in 2 days");
  });
});

describe("msUntilPickup", () => {
  it("is null when no pickup time is set", () => {
    expect(msUntilPickup(makeTrip({ start_time: null }), NOW)).toBeNull();
  });
  it("measures forward to the pickup", () => {
    const trip = makeTrip({ start_time: "2026-07-15T19:00:00Z" });
    expect(msUntilPickup(trip, NOW)).toBe(3_600_000);
  });
});

describe("selectNextRide", () => {
  it("returns 'none' with nothing scheduled", () => {
    expect(selectNextRide([], NOW)).toEqual({ kind: "none" });
    const onlyCompleted = [makeTrip({ status: "completed" })];
    expect(selectNextRide(onlyCompleted, NOW).kind).toBe("none");
  });

  it("picks the soonest scheduled ride today", () => {
    const later = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-15",
      start_time: "2026-07-15T23:00:00Z",
    });
    const sooner = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-15",
      start_time: "2026-07-15T20:00:00Z",
    });
    const view = selectNextRide([later, sooner], NOW);
    expect(view.kind).toBe("upcoming");
    if (view.kind === "upcoming") {
      expect(view.trip.id).toBe(sooner.id);
      expect(view.sameDay).toBe(true);
      expect(view.msUntil).toBe(2 * 3_600_000);
    }
  });

  it("reports 'no more rides today' as an upcoming ride on another day", () => {
    const tomorrow = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-16",
      start_time: "2026-07-16T19:00:00Z",
    });
    const view = selectNextRide([tomorrow], NOW);
    expect(view.kind).toBe("upcoming");
    if (view.kind === "upcoming") expect(view.sameDay).toBe(false);
  });

  it("puts a past-due open ride ahead of everything else", () => {
    const overdue = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-14",
      start_time: "2026-07-14T20:00:00Z",
    });
    const upcoming = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-15",
      start_time: "2026-07-15T22:00:00Z",
    });
    const view = selectNextRide([upcoming, overdue], NOW);
    expect(view.kind).toBe("needs_closing_out");
    if (view.kind === "needs_closing_out") expect(view.trip.id).toBe(overdue.id);
  });

  it("ignores canceled rides", () => {
    const canceled = makeTrip({ status: "canceled", trip_date: "2026-07-15" });
    expect(selectNextRide([canceled], NOW).kind).toBe("none");
  });
});

describe("greetingFor", () => {
  it("greets by the business day's hour, not the viewer's", () => {
    expect(greetingFor(new Date("2026-07-15T13:00:00Z"))).toBe("Good morning"); // 9am ET
    expect(greetingFor(new Date("2026-07-15T18:00:00Z"))).toBe("Good afternoon"); // 2pm ET
    expect(greetingFor(new Date("2026-07-16T01:00:00Z"))).toBe("Good evening"); // 9pm ET
  });
});

describe("businessDateLabel", () => {
  it("labels the business-local day", () => {
    // 03:30 UTC Jul 16 is still Jul 15 in New York.
    expect(businessDateLabel(new Date("2026-07-16T03:30:00Z"))).toContain("July 15");
  });
});

describe("operationalSummary", () => {
  it("says nothing is scheduled when nothing is", () => {
    expect(operationalSummary([], NOW)).toBe("Nothing scheduled");
  });

  it("counts today's rides and names the next pickup", () => {
    const trips = [
      makeTrip({
        status: "scheduled",
        trip_date: "2026-07-15",
        start_time: "2026-07-15T23:05:00Z",
      }),
      makeTrip({
        status: "scheduled",
        trip_date: "2026-07-15",
        start_time: "2026-07-16T00:30:00Z",
      }),
    ];
    const summary = operationalSummary(trips, NOW);
    expect(summary).toContain("2 rides scheduled today");
    expect(summary).toContain("next pickup 7:05 PM");
  });

  it("reports when nothing is left today but work exists later", () => {
    const trips = [makeTrip({ status: "scheduled", trip_date: "2026-07-18" })];
    expect(operationalSummary(trips, NOW)).toBe("No rides left today");
  });

  it("surfaces rides that need closing out", () => {
    const trips = [
      makeTrip({
        status: "scheduled",
        trip_date: "2026-07-14",
        start_time: "2026-07-14T20:00:00Z",
      }),
    ];
    expect(operationalSummary(trips, NOW)).toContain("1 ride needs closing out");
  });

  it("makes no claim about weather, traffic, or readiness", () => {
    const summary = operationalSummary([], NOW).toLowerCase();
    for (const banned of ["weather", "traffic", "systems", "ready", "all clear"]) {
      expect(summary).not.toContain(banned);
    }
  });
});

describe("todaysFlow", () => {
  it("is empty when nothing happened or is planned today", () => {
    expect(todaysFlow([], NOW)).toEqual([]);
  });

  it("orders the day by pickup time, completed and scheduled together", () => {
    const morning = makeTrip({
      status: "completed",
      trip_date: "2026-07-15",
      start_time: "2026-07-15T14:00:00Z", // 10am ET
    });
    const evening = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-15",
      start_time: "2026-07-15T23:00:00Z", // 7pm ET
    });
    const midday = makeTrip({
      status: "completed",
      trip_date: "2026-07-15",
      start_time: "2026-07-15T16:00:00Z", // noon ET
    });

    const flow = todaysFlow([evening, morning, midday], NOW);
    expect(flow.map((f) => f.trip.id)).toEqual([morning.id, midday.id, evening.id]);
    expect(flow.map((f) => f.kind)).toEqual(["completed", "completed", "scheduled"]);
  });

  it("keeps an 11:30pm ride on today across the midnight boundary", () => {
    // 03:30 UTC Jul 16 = 11:30 PM Jul 15 in New York — same business day.
    const lateNight = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-15",
      start_time: "2026-07-16T03:30:00Z",
    });
    const tomorrow = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-16",
      start_time: "2026-07-16T19:00:00Z",
    });
    const flow = todaysFlow([lateNight, tomorrow], NOW);
    expect(flow.map((f) => f.trip.id)).toEqual([lateNight.id]);
  });

  it("excludes canceled rides", () => {
    const canceled = makeTrip({ status: "canceled", trip_date: "2026-07-15" });
    expect(todaysFlow([canceled], NOW)).toEqual([]);
  });

  it("marks exactly one entry as the next ride", () => {
    const done = makeTrip({
      status: "completed",
      trip_date: "2026-07-15",
      start_time: "2026-07-15T14:00:00Z",
    });
    const next = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-15",
      start_time: "2026-07-15T23:00:00Z",
    });
    const flow = todaysFlow([done, next], NOW);
    expect(flow.filter((f) => f.isNext).map((f) => f.trip.id)).toEqual([next.id]);
  });

  it("orders rides without a pickup time deterministically after timed ones", () => {
    const timed = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-15",
      start_time: "2026-07-15T23:00:00Z",
    });
    const untimedB = makeTrip({
      status: "completed",
      trip_date: "2026-07-15",
      start_time: null,
      created_at: "2026-07-15T12:00:00Z",
    });
    const untimedA = makeTrip({
      status: "completed",
      trip_date: "2026-07-15",
      start_time: null,
      created_at: "2026-07-15T09:00:00Z",
    });
    const flow = todaysFlow([untimedB, timed, untimedA], NOW);
    expect(flow.map((f) => f.trip.id)).toEqual([timed.id, untimedA.id, untimedB.id]);
  });
});
