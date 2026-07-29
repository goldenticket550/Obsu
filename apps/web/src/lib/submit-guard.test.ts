import { describe, expect, it } from "vitest";
import {
  DEFAULT_PENDING_LABEL,
  shouldAllowSubmit,
  submitLabelFor,
} from "./submit-guard";

/**
 * Guards the duplicate-submission fix for the CRUD forms. The concrete risk
 * this protects: `createTrip` writes a trip AND its linked gas/tolls/other
 * expense rows, so a double-click previously created duplicate money records.
 */

describe("shouldAllowSubmit", () => {
  it("allows the first submit", () => {
    expect(shouldAllowSubmit("idle")).toBe(true);
  });

  it("blocks a second submit while one is already in flight", () => {
    expect(shouldAllowSubmit("submitting")).toBe(false);
  });

  it("blocks every further attempt, not just the second", () => {
    // Once submitting, the phase does not return to idle on its own — repeated
    // Enter presses / double-clicks all stay blocked.
    const attempts = [1, 2, 3].map(() => shouldAllowSubmit("submitting"));
    expect(attempts).toEqual([false, false, false]);
  });
});

describe("submitLabelFor", () => {
  it("shows the action's own label while idle", () => {
    expect(submitLabelFor("idle", "Log trip")).toBe("Log trip");
    expect(submitLabelFor("idle", "Save customer")).toBe("Save customer");
  });

  it("shows progress while submitting instead of the idle label", () => {
    // The visible label must not still read "Log trip" once the write is in
    // flight — that would imply the action had not started.
    expect(submitLabelFor("submitting", "Log trip")).toBe(DEFAULT_PENDING_LABEL);
  });

  it("honours a caller-supplied pending label", () => {
    expect(submitLabelFor("submitting", "Log trip", "Logging…")).toBe("Logging…");
  });

  it("never reports success — only idle or in-progress wording", () => {
    // Success is confirmed by the server action's redirect, never by the button.
    const label = submitLabelFor("submitting", "Log trip");
    expect(label.toLowerCase()).not.toContain("saved");
    expect(label.toLowerCase()).not.toContain("success");
  });
});
