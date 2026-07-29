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
import {
  businessDayKey,
  businessDayLabelParts,
  joinBusinessDayLabel,
  tripDayKey,
} from "./schedule";

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
  it("labels the business day, not the calendar date", () => {
    // 03:30 UTC Jul 16 is 11:30 PM Jul 15 in New York — still Jul 15's night.
    // (F2 changed the intent here from "business-LOCAL day" to "business day";
    // this instant gives the same answer under both, so the assertion below is
    // tightened to a full-string match and the 4 AM cases are covered in the
    // dedicated F2 suite.)
    expect(businessDateLabel(new Date("2026-07-16T03:30:00Z"))).toBe(
      "Wednesday, July 15",
    );
  });
});

/**
 * F2 — the dashboard header date must speak the same language as the rest of
 * the screen. At 1:52 AM the header used to read "Wednesday, July 29" beside a
 * greeting of "Good evening" and a card reading "Tonight · Tuesday, July 28".
 */
describe("F2 — dashboard header date", () => {
  const AT_0152 = new Date("2026-07-29T05:52:00Z"); // 1:52 AM Wed Jul 29 NY
  const AT_1000 = new Date("2026-07-29T14:00:00Z"); // 10:00 AM Wed Jul 29 NY
  const AT_0359 = new Date("2026-07-29T07:59:00Z"); // 3:59 AM Wed Jul 29 NY
  const AT_0400 = new Date("2026-07-29T08:00:00Z"); // 4:00 AM Wed Jul 29 NY

  it("reads the previous calendar date at 1:52 AM, because the night is not over", () => {
    expect(businessDateLabel(AT_0152)).toBe("Tuesday, July 28");
  });

  it("reads the current calendar date once the day has rolled over", () => {
    expect(businessDateLabel(AT_1000)).toBe("Wednesday, July 29");
  });

  it("flips at exactly 4:00 AM", () => {
    expect(businessDateLabel(AT_0359)).toBe("Tuesday, July 28");
    expect(businessDateLabel(AT_0400)).toBe("Wednesday, July 29");
  });

  it("never renders a relative word — the greeting beside it already says that", () => {
    for (const now of [AT_0152, AT_1000, AT_0359, AT_0400]) {
      const label = businessDateLabel(now).toLowerCase();
      for (const word of ["today", "tonight", "tomorrow", "yesterday", "·"]) {
        expect(label).not.toContain(word);
      }
    }
  });

  it("is the business-day formatter's output, not a string built in the header", () => {
    // Fails if calendar-date formatting is ever reintroduced here: this asserts
    // the header IS the shared formatter rather than matching a hard-coded
    // literal that a second date path could also happen to produce.
    for (const now of [AT_0152, AT_1000, AT_0359, AT_0400]) {
      expect(businessDateLabel(now)).toBe(
        businessDayLabelParts(businessDayKey(now), now).dateLabel,
      );
    }
  });

  it("agrees with the greeting, Tonight's Flow, and the Next Ride card at 1:52 AM", () => {
    const currentKey = businessDayKey(AT_0152);
    expect(currentKey).toBe("2026-07-28");

    // A ride on the current business night.
    const ride = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-28",
      start_time: "2026-07-29T06:30:00Z", // 2:30 AM Jul 29 — same night
    });

    // Header.
    const header = businessDateLabel(AT_0152);

    // Greeting — still the evening shift.
    expect(greetingFor(AT_0152)).toBe("Good evening");

    // Tonight's Flow includes the ride, i.e. it agrees on which day this is.
    const flow = todaysFlow([ride], AT_0152);
    expect(flow.map((f) => f.trip.id)).toEqual([ride.id]);

    // Next Ride card's day label for that same ride.
    const cardLabel = businessDayLabelParts(tripDayKey(ride), AT_0152);

    // The three do not disagree: one business day, one date.
    expect(header).toBe("Tuesday, July 28");
    expect(cardLabel.dateLabel).toBe(header);
    expect(joinBusinessDayLabel(cardLabel)).toBe("Tonight · Tuesday, July 28");
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

  it("keeps the whole working night in one flow: 11:30pm and 12:30am together", () => {
    // F1 strengthened this. It used to assert only that an 11:30 PM ride stayed
    // on today. With the 4 AM rollover the stronger, true claim is that the ride
    // AFTER midnight is part of the same night and appears in the same flow,
    // while the next evening's ride does not.
    const lateNight = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-15",
      start_time: "2026-07-16T03:30:00Z", // 11:30 PM EDT Jul 15
    });
    const afterMidnight = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-16",
      start_time: "2026-07-16T04:30:00Z", // 12:30 AM EDT Jul 16
    });
    const nextEvening = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-16",
      start_time: "2026-07-16T23:00:00Z", // 7 PM EDT Jul 16 — next business day
    });
    const flow = todaysFlow([lateNight, afterMidnight, nextEvening], NOW);
    expect(flow.map((f) => f.trip.id)).toEqual([lateNight.id, afterMidnight.id]);
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

