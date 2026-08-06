import { describe, expect, it } from "vitest";
import { buildAskSystemPrompt } from "./config";

describe("vertical-aware assistant prompt", () => {
  it("describes Beauty without contradictory transportation language", () => {
    const prompt = buildAskSystemPrompt("Beauty Studio", "beauty");
    expect(prompt).toContain("owner of a beauty business");
    expect(prompt).not.toContain("luxury transportation business");
    expect(prompt).toContain("never invent");
  });

  it("keeps the existing Rides wording by default", () => {
    expect(buildAskSystemPrompt("Rides Studio")).toContain(
      "luxury transportation business",
    );
  });
});
