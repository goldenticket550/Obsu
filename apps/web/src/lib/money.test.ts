import { describe, expect, it } from "vitest";
import { formatUsdForSpeech } from "./money";

describe("speech-friendly money", () => {
  it("reads whole dollars without symbols or decimal notation", () => {
    expect(formatUsdForSpeech(50000)).toBe("500 dollars");
    expect(formatUsdForSpeech(100)).toBe("1 dollar");
  });

  it("reads cents as words joined to dollars", () => {
    expect(formatUsdForSpeech(50025)).toBe("500 dollars and 25 cents");
    expect(formatUsdForSpeech(1)).toBe("1 cent");
    expect(formatUsdForSpeech(101)).toBe("1 dollar and 1 cent");
  });

  it("speaks negative values and safely handles non-finite input", () => {
    expect(formatUsdForSpeech(-525)).toBe("negative 5 dollars and 25 cents");
    expect(formatUsdForSpeech(Number.NaN)).toBe("0 dollars");
  });
});