/**
 * F1 — greeting boundaries follow the working night, not the calendar.
 * Every instant is an explicit UTC literal with its New York time noted.
 */
describe("greetingFor — F1 business-night boundaries", () => {
  const cases: { utc: string; ny: string; expected: string }[] = [
    { utc: "2026-07-16T07:59:00Z", ny: "3:59 AM", expected: "Good evening" },
    { utc: "2026-07-16T08:00:00Z", ny: "4:00 AM", expected: "Good morning" },
    { utc: "2026-07-16T15:59:00Z", ny: "11:59 AM", expected: "Good morning" },
    { utc: "2026-07-16T16:00:00Z", ny: "12:00 PM", expected: "Good afternoon" },
    { utc: "2026-07-16T20:59:00Z", ny: "4:59 PM", expected: "Good afternoon" },
    { utc: "2026-07-16T21:00:00Z", ny: "5:00 PM", expected: "Good evening" },
  ];

  for (const { utc, ny, expected } of cases) {
    it(`${ny} New York -> "${expected}"`, () => {
      expect(greetingFor(new Date(utc))).toBe(expected);
    });
  }

  it("greets the operator working at 1:52 AM with 'Good evening'", () => {
    // He is still on the previous evening's shift; "Good morning" was wrong.
    expect(greetingFor(new Date("2026-07-29T05:52:00Z"))).toBe("Good evening");
  });

  it("holds in EST as well as EDT (wall-clock, not a fixed offset)", () => {
    expect(greetingFor(new Date("2026-01-16T08:59:00Z"))).toBe("Good evening"); // 3:59 AM
    expect(greetingFor(new Date("2026-01-16T09:00:00Z"))).toBe("Good morning"); // 4:00 AM
  });
});

/**
 * F1 Part B — the Next Ride card must carry the REASON a ride is still open,
 * so the card never re-infers it or shows the wrong sentence.
 */
describe("selectNextRide — closeout reason", () => {
  const NOW_0152 = new Date("2026-07-29T05:52:00Z"); // 1:52 AM Jul 29 -> Jul 28

  it("carries pickup_time_passed for a timed overdue ride", () => {
    const trip = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-28",
      start_time: "2026-07-29T03:00:00Z", // 11 PM Jul 28
    });
    const view = selectNextRide([trip], NOW_0152);
    expect(view.kind).toBe("needs_closing_out");
    if (view.kind === "needs_closing_out") {
      expect(view.reason).toEqual({ kind: "pickup_time_passed" });
    }
  });

  it("carries scheduled_day_passed with daysAgo for an untimed previous-night ride", () => {
    const trip = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-27",
      start_time: null,
    });
    const view = selectNextRide([trip], NOW_0152);
    expect(view.kind).toBe("needs_closing_out");
    if (view.kind === "needs_closing_out") {
      expect(view.reason).toEqual({ kind: "scheduled_day_passed", daysAgo: 1 });
    }
  });

  it("does NOT flag an untimed ride on the current business night", () => {
    const trip = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-28",
      start_time: null,
    });
    const view = selectNextRide([trip], NOW_0152);
    expect(view.kind).toBe("upcoming");
  });
});
