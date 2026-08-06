import { describe, expect, it } from "vitest";
import { isRouteAllowedForVertical, verticalRedirectPath } from "./vertical-routing";

describe("vertical routing", () => {
  it("keeps Beauty organizations out of Rides-only records", () => {
    expect(verticalRedirectPath("/trips/new", "beauty")).toBe("/beauty");
    expect(verticalRedirectPath("/customers", "beauty")).toBe("/beauty");
    expect(isRouteAllowedForVertical("/ask", "beauty")).toBe(true);
  });
  it("keeps Rides organizations out of Beauty routes", () => {
    expect(verticalRedirectPath("/beauty/appointments", "rides")).toBe("/");
    expect(isRouteAllowedForVertical("/trips", "rides")).toBe(true);
  });
});
