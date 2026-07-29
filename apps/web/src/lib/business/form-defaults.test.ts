import { describe, expect, it } from "vitest";
import { makeCustomer, makeTrip } from "./__factories";
import {
  RECENT_CUSTOMER_LIMIT,
  mostCommonPaymentMethod,
  mostCommonTripType,
  recentCustomers,
} from "./form-defaults";

/**
 * U5 — defaults are earned from the org's own completed rides. The rule under
 * test throughout: where there is no history, there is NO default.
 */

describe("mostCommonTripType", () => {
  it("has no default with no history at all", () => {
    expect(mostCommonTripType([])).toBeNull();
  });

  it("has no default when no completed ride carries a trip type", () => {
    const trips = [
      makeTrip({ status: "completed", trip_type: null }),
      makeTrip({ status: "completed", trip_type: null }),
    ];
    expect(mostCommonTripType(trips)).toBeNull();
  });

  it("picks the most frequent type from completed rides", () => {
    const trips = [
      makeTrip({ status: "completed", trip_type: "airport", trip_date: "2026-07-01" }),
      makeTrip({ status: "completed", trip_type: "airport", trip_date: "2026-07-02" }),
      makeTrip({ status: "completed", trip_type: "nightlife", trip_date: "2026-07-03" }),
    ];
    expect(mostCommonTripType(trips)).toBe("airport");
  });

  it("ignores scheduled and canceled rides — they are not evidence", () => {
    const trips = [
      makeTrip({ status: "completed", trip_type: "airport", trip_date: "2026-07-01" }),
      makeTrip({ status: "scheduled", trip_type: "prom", trip_date: "2026-07-02" }),
      makeTrip({ status: "scheduled", trip_type: "prom", trip_date: "2026-07-03" }),
      makeTrip({ status: "canceled", trip_type: "prom", trip_date: "2026-07-04" }),
    ];
    expect(mostCommonTripType(trips)).toBe("airport");
  });

  it("breaks a tie by the MOST RECENT completed ride", () => {
    // One "airport" and one "event". The newer ride is the event, so that wins.
    const trips = [
      makeTrip({ status: "completed", trip_type: "airport", trip_date: "2026-07-01" }),
      makeTrip({ status: "completed", trip_type: "event", trip_date: "2026-07-09" }),
    ];
    expect(mostCommonTripType(trips)).toBe("event");
  });

  it("breaks a same-day tie by which ride was recorded most recently", () => {
    const trips = [
      makeTrip({
        status: "completed",
        trip_type: "airport",
        trip_date: "2026-07-09",
        created_at: "2026-07-09T10:00:00Z",
      }),
      makeTrip({
        status: "completed",
        trip_type: "event",
        trip_date: "2026-07-09",
        created_at: "2026-07-09T18:00:00Z",
      }),
    ];
    expect(mostCommonTripType(trips)).toBe("event");
  });

  it("frequency still beats recency when it is not a tie", () => {
    const trips = [
      makeTrip({ status: "completed", trip_type: "airport", trip_date: "2026-07-01" }),
      makeTrip({ status: "completed", trip_type: "airport", trip_date: "2026-07-02" }),
      makeTrip({ status: "completed", trip_type: "event", trip_date: "2026-07-09" }),
    ];
    expect(mostCommonTripType(trips)).toBe("airport");
  });

  it("never falls back to the first value in the enum", () => {
    // "airport" is first in TRIP_TYPES. With only nightlife history the default
    // must be nightlife, proving the enum order is not a fallback.
    const trips = [makeTrip({ status: "completed", trip_type: "nightlife" })];
    expect(mostCommonTripType(trips)).toBe("nightlife");
  });
});

describe("mostCommonPaymentMethod", () => {
  it("has no default with no history", () => {
    expect(mostCommonPaymentMethod([])).toBeNull();
    expect(
      mostCommonPaymentMethod([makeTrip({ status: "completed", payment_method: null })]),
    ).toBeNull();
  });

  it("picks the most frequent method from completed rides", () => {
    const trips = [
      makeTrip({ status: "completed", payment_method: "zelle", trip_date: "2026-07-01" }),
      makeTrip({ status: "completed", payment_method: "zelle", trip_date: "2026-07-02" }),
      makeTrip({ status: "completed", payment_method: "cash", trip_date: "2026-07-03" }),
    ];
    expect(mostCommonPaymentMethod(trips)).toBe("zelle");
  });

  it("breaks a tie by the most recent completed ride", () => {
    const trips = [
      makeTrip({ status: "completed", payment_method: "cash", trip_date: "2026-07-01" }),
      makeTrip({ status: "completed", payment_method: "venmo", trip_date: "2026-07-09" }),
    ];
    expect(mostCommonPaymentMethod(trips)).toBe("venmo");
  });

  it("ignores rides that were never driven", () => {
    const trips = [
      makeTrip({ status: "completed", payment_method: "cash", trip_date: "2026-07-01" }),
      makeTrip({ status: "scheduled", payment_method: "card", trip_date: "2026-07-08" }),
      makeTrip({ status: "canceled", payment_method: "card", trip_date: "2026-07-09" }),
    ];
    expect(mostCommonPaymentMethod(trips)).toBe("cash");
  });
});

