import { describe, expect, it } from "vitest";
import { readinessScore } from "./mobile-dashboard-model";

describe("vehicle readiness score", () => {
  it("derives all-ready state", () => expect(readinessScore({ fuel: true, clean: true, route: true, clientNotified: true })).toEqual({ completed: 4, available: 4 }));
  it("derives partial state", () => expect(readinessScore({ fuel: true, clean: false, route: true, clientNotified: false })).toEqual({ completed: 2, available: 4 }));
  it("treats missing fields as unavailable, never complete", () => expect(readinessScore({ fuel: null, clean: null, route: null, clientNotified: null })).toEqual({ completed: 0, available: 0 }));
  it("supports an entirely unavailable model", () => expect(readinessScore(null)).toEqual({ completed: 0, available: 0 }));
});
