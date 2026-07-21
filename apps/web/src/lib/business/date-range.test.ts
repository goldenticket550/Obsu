import { describe, expect, it } from "vitest";
import {
  currentMonthRange,
  filterByDateRange,
  todayInNewYork,
} from "./date-range";

describe("filterByDateRange", () => {
  const rows = [
    { d: "2026-06-30", v: 1 },
    { d: "2026-07-01", v: 2 },
    { d: "2026-07-15", v: 3 },
    { d: "2026-07-31", v: 4 },
    { d: "2026-08-01", v: 5 },
  ];

  it("keeps items within the inclusive range", () => {
    const kept = filterByDateRange(rows, "d", "2026-07-01", "2026-07-31").map(
      (r) => r.v,
    );
    expect(kept).toEqual([2, 3, 4]);
  });

  it("compares on the date portion of timestamp fields", () => {
    const ts = [{ d: "2026-07-31T23:30:00Z" }, { d: "2026-08-01T00:05:00Z" }];
    expect(filterByDateRange(ts, "d", "2026-07-01", "2026-07-31")).toEqual([
      { d: "2026-07-31T23:30:00Z" },
    ]);
  });

  it("empty input -> empty output", () => {
    expect(
      filterByDateRange([] as { d: string }[], "d", "2026-07-01", "2026-07-31"),
    ).toEqual([]);
  });
});

describe("currentMonthRange (America/New_York)", () => {
  it("returns first and last calendar day of the month", () => {
    const r = currentMonthRange(new Date("2026-07-20T12:00:00Z"));
    expect(r).toEqual({ start: "2026-07-01", end: "2026-07-31" });
  });

  it("handles February (28 days in 2026)", () => {
    const r = currentMonthRange(new Date("2026-02-10T12:00:00Z"));
    expect(r).toEqual({ start: "2026-02-01", end: "2026-02-28" });
  });

  it("uses New York local date across the UTC-midnight boundary", () => {
    // 2026-08-01T03:00Z is 2026-07-31 23:00 in New York (EDT) -> still July.
    const r = currentMonthRange(new Date("2026-08-01T03:00:00Z"));
    expect(r).toEqual({ start: "2026-07-01", end: "2026-07-31" });
  });
});

describe("todayInNewYork", () => {
  it("returns the NY date as YYYY-MM-DD", () => {
    expect(todayInNewYork(new Date("2026-07-20T12:00:00Z"))).toBe("2026-07-20");
  });

  it("uses NY local date across the UTC-midnight boundary", () => {
    // 2026-08-01T03:00Z is 2026-07-31 23:00 in New York (EDT).
    expect(todayInNewYork(new Date("2026-08-01T03:00:00Z"))).toBe("2026-07-31");
  });
});
