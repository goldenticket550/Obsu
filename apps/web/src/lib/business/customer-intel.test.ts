import { describe, expect, it } from "vitest";
import { INACTIVE_THRESHOLD_DAYS, inactiveCustomers } from "./customer-intel";
import { makeCustomer, makeTrip } from "./__factories";

const AS_OF = "2026-07-31";

describe("inactiveCustomers", () => {
  it("flags a repeat customer past the threshold with the right details", () => {
    const c = makeCustomer({ id: "c1", name: "Ashley" });
    const trips = [
      makeTrip({ customer_id: "c1", trip_date: "2026-05-01", revenue_cents: 24000 }),
      makeTrip({ customer_id: "c1", trip_date: "2026-06-01", revenue_cents: 10000 }),
    ];
    const out = inactiveCustomers(trips, [c], 30, AS_OF);
    expect(out).toHaveLength(1);
    expect(out[0]?.name).toBe("Ashley");
    expect(out[0]?.lastTripDate).toBe("2026-06-01");
    expect(out[0]?.daysSinceLastTrip).toBe(60);
    expect(out[0]?.tripCount).toBe(2);
    expect(out[0]?.lifetimeRevenueCents).toBe(34000);
  });

  it("does NOT flag a customer with fewer than 2 completed trips", () => {
    const c = makeCustomer({ id: "c1" });
    const trips = [makeTrip({ customer_id: "c1", trip_date: "2026-01-01" })]; // 1 old trip
    expect(inactiveCustomers(trips, [c], 30, AS_OF)).toEqual([]);
  });

  it("does NOT flag a recently-active repeat customer", () => {
    const c = makeCustomer({ id: "c1" });
    const trips = [
      makeTrip({ customer_id: "c1", trip_date: "2026-07-10" }),
      makeTrip({ customer_id: "c1", trip_date: "2026-07-25" }), // 6 days ago
    ];
    expect(inactiveCustomers(trips, [c], 30, AS_OF)).toEqual([]);
  });

  it("respects the threshold boundary: exactly N days not flagged, N+1 flagged", () => {
    const c = makeCustomer({ id: "c1" });
    const atThreshold = [
      makeTrip({ customer_id: "c1", trip_date: "2026-07-01" }), // exactly 30 days
      makeTrip({ customer_id: "c1", trip_date: "2026-07-01" }),
    ];
    expect(inactiveCustomers(atThreshold, [c], 30, AS_OF)).toEqual([]);
    const overThreshold = [
      makeTrip({ customer_id: "c1", trip_date: "2026-06-30" }), // 31 days
      makeTrip({ customer_id: "c1", trip_date: "2026-06-30" }),
    ];
    expect(inactiveCustomers(overThreshold, [c], 30, AS_OF)).toHaveLength(1);
  });

  it("ignores canceled trips for the 2-trip test", () => {
    const c = makeCustomer({ id: "c1" });
    const trips = [
      makeTrip({ customer_id: "c1", trip_date: "2026-05-01" }), // completed
      makeTrip({ customer_id: "c1", trip_date: "2026-07-28", status: "canceled" }),
    ];
    expect(inactiveCustomers(trips, [c], 30, AS_OF)).toEqual([]); // only 1 completed
  });

  it("uses the last COMPLETED trip date, ignoring a recent canceled trip", () => {
    const c = makeCustomer({ id: "c1" });
    const trips = [
      makeTrip({ customer_id: "c1", trip_date: "2026-05-01" }),
      makeTrip({ customer_id: "c1", trip_date: "2026-05-15" }),
      makeTrip({ customer_id: "c1", trip_date: "2026-07-30", status: "canceled" }),
    ];
    const out = inactiveCustomers(trips, [c], 30, AS_OF);
    expect(out).toHaveLength(1);
    expect(out[0]?.lastTripDate).toBe("2026-05-15");
  });

  it("sorts most-overdue first", () => {
    const a = makeCustomer({ id: "a", name: "A" });
    const b = makeCustomer({ id: "b", name: "B" });
    const trips = [
      makeTrip({ customer_id: "a", trip_date: "2026-06-15" }),
      makeTrip({ customer_id: "a", trip_date: "2026-06-15" }),
      makeTrip({ customer_id: "b", trip_date: "2026-04-01" }),
      makeTrip({ customer_id: "b", trip_date: "2026-04-01" }),
    ];
    const out = inactiveCustomers(trips, [a, b], 30, AS_OF);
    expect(out.map((x) => x.name)).toEqual(["B", "A"]); // B (older) first
  });

  it("returns [] for empty inputs", () => {
    expect(inactiveCustomers([], [], 30, AS_OF)).toEqual([]);
    expect(inactiveCustomers([], [makeCustomer()], 30, AS_OF)).toEqual([]);
  });

  it("has a sane default threshold constant", () => {
    expect(INACTIVE_THRESHOLD_DAYS).toBe(30);
  });
});
