import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DIAL_LAYER_A,
  DIAL_LAYER_B,
  deriveIrisVisualState,
  irisStatusText,
  type CapabilityStatus,
  type InteractionPhase,
  type IrisControllerState,
  type IrisVisualState,
} from "./iris";

/**
 * Gate 1 — the Eclipse Iris orb.
 *
 * The orb is decorative; the STATUS is the information. These tests hold the
 * line on three things that are easy to lose: the derivation stays total, the
 * geometry stays deterministic, and the orb never claims to be listening.
 */

const SRC = join(process.cwd(), "src");
const IRIS_TSX = join(SRC, "components", "command", "eclipse-iris.tsx");
const IRIS_CSS = join(SRC, "components", "command", "eclipse-iris.module.css");
const IRIS_TS = join(SRC, "lib", "business", "iris.ts");

const ALL_CAPABILITIES: CapabilityStatus[] = [
  "unknown",
  "available",
  "not_configured",
  "unsupported",
  "permission_denied",
  "temporarily_unavailable",
];
const ALL_PHASES: InteractionPhase[] = [
  "idle",
  "requesting_response",
  "presenting_response",
];

/* ================================================================== */
/* The derivation                                                      */
/* ================================================================== */

describe("deriveIrisVisualState is total", () => {
  it("answers for every capability × phase × attention combination", () => {
    const seen = new Set<IrisVisualState>();
    let combinations = 0;
    for (const capability of ALL_CAPABILITIES) {
      for (const phase of ALL_PHASES) {
        for (const needsAttention of [true, false]) {
          const visual = deriveIrisVisualState({ capability, phase, needsAttention });
          expect(["ready", "working", "attention", "unavailable"]).toContain(visual);
          seen.add(visual);
          combinations += 1;
        }
      }
    }
    expect(combinations).toBe(ALL_CAPABILITIES.length * ALL_PHASES.length * 2);
    // Every treatment is genuinely reachable — none is dead code.
    expect([...seen].sort()).toEqual(["attention", "ready", "unavailable", "working"]);
  });

  it("rests at ready", () => {
    expect(
      deriveIrisVisualState({
        capability: "available",
        phase: "idle",
        needsAttention: false,
      }),
    ).toBe("ready");
  });

  it("shows working while a request is in flight", () => {
    expect(
      deriveIrisVisualState({
        capability: "available",
        phase: "requesting_response",
        needsAttention: false,
      }),
    ).toBe("working");
  });

  it("shows attention when the Command Center has something to act on", () => {
    expect(
      deriveIrisVisualState({
        capability: "available",
        phase: "idle",
        needsAttention: true,
      }),
    ).toBe("attention");
  });

  /** A request happening NOW outranks a standing alert; it resolves in seconds. */
  it("a request in flight outranks a standing alert", () => {
    expect(
      deriveIrisVisualState({
        capability: "available",
        phase: "requesting_response",
        needsAttention: true,
      }),
    ).toBe("working");
  });

  /** A machine that cannot run must not claim to be working. */
  it("an unusable capability outranks everything", () => {
    for (const capability of [
      "not_configured",
      "unsupported",
      "permission_denied",
      "temporarily_unavailable",
    ] as CapabilityStatus[]) {
      for (const phase of ALL_PHASES) {
        expect(
          deriveIrisVisualState({ capability, phase, needsAttention: true }),
        ).toBe("unavailable");
      }
    }
  });

  /**
   * The distinction the whole two-dimension model exists to preserve. To a
   * user both read "unavailable"; to an operator one is a missing key and the
   * other is a person who said no, and only one of them can be fixed by asking
   * again.
   */
  it("provider unavailable does NOT imply permission denied", () => {
    const notConfigured: IrisControllerState = {
      capability: "not_configured",
      phase: "idle",
      needsAttention: false,
    };
    const denied: IrisControllerState = { ...notConfigured, capability: "permission_denied" };
    const temporary: IrisControllerState = {
      ...notConfigured,
      capability: "temporarily_unavailable",
    };

    // Same treatment…
    expect(deriveIrisVisualState(notConfigured)).toBe("unavailable");
    expect(deriveIrisVisualState(denied)).toBe("unavailable");
    expect(deriveIrisVisualState(temporary)).toBe("unavailable");
    // …but they are not the same value, and the model keeps them apart.
    expect(notConfigured.capability).not.toBe(denied.capability);
    expect(temporary.capability).not.toBe(denied.capability);
    expect(new Set(ALL_CAPABILITIES).size).toBe(6);
  });

  it("unknown is treated as usable — absence of news is not bad news", () => {
    expect(
      deriveIrisVisualState({
        capability: "unknown",
        phase: "idle",
        needsAttention: false,
      }),
    ).toBe("ready");
  });
});

