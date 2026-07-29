import { describe, expect, it } from "vitest";
import {
  INACTIVE_THRESHOLD_DAYS,
  customerActivity,
  inactiveCustomers,
} from "./customer-intel";
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

describe("customerActivity", () => {
  const CUSTOMER_ID = "cust-1";
  const TODAY = "2026-07-15";

  it("reports no history rather than zero days for a customer with no rides", () => {
    const a = customerActivity([], CUSTOMER_ID, TODAY);
    expect(a.tripCount).toBe(0);
    expect(a.lifetimeRevenueCents).toBe(0);
    expect(a.lastTripDate).toBeNull();
    expect(a.daysSinceLastTrip).toBeNull();
    expect(a.isQuiet).toBe(false);
  });

  it("counts only completed rides, matching the inactivity rule", () => {
    const trips = [
      makeTrip({ customer_id: CUSTOMER_ID, status: "completed", revenue_cents: 20000, trip_date: "2026-07-01" }),
      makeTrip({ customer_id: CUSTOMER_ID, status: "scheduled", revenue_cents: 90000, trip_date: "2026-07-20" }),
      makeTrip({ customer_id: CUSTOMER_ID, status: "canceled", revenue_cents: 90000, trip_date: "2026-07-02" }),
    ];
    const a = customerActivity(trips, CUSTOMER_ID, TODAY);
    expect(a.tripCount).toBe(1);
    expect(a.lifetimeRevenueCents).toBe(20000);
    expect(a.lastTripDate).toBe("2026-07-01");
    expect(a.daysSinceLastTrip).toBe(14);
  });

  it("uses the most recent completed ride regardless of input order", () => {
    const trips = [
      makeTrip({ customer_id: CUSTOMER_ID, status: "completed", trip_date: "2026-06-01" }),
      makeTrip({ customer_id: CUSTOMER_ID, status: "completed", trip_date: "2026-07-10" }),
      makeTrip({ customer_id: CUSTOMER_ID, status: "completed", trip_date: "2026-05-01" }),
    ];
    expect(customerActivity(trips, CUSTOMER_ID, TODAY).lastTripDate).toBe("2026-07-10");
  });

  it("ignores other customers' rides", () => {
    const trips = [
      makeTrip({ customer_id: "someone-else", status: "completed", revenue_cents: 50000 }),
    ];
    expect(customerActivity(trips, CUSTOMER_ID, TODAY).tripCount).toBe(0);
  });

  it("flags quiet only for a repeat customer past the threshold", () => {
    const twoOld = [
      makeTrip({ customer_id: CUSTOMER_ID, status: "completed", trip_date: "2026-05-01" }),
      makeTrip({ customer_id: CUSTOMER_ID, status: "completed", trip_date: "2026-05-02" }),
    ];
    expect(customerActivity(twoOld, CUSTOMER_ID, TODAY).isQuiet).toBe(true);

    // One ride is not a repeat customer, however long ago it was.
    const oneOld = [
      makeTrip({ customer_id: CUSTOMER_ID, status: "completed", trip_date: "2026-05-01" }),
    ];
    expect(customerActivity(oneOld, CUSTOMER_ID, TODAY).isQuiet).toBe(false);

    // Recent repeat customer is not quiet.
    const recent = [
      makeTrip({ customer_id: CUSTOMER_ID, status: "completed", trip_date: "2026-07-10" }),
      makeTrip({ customer_id: CUSTOMER_ID, status: "completed", trip_date: "2026-07-14" }),
    ];
    expect(customerActivity(recent, CUSTOMER_ID, TODAY).isQuiet).toBe(false);
  });

  it("agrees with inactiveCustomers for the same data", () => {
    const customer = makeCustomer({ id: CUSTOMER_ID, name: "Ashley" });
    const trips = [
      makeTrip({ customer_id: CUSTOMER_ID, status: "completed", trip_date: "2026-05-01" }),
      makeTrip({ customer_id: CUSTOMER_ID, status: "completed", trip_date: "2026-05-02" }),
    ];
    const flagged = inactiveCustomers(trips, [customer], INACTIVE_THRESHOLD_DAYS, TODAY);
    const a = customerActivity(trips, CUSTOMER_ID, TODAY);
    expect(a.isQuiet).toBe(flagged.length === 1);
    expect(a.daysSinceLastTrip).toBe(flagged[0]?.daysSinceLastTrip);
  });
});
