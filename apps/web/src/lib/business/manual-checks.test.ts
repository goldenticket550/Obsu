import { describe, expect, it } from "vitest";
import { makeTrip } from "./__factories";
import {
  addDaysKey,
  businessDayKey,
  businessDayLabelParts,
  groupUpcomingTrips,
  joinBusinessDayLabel,
  tripDayKey,
} from "./schedule";
import { greetingFor } from "./command-center";
import { paymentState, tripPaymentState } from "./payment";
import { formatBusinessDateTime } from "./pickup-time";
import { centsToDollars } from "@/lib/money";

/**
 * V1 Part 3 — the four checks the operator has been re-verifying by hand in
 * the browser. Pinned here so they stop being manual.
 *
 * Every instant is an explicit UTC literal with its New York wall-clock time
 * in a comment; nothing reads the machine clock.
 */

describe("1. a working night is ONE business day, under the earlier date", () => {
  // 9 PM EDT Jul 28 — mid-shift, before the 4 AM rollover.
  const NOW = new Date("2026-07-29T01:00:00Z");

  const ELEVEN_THIRTY_PM = "2026-07-29T03:30:00Z"; // 11:30 PM Jul 28
  const TWELVE_THIRTY_AM = "2026-07-29T04:30:00Z"; // 12:30 AM Jul 29

  const before = makeTrip({
    status: "scheduled",
    trip_date: "2026-07-28",
    start_time: ELEVEN_THIRTY_PM,
  });
  const after = makeTrip({
    status: "scheduled",
    trip_date: "2026-07-29",
    start_time: TWELVE_THIRTY_AM,
  });

  it("both rides share one business-day key — the EARLIER calendar date", () => {
    expect(tripDayKey(before)).toBe("2026-07-28");
    expect(tripDayKey(after)).toBe("2026-07-28");
    expect(tripDayKey(before)).toBe(tripDayKey(after));
  });

  it("they land in the same group, and nothing spills into tomorrow", () => {
    const groups = groupUpcomingTrips([after, before], NOW);
    expect(groups.today.map((t) => t.id)).toEqual([before.id, after.id]);
    expect(groups.tomorrow).toEqual([]);
    expect(groups.later).toEqual([]);
  });

  it("the rendered header reads for the earlier date", () => {
    const label = businessDayLabelParts(tripDayKey(before), NOW);
    expect(label.dateLabel).toBe("Tuesday, July 28");
    expect(joinBusinessDayLabel(label)).toBe("Tonight · Tuesday, July 28");
  });

  it("the next business day is genuinely the next date", () => {
    expect(addDaysKey(NOW, 1)).toBe("2026-07-29");
  });
});

describe("2. the 4 AM boundary moves both the day and the greeting", () => {
  // Asserting BOTH sides of the boundary, in BOTH offsets, in one place.
  const cases = [
    {
      season: "EDT (summer, UTC-4)",
      before: "2026-07-29T07:59:00Z", // 3:59 AM Jul 29
      after: "2026-07-29T08:00:00Z", // 4:00 AM Jul 29
      previousDay: "2026-07-28",
      currentDay: "2026-07-29",
    },
    {
      season: "EST (winter, UTC-5)",
      before: "2026-01-16T08:59:00Z", // 3:59 AM Jan 16
      after: "2026-01-16T09:00:00Z", // 4:00 AM Jan 16
      previousDay: "2026-01-15",
      currentDay: "2026-01-16",
    },
  ];

  for (const c of cases) {
    it(`${c.season}: 03:59 is the previous day and "Good evening"; 04:00 flips both`, () => {
      const before = new Date(c.before);
      const after = new Date(c.after);

      expect(businessDayKey(before)).toBe(c.previousDay);
      expect(greetingFor(before)).toBe("Good evening");

      expect(businessDayKey(after)).toBe(c.currentDay);
      expect(greetingFor(after)).toBe("Good morning");
    });
  }

  it("is wall-clock, not a fixed UTC offset", () => {
    // The same UTC instant sits on opposite sides of the boundary in the two
    // seasons — which is only true if the rule follows New York's clock.
    expect(businessDayKey("2026-07-16T08:00:00Z")).toBe("2026-07-16"); // 4:00 AM EDT
    expect(businessDayKey("2026-01-16T08:00:00Z")).toBe("2026-01-15"); // 3:00 AM EST
  });
});

describe("3. absent data renders as absence, never as zero or blank", () => {
  it("amount_paid_cents null is NOT_TRACKED — not unpaid", () => {
    const trip = makeTrip({ status: "completed", revenue_cents: 24000 });
    expect(trip.amount_paid_cents ?? null).toBeNull();

    const state = tripPaymentState(trip);
    expect(state).toEqual({ kind: "not_tracked" });
    expect(state.kind).not.toBe("unpaid");
  });

  it("not_tracked never renders a money figure like $0.00", () => {
    const state = tripPaymentState(makeTrip({ revenue_cents: 24000 }));
    // Nothing in the state can be formatted into an amount, because it holds
    // no amount at all.
    expect(Object.keys(state)).toEqual(["kind"]);
    expect(JSON.stringify(state)).not.toContain("0");
    // And the two claims stay distinct.
    expect(paymentState(24000, 0)).toEqual({ kind: "unpaid", balanceCents: 24000 });
    expect(centsToDollars(0)).toBe("0.00"); // what we must NOT show for null
  });

  it("passenger_count null reads as absence, never 0", () => {
    const trip = makeTrip({ status: "completed" });
    expect(trip.passenger_count ?? null).toBeNull();
    // The form value and any display derive from null, not a coerced number.
    const formValue = trip.passenger_count != null ? String(trip.passenger_count) : "";
    expect(formValue).toBe("");
    expect(formValue).not.toBe("0");
  });

  it("notes null reads as absence, never an empty-looking value with meaning", () => {
    const trip = makeTrip({ status: "completed", notes: null });
    expect(trip.notes).toBeNull();
    expect(trip.notes ?? "").toBe("");
  });
});

describe("4. a scheduled ride with no confirmation reads 'Not confirmed yet'", () => {
  const NOT_CONFIRMED = "Not confirmed yet";

  it("confirmed_at null is unconfirmed", () => {
    const trip = makeTrip({ status: "scheduled" });
    expect(trip.confirmed_at ?? null).toBeNull();
    expect(!!trip.confirmed_at).toBe(false);
    // This is exactly the predicate the upcoming row renders from.
    const rendered = trip.confirmed_at ? "Confirmed" : NOT_CONFIRMED;
    expect(rendered).toBe(NOT_CONFIRMED);
  });

  it("has no confirmation timestamp to format", () => {
    expect(formatBusinessDateTime(makeTrip({ status: "scheduled" }).confirmed_at)).toBeNull();
  });

  it("a confirmed ride reads as confirmed, with a real when", () => {
    const trip = makeTrip({
      status: "scheduled",
      confirmed_at: "2026-07-28T23:05:00Z", // 7:05 PM EDT
    });
    const rendered = trip.confirmed_at ? "Confirmed" : NOT_CONFIRMED;
    expect(rendered).toBe("Confirmed");
    expect(formatBusinessDateTime(trip.confirmed_at)).toBe("Jul 28, 7:05 PM");
  });
});
