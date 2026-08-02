import { describe, expect, it } from "vitest";
import {
  isPublicAuthRoute,
  newPasswordError,
  recoveryCallbackUrl,
  safeAuthDestination,
  siteOrigin,
} from "./recovery";

describe("public auth routes", () => {
  it("allows only the intended unauthenticated surfaces", () => {
    expect(isPublicAuthRoute("/login")).toBe(true);
    expect(isPublicAuthRoute("/forgot-password")).toBe(true);
    expect(isPublicAuthRoute("/auth/callback")).toBe(true);
    expect(isPublicAuthRoute("/reset-password")).toBe(false);
    expect(isPublicAuthRoute("/login-notes")).toBe(false);
    expect(isPublicAuthRoute("/forgot-password-notes")).toBe(false);
  });
});

describe("password recovery routing", () => {
  it("allows only the two internal auth destinations", () => {
    expect(safeAuthDestination("/reset-password")).toBe("/reset-password");
    expect(safeAuthDestination("/")).toBe("/");
    expect(safeAuthDestination("https://attacker.example")).toBe("/");
    expect(safeAuthDestination("//attacker.example")).toBe("/");
    expect(safeAuthDestination(null)).toBe("/");
  });

  it("builds the one intended PKCE callback", () => {
    expect(recoveryCallbackUrl("https://obsidian-mvp.vercel.app")).toBe(
      "https://obsidian-mvp.vercel.app/auth/callback?next=%2Freset-password",
    );
  });
});

describe("siteOrigin", () => {
  it("prefers the configured canonical origin", () => {
    expect(
      siteOrigin({
        configuredUrl: "https://obsidian-mvp.vercel.app/path",
        requestOrigin: "https://preview.example",
        production: true,
      }),
    ).toBe("https://obsidian-mvp.vercel.app");
  });

  it("permits localhost HTTP only outside production", () => {
    expect(
      siteOrigin({ requestOrigin: "http://localhost:3001", production: false }),
    ).toBe("http://localhost:3001");
    expect(() =>
      siteOrigin({ requestOrigin: "http://localhost:3001", production: true }),
    ).toThrow("must use HTTPS");
  });

  it("fails closed when production has no canonical URL", () => {
    expect(() => siteOrigin({ production: true })).toThrow(
      "NEXT_PUBLIC_SITE_URL",
    );
  });
});

describe("newPasswordError", () => {
  it("requires six characters and exact confirmation", () => {
    expect(newPasswordError("short", "short")).toBe("Use at least 6 characters.");
    expect(newPasswordError("new-password", "different")).toBe(
      "The passwords do not match.",
    );
    expect(newPasswordError("new-password", "new-password")).toBeNull();
  });
});
