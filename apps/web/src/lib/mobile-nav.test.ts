import { describe, expect, it } from "vitest";
import { MOBILE_MORE_DESTINATIONS, MOBILE_NAV_DESTINATIONS } from "./mobile-nav";

describe("mobile navigation contract", () => {
  it("maps the approved labels to existing routes", () => {
    expect(MOBILE_NAV_DESTINATIONS).toEqual([
      { href: "/", label: "Home" },
      { href: "/trips", label: "Trips" },
      { href: "/customers", label: "Clients" },
      { href: "/feedback", label: "Feedback" },
    ]);
  });
  it("keeps secondary destinations reachable through More", () => {
    expect(MOBILE_MORE_DESTINATIONS.map((item) => item.href)).toEqual(["/upcoming", "/expenses"]);
  });
});
