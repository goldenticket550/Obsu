import { describe, expect, it } from "vitest";
import { resolveBusinessBranding } from "./business-profile";

describe("organization profile branding", () => {
  it("uses the complete business profile", () => {
    expect(
      resolveBusinessBranding("Covered by CCG", {
        display_name: "COVERED BY CCG",
        workspace_label: "CCG",
        vehicle_description: "New-model fully blacked-out Chevrolet Suburban",
      }),
    ).toMatchObject({
      displayName: "COVERED BY CCG",
      workspaceLabel: "CCG",
      vehicleDescription: "New-model fully blacked-out Chevrolet Suburban",
    });
  });

  it("falls back to the organization name when the profile is absent", () => {
    expect(resolveBusinessBranding("Midnight Rydes", null).displayName).toBe(
      "Midnight Rydes",
    );
  });

  it("tolerates missing and blank optional fields", () => {
    expect(
      resolveBusinessBranding("Midnight Rydes", {
        display_name: " ",
        workspace_label: null,
        vehicle_description: undefined,
      }),
    ).toMatchObject({
      displayName: "Midnight Rydes",
      workspaceLabel: null,
      vehicleDescription: null,
    });
  });
});
