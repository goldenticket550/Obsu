import { describe, expect, it } from "vitest";
import { customerContactHref, ridePrimaryLabel } from "./mobile-dashboard-model";
import type { TripListRow } from "@/lib/db/trips";

const trip = { id: "ride-1", status: "scheduled", confirmed_at: null } as TripListRow;

describe("mobile next ride truthfulness", () => {
  it("disables malformed or absent contact destinations", () => {
    expect(customerContactHref(null, "tel")).toBeNull();
    expect(customerContactHref("12", "sms")).toBeNull();
    expect(customerContactHref("(212) 555-0100", "tel")).toBe("tel:2125550100");
  });

  it("uses only existing lifecycle decisions", () => {
    expect(ridePrimaryLabel({ kind: "upcoming", trip, msUntil: 1, sameDay: true })).toBe("Confirm pickup");
    expect(ridePrimaryLabel({ kind: "upcoming", trip: { ...trip, confirmed_at: "2026-08-05" }, msUntil: 1, sameDay: true })).toBe("Complete ride");
    expect(ridePrimaryLabel({ kind: "needs_closing_out", trip, reason: { kind: "pickup_time_passed" } })).toBe("Close out ride");
  });
});
