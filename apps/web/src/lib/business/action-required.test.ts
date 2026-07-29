import { describe, expect, it } from "vitest";
import { makeCustomer, makeTrip } from "./__factories";
import { buildActionRequired } from "./action-required";

const NOW = new Date("2026-07-15T18:00:00Z"); // 2:00 PM EDT, Wed Jul 15
const TODAY = "2026-07-15";

describe("buildActionRequired", () => {
  it("is empty when nothing needs attention", () => {
    const trips = [
      makeTrip({
        status: "completed",
        revenue_cents: 24000,
        customer_id: "cust-x",
        trip_date: TODAY,
      }),
    ];
    const customers = [makeCustomer({ id: "cust-x" })];
    expect(buildActionRequired(trips, customers, NOW, TODAY)).toEqual([]);
  });

  it("flags a scheduled ride whose pickup has passed", () => {
    const overdue = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-14",
      start_time: "2026-07-14T20:00:00Z",
      pickup_location: "Brooklyn",
      dropoff_location: "JFK",
    });
    const items = buildActionRequired([overdue], [], NOW, TODAY);
    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe("needs_closing_out");
    expect(items[0]?.severity).toBe("urgent");
    expect(items[0]?.href).toBe(`/trips/${overdue.id}/edit`);
    expect(items[0]?.actionLabel).toBeTruthy();
  });

  it("flags a completed ride with no revenue recorded", () => {
    const trip = makeTrip({
      status: "completed",
      revenue_cents: 0,
      customer_id: "cust-x",
    });
    const items = buildActionRequired([trip], [makeCustomer({ id: "cust-x" })], NOW, TODAY);
    expect(items.map((i) => i.kind)).toContain("missing_revenue");
  });

  it("does NOT flag a scheduled ride for having no price (that is allowed)", () => {
    const trip = makeTrip({
      status: "scheduled",
      revenue_cents: 0,
      trip_date: "2026-07-20",
      pickup_location: "Brooklyn",
      dropoff_location: "JFK",
    });
    const items = buildActionRequired([trip], [], NOW, TODAY);
    expect(items.map((i) => i.kind)).not.toContain("missing_revenue");
  });

  it("flags a completed ride with no customer", () => {
    const trip = makeTrip({
      status: "completed",
      revenue_cents: 24000,
      customer_id: null,
    });
    const items = buildActionRequired([trip], [], NOW, TODAY);
    expect(items.map((i) => i.kind)).toContain("missing_customer");
  });

  it("flags a scheduled ride missing pickup or destination", () => {
    const noDropoff = makeTrip({
      status: "scheduled",
      trip_date: "2026-07-20",
      pickup_location: "Brooklyn",
      dropoff_location: null,
    });
    const items = buildActionRequired([noDropoff], [], NOW, TODAY);
    expect(items.map((i) => i.kind)).toContain("missing_route");
  });

  it("reuses the existing repeat-customer rule for quiet customers", () => {
    const customer = makeCustomer({ id: "cust-quiet", name: "Ashley" });
    const trips = [
      makeTrip({
        status: "completed",
        customer_id: customer.id,
        revenue_cents: 24000,
        trip_date: "2026-05-01",
      }),
      makeTrip({
        status: "completed",
        customer_id: customer.id,
        revenue_cents: 24000,
        trip_date: "2026-05-02",
      }),
    ];
    const items = buildActionRequired(trips, [customer], NOW, TODAY);
    const quiet = items.find((i) => i.kind === "quiet_customer");
    expect(quiet).toBeTruthy();
    expect(quiet?.recordLabel).toBe("Ashley");
    expect(quiet?.href).toBe(`/customers/${customer.id}/edit`);
  });

  it("does not judge the customer — it states the fact only", () => {
    const customer = makeCustomer({ id: "cust-q2", name: "Ashley" });
    const trips = [
      makeTrip({ status: "completed", customer_id: customer.id, trip_date: "2026-05-01" }),
      makeTrip({ status: "completed", customer_id: customer.id, trip_date: "2026-05-02" }),
    ];
    const quiet = buildActionRequired(trips, [customer], NOW, TODAY).find(
      (i) => i.kind === "quiet_customer",
    );
    const text = `${quiet?.title} ${quiet?.detail}`.toLowerCase();
    for (const banned of ["lost", "churn", "unhappy", "angry", "abandoned", "at risk"]) {
      expect(text).not.toContain(banned);
    }
  });

  it("orders items by priority: closing out, revenue, customer, route, quiet", () => {
    const customer = makeCustomer({ id: "cust-quiet", name: "Ashley" });
    const trips = [
      // quiet customer (two old completed rides)
      makeTrip({ status: "completed", customer_id: customer.id, revenue_cents: 100, trip_date: "2026-05-01" }),
      makeTrip({ status: "completed", customer_id: customer.id, revenue_cents: 100, trip_date: "2026-05-02" }),
      // missing route
      makeTrip({ status: "scheduled", trip_date: "2026-07-20", pickup_location: null, dropoff_location: null }),
      // missing customer
      makeTrip({ status: "completed", revenue_cents: 500, customer_id: null, trip_date: TODAY }),
      // missing revenue (a DIFFERENT customer — giving the quiet customer a
      // ride today would correctly stop them being quiet)
      makeTrip({ status: "completed", revenue_cents: 0, customer_id: "cust-other", trip_date: TODAY }),
      // needs closing out
      makeTrip({
        status: "scheduled",
        trip_date: "2026-07-14",
        start_time: "2026-07-14T20:00:00Z",
        pickup_location: "Brooklyn",
        dropoff_location: "JFK",
      }),
    ];
    const kinds = buildActionRequired(trips, [customer], NOW, TODAY).map((i) => i.kind);
    expect(kinds[0]).toBe("needs_closing_out");
    expect(kinds.indexOf("missing_revenue")).toBeLessThan(kinds.indexOf("missing_customer"));
    expect(kinds.indexOf("missing_customer")).toBeLessThan(kinds.indexOf("missing_route"));
    expect(kinds.indexOf("missing_route")).toBeLessThan(kinds.indexOf("quiet_customer"));
  });

  it("is deterministic — same input, same order", () => {
    const trips = [
      makeTrip({ status: "completed", revenue_cents: 0, trip_date: TODAY }),
      makeTrip({ status: "completed", revenue_cents: 0, trip_date: TODAY }),
      makeTrip({ status: "completed", revenue_cents: 0, trip_date: TODAY }),
    ];
    const first = buildActionRequired(trips, [], NOW, TODAY).map((i) => i.id);
    const second = buildActionRequired(trips, [], NOW, TODAY).map((i) => i.id);
    expect(first).toEqual(second);
  });

  it("every item carries a record, a reason, and one safe next action", () => {
    const trips = [
      makeTrip({
        status: "scheduled",
        trip_date: "2026-07-14",
        start_time: "2026-07-14T20:00:00Z",
      }),
      makeTrip({ status: "completed", revenue_cents: 0, trip_date: TODAY }),
    ];
    for (const item of buildActionRequired(trips, [], NOW, TODAY)) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.detail.length).toBeGreaterThan(0);
      expect(item.recordLabel.length).toBeGreaterThan(0);
      expect(item.actionLabel.length).toBeGreaterThan(0);
      expect(item.href.startsWith("/")).toBe(true);
    }
  });
});
