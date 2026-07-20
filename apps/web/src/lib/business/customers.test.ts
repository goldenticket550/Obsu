import { describe, expect, it } from "vitest";
import {
  customerLifetimeRevenueCents,
  customerTripCount,
  topCustomers,
} from "./customers";
import { makeCustomer, makeTrip } from "./__factories";

describe("customers", () => {
  const ashley = makeCustomer({ id: "c-ashley", name: "Ashley" });
  const crystal = makeCustomer({ id: "c-crystal", name: "Crystal" });
  const trips = [
    makeTrip({ customer_id: "c-ashley", revenue_cents: 24000 }),
    makeTrip({ customer_id: "c-ashley", revenue_cents: 10000 }),
    makeTrip({ customer_id: "c-ashley", revenue_cents: 99999, status: "canceled" }),
    makeTrip({ customer_id: "c-crystal", revenue_cents: 15000 }),
  ];

  it("lifetime revenue counts that customer's completed trips", () => {
    expect(customerLifetimeRevenueCents(trips, "c-ashley")).toBe(34000);
    expect(customerLifetimeRevenueCents(trips, "c-crystal")).toBe(15000);
  });

  it("lifetime revenue is 0 for unknown customer or empty trips", () => {
    expect(customerLifetimeRevenueCents(trips, "nobody")).toBe(0);
    expect(customerLifetimeRevenueCents([], "c-ashley")).toBe(0);
  });

  it("counts completed trips per customer", () => {
    expect(customerTripCount(trips, "c-ashley")).toBe(2);
    expect(customerTripCount(trips, "c-crystal")).toBe(1);
  });

  it("ranks customers by lifetime revenue, highest first", () => {
    const top = topCustomers(trips, [crystal, ashley], 2);
    expect(top.map((r) => r.customer.id)).toEqual(["c-ashley", "c-crystal"]);
    expect(top[0]?.revenueCents).toBe(34000);
    expect(top[0]?.tripCount).toBe(2);
  });

  it("respects n and handles empty cases", () => {
    expect(
      topCustomers(trips, [crystal, ashley], 1).map((r) => r.customer.id),
    ).toEqual(["c-ashley"]);
    expect(topCustomers([], [ashley], 5)[0]?.revenueCents).toBe(0);
    expect(topCustomers(trips, [], 5)).toEqual([]);
    expect(topCustomers(trips, [ashley], 0)).toEqual([]);
  });
});