describe("recentCustomers", () => {
  const ashley = makeCustomer({ id: "c-ashley", name: "Ashley" });
  const jojo = makeCustomer({ id: "c-jojo", name: "Jojo" });
  const marcus = makeCustomer({ id: "c-marcus", name: "Marcus" });
  const all = [ashley, jojo, marcus];

  it("offers nothing with no history", () => {
    expect(recentCustomers([], all)).toEqual([]);
  });

  it("orders by the most recent completed ride, newest first", () => {
    const trips = [
      makeTrip({ status: "completed", customer_id: ashley.id, trip_date: "2026-07-01" }),
      makeTrip({ status: "completed", customer_id: jojo.id, trip_date: "2026-07-09" }),
      makeTrip({ status: "completed", customer_id: marcus.id, trip_date: "2026-07-05" }),
    ];
    expect(recentCustomers(trips, all).map((c) => c.name)).toEqual([
      "Jojo",
      "Marcus",
      "Ashley",
    ]);
  });

  it("lists each customer once, using their latest ride", () => {
    const trips = [
      makeTrip({ status: "completed", customer_id: ashley.id, trip_date: "2026-07-01" }),
      makeTrip({ status: "completed", customer_id: ashley.id, trip_date: "2026-07-10" }),
      makeTrip({ status: "completed", customer_id: jojo.id, trip_date: "2026-07-05" }),
    ];
    const names = recentCustomers(trips, all).map((c) => c.name);
    expect(names).toEqual(["Ashley", "Jojo"]);
    expect(names.filter((n) => n === "Ashley")).toHaveLength(1);
  });

  it("breaks a same-day tie by which ride was recorded most recently", () => {
    const trips = [
      makeTrip({
        status: "completed",
        customer_id: ashley.id,
        trip_date: "2026-07-09",
        created_at: "2026-07-09T10:00:00Z",
      }),
      makeTrip({
        status: "completed",
        customer_id: jojo.id,
        trip_date: "2026-07-09",
        created_at: "2026-07-09T20:00:00Z",
      }),
    ];
    expect(recentCustomers(trips, all).map((c) => c.name)).toEqual(["Jojo", "Ashley"]);
  });

  it("caps the list at the documented limit of five", () => {
    expect(RECENT_CUSTOMER_LIMIT).toBe(5);
    const many = Array.from({ length: 9 }, (_, i) =>
      makeCustomer({ id: `c-${i}`, name: `Customer ${i}` }),
    );
    const trips = many.map((c, i) =>
      makeTrip({
        status: "completed",
        customer_id: c.id,
        trip_date: `2026-07-${String(i + 1).padStart(2, "0")}`,
      }),
    );
    expect(recentCustomers(trips, many)).toHaveLength(RECENT_CUSTOMER_LIMIT);
  });

  it("ignores rides that were never driven", () => {
    const trips = [
      makeTrip({ status: "scheduled", customer_id: jojo.id, trip_date: "2026-07-20" }),
      makeTrip({ status: "canceled", customer_id: marcus.id, trip_date: "2026-07-21" }),
      makeTrip({ status: "completed", customer_id: ashley.id, trip_date: "2026-07-01" }),
    ];
    expect(recentCustomers(trips, all).map((c) => c.name)).toEqual(["Ashley"]);
  });

  it("skips rides whose customer no longer exists", () => {
    const trips = [
      makeTrip({ status: "completed", customer_id: "deleted-id", trip_date: "2026-07-09" }),
      makeTrip({ status: "completed", customer_id: ashley.id, trip_date: "2026-07-01" }),
    ];
    expect(recentCustomers(trips, all).map((c) => c.name)).toEqual(["Ashley"]);
  });
});
