import { describe, expect, it } from "vitest";
import {
  CHROMELESS_ROUTES,
  NAV_DESTINATIONS,
  isActiveDestination,
  isChromeless,
} from "./nav";

describe("NAV_DESTINATIONS", () => {
  it("is exactly the five routes that exist and work", () => {
    expect(NAV_DESTINATIONS.map((d) => d.href)).toEqual([
      "/",
      "/upcoming",
      "/trips",
      "/customers",
      "/expenses",
    ]);
  });

  it("contains no placeholder or dead destinations", () => {
    for (const d of NAV_DESTINATIONS) {
      expect(d.href.startsWith("/")).toBe(true);
      expect(d.href).not.toContain("#");
      expect(d.label.toLowerCase()).not.toContain("soon");
    }
  });

  it("does not expose pre-auth routes as destinations", () => {
    const hrefs = NAV_DESTINATIONS.map((d) => d.href);
    expect(hrefs).not.toContain("/login");
    expect(hrefs).not.toContain("/onboarding");
  });
});

describe("isChromeless", () => {
  it("renders authentication, recovery, and onboarding standalone", () => {
    expect(isChromeless("/login")).toBe(true);
    expect(isChromeless("/forgot-password")).toBe(true);
    expect(isChromeless("/reset-password")).toBe(true);
    expect(isChromeless("/onboarding")).toBe(true);
    expect(CHROMELESS_ROUTES).toEqual([
      "/login",
      "/forgot-password",
      "/reset-password",
      "/onboarding",
    ]);
  });

  it("covers subpaths of those routes", () => {
    expect(isChromeless("/login/callback")).toBe(true);
    expect(isChromeless("/forgot-password/sent")).toBe(true);
    expect(isChromeless("/reset-password/confirm")).toBe(true);
    expect(isChromeless("/onboarding/step-2")).toBe(true);
  });

  it("wraps every signed-in destination in the shell", () => {
    for (const d of NAV_DESTINATIONS) expect(isChromeless(d.href)).toBe(false);
    expect(isChromeless("/trips/abc-123/edit")).toBe(false);
  });

  it("does not match a route that merely contains the word", () => {
    expect(isChromeless("/logbook")).toBe(false);
    expect(isChromeless("/onboarding-notes")).toBe(false);
    expect(isChromeless("/forgot-password-notes")).toBe(false);
  });
});

describe("isActiveDestination", () => {
  it("marks Dashboard active only on the exact root path", () => {
    expect(isActiveDestination("/", "/")).toBe(true);
    expect(isActiveDestination("/trips", "/")).toBe(false);
    expect(isActiveDestination("/upcoming", "/")).toBe(false);
  });

  it("marks a section active on its subpaths", () => {
    expect(isActiveDestination("/trips", "/trips")).toBe(true);
    expect(isActiveDestination("/trips/new", "/trips")).toBe(true);
    expect(isActiveDestination("/trips/abc/edit", "/trips")).toBe(true);
  });

  it("keeps sections from bleeding into each other", () => {
    expect(isActiveDestination("/customers", "/trips")).toBe(false);
    expect(isActiveDestination("/upcoming", "/trips")).toBe(false);
  });

  it("marks exactly one destination active for a given path", () => {
    for (const path of ["/", "/upcoming", "/trips", "/customers", "/expenses"]) {
      const active = NAV_DESTINATIONS.filter((d) =>
        isActiveDestination(path, d.href),
      );
      expect(active).toHaveLength(1);
    }
  });
});
