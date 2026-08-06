import { describe, expect, it } from "vitest";
import type { Appointment, ServiceCategory } from "@/lib/types/beauty";
import { checkAppointmentConflict } from "./conflicts";
import { balanceDueCents, beautyMonthRevenueCents, fillsDueClients, isMissingAddOn } from "./intel";
import { formatDateTimeLocal, zonedDateTimeToUtc } from "./timezone";
import { dollarsToCents, positiveInteger, requireEnum, SERVICE_CATEGORIES, uniqueIds, wallTime, weekday } from "./validation";

const line = (category: ServiceCategory = "lash_set", name = "Light Volume") => ({ id: `line-${category}-${name}`, organization_id: "org", appointment_id: "appointment", service_id: `service-${category}`, name, category, price_cents: 11_500, duration_minutes: 60, created_at: "2026-01-01T00:00:00Z" });
const appointment = (overrides: Partial<Appointment> = {}): Appointment => ({ id: "appointment", organization_id: "org", starts_at: "2026-08-04T16:00:00Z", ends_at: "2026-08-04T17:00:00Z", status: "completed", price_cents: 11_500, deposit_paid: false, created_at: "2026-08-01T00:00:00Z", service_id: "service-lash_set", appointment_services: [line()], ...overrides });
const hours = [{ id: "hours", organization_id: "org", weekday: 2, start_time: "11:00", end_time: "19:00", created_at: "2026-01-01" }];
const customer = { id: "client", organization_id: "org", name: "Iris", created_at: "2026-01-01" };

describe("Beauty timezone handling", () => {
  it("converts New York wall time to UTC and formats it back", () => {
    const utc = zonedDateTimeToUtc("2026-08-04T11:00", "America/New_York");
    expect(utc.toISOString()).toBe("2026-08-04T15:00:00.000Z");
    expect(formatDateTimeLocal(utc, "America/New_York")).toBe("2026-08-04T11:00");
  });
  it("rejects a nonexistent spring-forward wall time", () => expect(() => zonedDateTimeToUtc("2026-03-08T02:30", "America/New_York")).toThrow(/does not exist/i));
  it("rejects invalid dates and timezones", () => {
    expect(() => zonedDateTimeToUtc("2026-02-30T11:00", "America/New_York")).toThrow(/valid/i);
    expect(() => zonedDateTimeToUtc("2026-08-04T11:00", "Not/A_Zone")).toThrow(/timezone/i);
  });
});

describe("Beauty intelligence", () => {
  it("uses business-local month boundaries and completed appointments only", () => {
    const localAugust = appointment({ starts_at: "2026-09-01T03:30:00Z", status: "completed" });
    const booked = appointment({ id: "booked", status: "booked" });
    expect(beautyMonthRevenueCents([localAugust, booked], new Date("2026-08-20T12:00:00Z"), "America/New_York")).toBe(11_500);
  });
  it("derives balances without returning negative overpayments", () => {
    expect(balanceDueCents(appointment({ price_cents: 10_000, late_fee_cents: 1_500, amount_paid_cents: 4_000 }))).toBe(7_500);
    expect(balanceDueCents(appointment({ price_cents: 10_000, amount_paid_cents: 20_000 }))).toBe(0);
  });
  it("requires repeat lash visits and more than 21 local calendar days", () => {
    const visits = [appointment({ id: "one", client_id: customer.id, starts_at: "2026-06-01T15:00:00Z" }), appointment({ id: "two", client_id: customer.id, starts_at: "2026-07-10T15:00:00Z" })];
    expect(fillsDueClients([customer], visits, new Date("2026-08-01T15:00:00Z"), 21, "America/New_York")).toHaveLength(1);
    expect(fillsDueClients([customer], visits, new Date("2026-07-31T15:00:00Z"), 21, "America/New_York")).toHaveLength(0);
    expect(fillsDueClients([customer], visits.slice(0, 1), new Date("2026-08-01T15:00:00Z"))).toHaveLength(0);
    expect(fillsDueClients([customer], visits.map((visit) => ({ ...visit, appointment_services: [line("brow", "Brow Lamination")] })), new Date("2026-08-01T15:00:00Z"))).toHaveLength(0);
  });
  it("uses category snapshots for the Bestie Deal add-on rule", () => {
    const bestie = appointment({ appointment_services: [line("lash_set", "Bestie Deal (bottom lashes not incl.)")] });
    expect(isMissingAddOn(bestie)).toBe(true);
    expect(isMissingAddOn({ ...bestie, appointment_services: [...bestie.appointment_services!, line("bottom_lash", "Bottom Lashes Only")] })).toBe(false);
  });
});

