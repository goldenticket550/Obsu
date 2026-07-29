import { describe, expect, it } from "vitest";
import { formatPickupTime, toTimeInputValue } from "./pickup-time";

describe("toTimeInputValue", () => {
  it("renders a UTC timestamp as New York local time (EDT)", () => {
    // 2026-07-15 23:05 UTC = 7:05 PM EDT.
    expect(toTimeInputValue("2026-07-15T23:05:00Z")).toBe("19:05");
  });

  it("renders correctly in EST (winter offset)", () => {
    // 2026-01-15 23:05 UTC = 6:05 PM EST.
    expect(toTimeInputValue("2026-01-15T23:05:00Z")).toBe("18:05");
  });

  it("keeps a late-night pickup on its own New York day", () => {
    // 2026-07-16 03:30 UTC is still 11:30 PM on Jul 15 in New York.
    expect(toTimeInputValue("2026-07-16T03:30:00Z")).toBe("23:30");
  });

  it("returns empty string for a missing time rather than inventing one", () => {
    expect(toTimeInputValue(null)).toBe("");
    expect(toTimeInputValue(undefined)).toBe("");
    expect(toTimeInputValue("")).toBe("");
  });

  it("returns empty string for an unparseable value", () => {
    expect(toTimeInputValue("not-a-date")).toBe("");
  });
});

describe("formatPickupTime", () => {
  it("formats a pickup for display in New York time", () => {
    expect(formatPickupTime("2026-07-15T23:05:00Z")).toBe("7:05 PM");
  });

  it("returns null when there is no time set", () => {
    expect(formatPickupTime(null)).toBeNull();
    expect(formatPickupTime("nonsense")).toBeNull();
  });
});
