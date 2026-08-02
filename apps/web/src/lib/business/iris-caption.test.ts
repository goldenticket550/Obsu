import { describe, expect, it } from "vitest";
import {
  deriveIrisVisualState,
  irisStatusText,
  type CapabilityStatus,
  type InteractionPhase,
} from "./iris";

const CAPABILITIES: CapabilityStatus[] = [
  "unknown",
  "available",
  "not_configured",
  "unsupported",
  "permission_denied",
  "temporarily_unavailable",
];
const PHASES: InteractionPhase[] = [
  "idle",
  "requesting_response",
  "presenting_response",
];

describe("the visible Iris caption shares the treatment source of truth", () => {
  it("agrees across all 36 capability, phase, and attention combinations", () => {
    let combinations = 0;
    for (const capability of CAPABILITIES) {
      for (const phase of PHASES) {
        for (const needsAttention of [false, true]) {
          const visual = deriveIrisVisualState({ capability, phase, needsAttention });
          const caption = irisStatusText(visual);
          if (visual === "attention") expect(caption).toBe("Needs your attention");
          if (visual === "ready") expect(caption).toBe("Ready");
          expect(visual === "attention" && caption === "Ready").toBe(false);
          combinations += 1;
        }
      }
    }
    expect(combinations).toBe(36);
  });
});