describe("Beauty conflict checks", () => {
  const base = { timezone: "America/New_York", workingHours: hours, appointments: [] as Appointment[], timeOff: [] };
  it("allows a half-open slot inside hours", () => expect(checkAppointmentConflict({ ...base, startsAt: new Date("2026-08-04T15:00:00Z"), endsAt: new Date("2026-08-04T16:00:00Z") })).toEqual({ valid: true }));
  it("rejects overlaps but permits touching endpoints and canceled appointments", () => {
    const existing = appointment({ status: "booked" });
    expect(checkAppointmentConflict({ ...base, appointments: [existing], startsAt: new Date("2026-08-04T16:30:00Z"), endsAt: new Date("2026-08-04T17:30:00Z") }).reason).toBe("appointment");
    expect(checkAppointmentConflict({ ...base, appointments: [existing], startsAt: new Date("2026-08-04T17:00:00Z"), endsAt: new Date("2026-08-04T18:00:00Z") }).valid).toBe(true);
    expect(checkAppointmentConflict({ ...base, appointments: [{ ...existing, status: "canceled" }], startsAt: new Date("2026-08-04T16:30:00Z"), endsAt: new Date("2026-08-04T17:30:00Z") }).valid).toBe(true);
  });
  it("rejects time off, outside hours, cross-midnight, and invalid ranges", () => {
    expect(checkAppointmentConflict({ ...base, timeOff: [{ id: "off", organization_id: "org", starts_at: "2026-08-04T15:30:00Z", ends_at: "2026-08-04T16:30:00Z", created_at: "x" }], startsAt: new Date("2026-08-04T15:00:00Z"), endsAt: new Date("2026-08-04T16:00:00Z") }).reason).toBe("time_off");
    expect(checkAppointmentConflict({ ...base, startsAt: new Date("2026-08-04T14:00:00Z"), endsAt: new Date("2026-08-04T15:00:00Z") }).reason).toBe("outside_hours");
    expect(checkAppointmentConflict({ ...base, startsAt: new Date("2026-08-04T22:30:00Z"), endsAt: new Date("2026-08-05T04:30:00Z") }).reason).toBe("outside_hours");
    expect(checkAppointmentConflict({ ...base, startsAt: new Date("invalid"), endsAt: new Date() }).reason).toBe("invalid_range");
  });
});

describe("Beauty form validation", () => {
  it("validates money, integers, enums, ids, weekdays, and wall times", () => {
    expect(dollarsToCents("12.34")).toBe(1234);
    expect(dollarsToCents("")).toBeNull();
    expect(() => dollarsToCents("nope")).toThrow();
    expect(positiveInteger("60", "Duration")).toBe(60);
    expect(() => positiveInteger("1.5", "Duration")).toThrow();
    expect(requireEnum("brow", SERVICE_CATEGORIES, "category")).toBe("brow");
    expect(() => requireEnum("invalid", SERVICE_CATEGORIES, "category")).toThrow();
    expect(uniqueIds(["a", "b"])).toEqual(["a", "b"]);
    expect(() => uniqueIds(["a", "a"])).toThrow();
    expect(weekday("6")).toBe(6);
    expect(() => weekday("7")).toThrow();
    expect(wallTime("11:30")).toBe("11:30");
    expect(() => wallTime("25:00")).toThrow();
  });
});
