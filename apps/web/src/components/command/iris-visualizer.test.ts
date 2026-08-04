import { describe, expect, it } from "vitest";
import {
  deriveIrisVisualizerView,
  type IrisVisualizerPhase,
} from "./iris-visualizer-state";

const PHASES: IrisVisualizerPhase[] = [
  "unavailable",
  "idle",
  "listening",
  "speaking",
  "thinking",
  "processing",
  "alert",
  "offline",
  "error",
];

describe("deriveIrisVisualizerView", () => {
  it("is total for every phase with null and non-null amplitude", () => {
    let combinations = 0;
    for (const phase of PHASES) {
      for (const amplitude of [null, 0, 0.5, 1]) {
        const view = deriveIrisVisualizerView(phase, amplitude);
        expect(view.label.length).toBeGreaterThan(0);
        expect(view.detail.length).toBeGreaterThan(0);
        expect(view.level).toBeGreaterThanOrEqual(0);
        expect(view.level).toBeLessThanOrEqual(1);
        combinations += 1;
      }
    }
    expect(combinations).toBe(36);
  });

  it("rests when there is no signal", () => {
    for (const phase of PHASES) {
      expect(deriveIrisVisualizerView(phase, null)).toMatchObject({
        level: 0,
        hasSignal: false,
      });
    }
  });

  it("uses Listening only for actual listening", () => {
    for (const phase of PHASES) {
      const label = deriveIrisVisualizerView(phase, null).label;
      expect(/listening/i.test(label)).toBe(phase === "listening");
    }
  });

  it("clamps malformed amplitude without inventing motion", () => {
    expect(deriveIrisVisualizerView("listening", -1).level).toBe(0);
    expect(deriveIrisVisualizerView("listening", 2).level).toBe(1);
    expect(deriveIrisVisualizerView("listening", Number.NaN)).toMatchObject({
      level: 0,
      hasSignal: false,
    });
  });
});
