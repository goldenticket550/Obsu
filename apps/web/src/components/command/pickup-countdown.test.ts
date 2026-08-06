import { describe, expect, it } from "vitest";
import { pickupCountdownText } from "./mobile-dashboard-model";

describe("pickup countdown", () => {
  const now = Date.parse("2026-08-05T22:00:00Z");

  it("derives positive minutes from the scheduled pickup", () => {
    expect(pickupCountdownText("2026-08-05T22:42:00Z", now)).toBe("Pickup in 42 min");
  });

  it("never renders a negative value", () => {
    expect(pickupCountdownText("2026-08-05T21:59:00Z", now)).toBe("Pickup due");
  });

  it("renders nothing for absent or invalid pickup times", () => {
    expect(pickupCountdownText(null, now)).toBeNull();
    expect(pickupCountdownText("not-a-date", now)).toBeNull();
  });
});