describe("the status is words, not colour", () => {
  it("uses exactly the agreed wording", () => {
    expect(irisStatusText("ready")).toBe("Ready");
    expect(irisStatusText("working")).toBe("Processing request");
    expect(irisStatusText("attention")).toBe("Needs your attention");
    expect(irisStatusText("unavailable")).toBe("Unavailable");
  });

  it("gives every visual state distinct, non-empty words", () => {
    const all: IrisVisualState[] = ["ready", "working", "attention", "unavailable"];
    const words = all.map(irisStatusText);
    expect(new Set(words).size).toBe(4);
    for (const word of words) expect(word.trim().length).toBeGreaterThan(0);
  });

  /** No language implying consciousness or hidden reasoning. */
  it("never implies the machine is thinking or feeling", () => {
    const all: IrisVisualState[] = ["ready", "working", "attention", "unavailable"];
    for (const visual of all) {
      expect(irisStatusText(visual)).not.toMatch(
        /think|thought|feel|understand|consider|reason|know|remember|want/i,
      );
    }
  });
});

/* ================================================================== */
/* Deterministic geometry                                              */
/* ================================================================== */

describe("dial geometry is a stable literal", () => {
  it("matches the specified rings exactly", () => {
    expect(DIAL_LAYER_A).toEqual([
      { r: 44, w: 0.5, o: 0.13, dash: "1 3" },
      { r: 40, w: 0.7, o: 0.3, dash: null },
      { r: 36, w: 1.1, o: 0.45, dash: ".6 2.2" },
      { r: 26, w: 0.8, o: 0.55, dash: null },
      { r: 13, w: 0.9, o: 0.8, dash: null },
    ]);
    expect(DIAL_LAYER_B).toEqual([
      { r: 31, w: 3, o: 0.2, dash: "6 4" },
      { r: 22, w: 1.6, o: 0.6, dash: ".5 1.6" },
      { r: 17, w: 4, o: 0.14, dash: null },
      { r: 9, w: 1.4, o: 0.9, dash: ".4 1.2" },
    ]);
  });

  /**
   * Two "renders" of the geometry must be identical. Randomised render-time
   * values produce server/client hydration mismatches, which surface as a
   * silently re-rendered subtree rather than an error.
   */
  it("two renders produce identical markup", () => {
    const markup = (rings: readonly { r: number; w: number; o: number; dash: string | null }[]) =>
      rings
        .map(
          (ring) =>
            `<circle cx="50" cy="50" r="${ring.r}" fill="none" stroke="rgba(125, 211, 252, ${ring.o})" stroke-width="${ring.w}"${ring.dash ? ` stroke-dasharray="${ring.dash}"` : ""}/>`,
        )
        .join("");

    const first = markup(DIAL_LAYER_A) + markup(DIAL_LAYER_B);
    const second = markup(DIAL_LAYER_A) + markup(DIAL_LAYER_B);
    expect(first).toBe(second);
    expect(first).toMatchInlineSnapshot(
      `"<circle cx="50" cy="50" r="44" fill="none" stroke="rgba(125, 211, 252, 0.13)" stroke-width="0.5" stroke-dasharray="1 3"/><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(125, 211, 252, 0.3)" stroke-width="0.7"/><circle cx="50" cy="50" r="36" fill="none" stroke="rgba(125, 211, 252, 0.45)" stroke-width="1.1" stroke-dasharray=".6 2.2"/><circle cx="50" cy="50" r="26" fill="none" stroke="rgba(125, 211, 252, 0.55)" stroke-width="0.8"/><circle cx="50" cy="50" r="13" fill="none" stroke="rgba(125, 211, 252, 0.8)" stroke-width="0.9"/><circle cx="50" cy="50" r="31" fill="none" stroke="rgba(125, 211, 252, 0.2)" stroke-width="3" stroke-dasharray="6 4"/><circle cx="50" cy="50" r="22" fill="none" stroke="rgba(125, 211, 252, 0.6)" stroke-width="1.6" stroke-dasharray=".5 1.6"/><circle cx="50" cy="50" r="17" fill="none" stroke="rgba(125, 211, 252, 0.14)" stroke-width="4"/><circle cx="50" cy="50" r="9" fill="none" stroke="rgba(125, 211, 252, 0.9)" stroke-width="1.4" stroke-dasharray=".4 1.2"/>"`,
    );
  });

  it("ring keys are unique, so React cannot silently drop one", () => {
    for (const layer of [DIAL_LAYER_A, DIAL_LAYER_B]) {
      const keys = layer.map((ring) => `${ring.r}-${ring.w}`);
      expect(new Set(keys).size).toBe(layer.length);
    }
  });
});

