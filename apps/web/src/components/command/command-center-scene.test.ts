import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const COMPONENT = join(
  process.cwd(),
  "src",
  "components",
  "command",
  "command-center-scene.tsx",
);

describe("the interactive atmosphere stays decorative and disciplined", () => {
  it("is hidden from assistive technology and cannot intercept input", () => {
    const source = readFileSync(COMPONENT, "utf8");
    expect(source).toContain('aria-hidden="true"');
    const css = readFileSync(COMPONENT.replace(/\.tsx$/, ".module.css"), "utf8");
    expect(css).toContain("pointer-events: none");
  });

  it("uses deterministic geometry with no animation loop", () => {
    const source = readFileSync(COMPONENT, "utf8");
    expect(source).not.toMatch(/Math\.random|Date\.now|requestAnimationFrame|canvas|WebGL/);
    expect(source).toContain("FAR_WINDOWS");
    expect(source).toContain("NEAR_WINDOWS");
  });

  it("cleans passive pointer listeners and stops work while hidden", () => {
    const source = readFileSync(COMPONENT, "utf8");
    expect(source).toContain('{ passive: true }');
    expect(source).toContain('document.visibilityState !== "visible"');
    const added = (source.match(/addEventListener\(/g) ?? []).length;
    const removed = (source.match(/removeEventListener\(/g) ?? []).length;
    expect(removed).toBe(added);
  });
});
