import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "src", "components", "command");
const CANVAS = readFileSync(join(ROOT, "eclipse-iris-canvas.tsx"), "utf8");
const IRIS = readFileSync(join(ROOT, "eclipse-iris.tsx"), "utf8");

describe("Eclipse Iris canvas contract", () => {
  it("renders deterministic gold particles, data marks, orbital paths and restrained blue nodes", () => {
    expect(CANVAS).toContain("buildParticles(narrow ? 260 : 430)");
    expect(CANVAS).toContain("Array.from({ length: 7 }");
    expect(CANVAS).toContain("orbit.start + orbit.length");
    expect(CANVAS).toContain("context.ellipse");
    expect(CANVAS).toContain("point.index % 71");
    expect(CANVAS).toContain("53, 194, 255");
    expect(CANVAS).not.toContain("Math.random");
    expect(CANVAS).not.toMatch(/moveTo\(centerX|lineTo\(centerX/);
  });

  it("caps pixel density and reduces work on narrow screens", () => {
    expect(CANVAS).toContain("Math.min(window.devicePixelRatio || 1, 2)");
    expect(CANVAS).toContain('window.matchMedia("(max-width: 767px)")');
  });

  it("sizes before its first draw and fills the component without per-frame measurement", () => {
    expect(CANVAS).toContain("* 0.445");
    expect(CANVAS.indexOf("resize();\n    draw(performance.now())")).toBeGreaterThan(-1);
    const drawBody = CANVAS.slice(CANVAS.indexOf("const draw"), CANVAS.indexOf("const onVisibility"));
    expect(drawBody).not.toContain("getBoundingClientRect");
  });

  it("pauses while hidden or outside the viewport and cleans every resource", () => {
    expect(CANVAS).toContain("IntersectionObserver");
    expect(CANVAS).toContain('document.visibilityState === "visible"');
    expect(CANVAS).toContain("cancelAnimationFrame");
    expect(CANVAS).toContain("observer?.disconnect()");
    expect(CANVAS).toContain('removeEventListener("resize"');
    expect(CANVAS).toContain('removeEventListener("visibilitychange"');
  });

  it("has reduced-motion and canvas-unavailable fallbacks with accessible status text", () => {
    expect(IRIS).toContain("usePrefersReducedMotion");
    expect(IRIS).toContain("styles.fallback");
    expect(IRIS).toContain('role="status"');
    expect(IRIS).toContain("Eclipse Iris:");
  });
});