describe("no randomness in the render path", () => {
  function orbSources(): string[] {
    const dir = join(SRC, "components", "command");
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /^eclipse-iris\./.test(entry.name))
      .map((entry) => join(dir, entry.name))
      .concat([IRIS_TS]);
  }

  /** The guard cannot pass vacuously: it must have walked real files. */
  it("walked a non-empty file list", () => {
    const files = orbSources();
    expect(files.length).toBeGreaterThanOrEqual(3);
    for (const file of files) {
      expect(readFileSync(file, "utf8").length).toBeGreaterThan(200);
    }
  });

  it("contains no Math.random, Date.now, or crypto randomness", () => {
    const offenders: string[] = [];
    for (const file of orbSources()) {
      const code = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "");
      if (/Math\.random|crypto\.randomUUID|getRandomValues|Date\.now/.test(code)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("uses a deterministic canvas with no shared SVG ids to collide", () => {
    const text = readFileSync(IRIS_TSX, "utf8");
    expect(text).toContain("EclipseIrisCanvas");
    expect(text).not.toContain("useId");
    expect(text).not.toMatch(/id="[a-z-]*dial/i);
  });
});

/* ================================================================== */
/* Motion, honesty, and class scoping                                  */
/* ================================================================== */

describe("motion and legibility", () => {
  it("reduced motion produces a no-animation class AND a media query", () => {
    const tsx = readFileSync(IRIS_TSX, "utf8");
    expect(tsx).toContain("prefers-reduced-motion: reduce");
    expect(tsx).toContain("reducedMotion={reducedMotion}");
    expect(tsx).toContain('data-reduced-motion');

    const css = readFileSync(IRIS_CSS, "utf8");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain('[data-reduced-motion="true"]');
    expect(css).toContain("animation: none");
  });

  it("every animated layer is stopped in the unavailable treatment", () => {
    const css = readFileSync(IRIS_CSS, "utf8");
    const canvas = readFileSync(
      join(SRC, "components", "command", "eclipse-iris-canvas.tsx"),
      "utf8",
    );
    const block = css.slice(css.indexOf('[data-visual="unavailable"]'), css.indexOf("@keyframes"));
    expect(block).toContain("animation: none");
    expect(canvas).toContain('if (visual === "unavailable") return 0');
  });

  /**
   * Amber is the warning colour everywhere else in this app. An amber orb at
   * rest would be claiming something is wrong every second of the day.
   */
  it("uses the approved gold identity without turning alert state red", () => {
    const css = readFileSync(IRIS_CSS, "utf8");
    expect(css).toContain("#ffb52f");
    const alertBlock = css.slice(css.indexOf('[data-visual="attention"]'));
    expect(alertBlock).not.toMatch(/#ff6268|rgb\(255 98 104/);
  });
});

describe("the orb never claims a capability the app does not have", () => {
  it("renders none of the voice words", () => {
    for (const file of [IRIS_TSX, IRIS_CSS, IRIS_TS]) {
      const text = readFileSync(file, "utf8");
      expect(text).not.toContain("Listening");
      expect(text).not.toContain("Transcribing");
      expect(text).not.toContain("Speaking");
    }
  });

  it("no visual state can produce those strings", () => {
    const all: IrisVisualState[] = ["ready", "working", "attention", "unavailable"];
    for (const visual of all) {
      const text = irisStatusText(visual);
      expect(text).not.toMatch(/listen|transcrib|speak/i);
    }
  });

  it("the orb component opens no microphone and makes no request", () => {
    const text = readFileSync(IRIS_TSX, "utf8");
    for (const forbidden of [
      "getUserMedia",
      "MediaRecorder",
      "fetch(",
      "submitTranscript",
      "audio-capture",
      "mic-permission",
    ]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("is decorative: aria-hidden layers, with the status as text", () => {
    const text = readFileSync(IRIS_TSX, "utf8");
    expect(text).toContain("aria-hidden");
    expect(text).toContain('role="status"');
    expect(text).toContain("sr-only");
  });
});

/**
 * The collision that cost three wrong hypotheses: an orb layer named `.shell`
 * inherited `display:flex; min-height:100vh` from a page-layout rule, and with
 * border-radius:50% painted a 100vh ellipse across every sphere. A CSS module
 * removes the shared namespace, so it cannot recur.
 */
describe("class scoping", () => {
  it("the orb uses a CSS module, not global class names", () => {
    const text = readFileSync(IRIS_TSX, "utf8");
    expect(text).toContain('from "./eclipse-iris.module.css"');
    // Every class on an orb element comes from the module.
    expect(text).not.toMatch(/className="(?!sr-only)[a-z]/);
  });

  it("no orb layer name leaks into the global stylesheet", () => {
    const globals = readFileSync(join(SRC, "app", "globals.css"), "utf8");
    for (const name of [
      "root",
      "sphere",
      "rim",
      "core",
      "gloss",
      "lance",
      "shell",
      "terminator",
      "specular",
      "dialLayer",
      "ambientGlow",
      "floorBounce",
    ]) {
      expect(globals).not.toContain(`.${name}`);
    }
  });
});
