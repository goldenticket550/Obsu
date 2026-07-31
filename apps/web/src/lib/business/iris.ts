/**
 * Gate 1 — the Eclipse Iris orb's state model. PURE.
 *
 * Deliberately NOT a twelve-value union. `lib/business/orb.ts` already owns the
 * twelve-state interaction machine and keeps its callers; this is a different
 * question with a different answer, so it gets its own small model rather than
 * a thirteenth case bolted onto that one.
 *
 * Two independent dimensions, because they genuinely vary independently:
 *
 *   CapabilityStatus  — can this machine do the thing at all? A missing API
 *                       key and a denied microphone are both "unavailable" to
 *                       a user, and completely different to an operator, so
 *                       they are different values here.
 *   InteractionPhase  — is a request in flight right now?
 *
 * The visual is DERIVED from both. Collapsing them into one enum would force
 * every caller to know which combinations are legal, which is exactly how a
 * component ends up setting an impossible state.
 */

export type CapabilityStatus =
  /** Not yet determined. Treated as working, because nothing says otherwise. */
  | "unknown"
  | "available"
  /** The feature exists but this deployment has no credentials for it. */
  | "not_configured"
  /** This browser or device cannot do it. */
  | "unsupported"
  /** The person said no. Distinct from unsupported: retrying may help. */
  | "permission_denied"
  /** A provider is down or rate-limited. Distinct from denied: not the user. */
  | "temporarily_unavailable";

export type InteractionPhase =
  | "idle"
  /** A request is in flight. */
  | "requesting_response"
  /** A response is on screen being read. */
  | "presenting_response";

/** What the orb actually renders. Four treatments, no more. */
export type IrisVisualState = "ready" | "working" | "attention" | "unavailable";

export interface IrisControllerState {
  capability: CapabilityStatus;
  phase: InteractionPhase;
  /**
   * Whether the Command Center currently has something the owner must act on —
   * the same condition that produces "1 ride needs closing out".
   */
  needsAttention: boolean;
}

/**
 * The single derivation. Total and exhaustive over CapabilityStatus, with a
 * never-check, so adding a status fails the type check until it is handled.
 *
 * Order is the design:
 *   1. A capability that cannot run outranks everything. Showing "working" on
 *      a machine that cannot work would be a lie about the machine.
 *   2. A request in flight outranks a standing alert, because it is happening
 *      NOW and resolves in seconds.
 *   3. Otherwise a real, actionable problem shows amber.
 *   4. Otherwise: ready.
 */
export function deriveIrisVisualState(state: IrisControllerState): IrisVisualState {
  switch (state.capability) {
    case "not_configured":
    case "unsupported":
    case "permission_denied":
    case "temporarily_unavailable":
      return "unavailable";
    case "unknown":
    case "available":
      break;
    default: {
      const exhaustive: never = state.capability;
      return exhaustive;
    }
  }

  if (state.phase === "requesting_response") return "working";
  return state.needsAttention ? "attention" : "ready";
}

/**
 * The words a screen reader announces. The orb is decorative; THIS is the
 * information, and it is never carried by colour or motion alone.
 *
 * No language implying consciousness or hidden reasoning — the machine is
 * processing a request, not thinking about one.
 */
export function irisStatusText(visual: IrisVisualState): string {
  switch (visual) {
    case "ready":
      return "Ready";
    case "working":
      return "Processing request";
    case "attention":
      return "Needs your attention";
    case "unavailable":
      return "Unavailable";
    default: {
      const exhaustive: never = visual;
      return exhaustive;
    }
  }
}

/** One concentric dial ring. Every field is a literal — see DIAL_LAYER_A/B. */
export interface DialRing {
  r: number;
  w: number;
  o: number;
  /** SVG stroke-dasharray, or null for a solid ring. */
  dash: string | null;
}

/**
 * FIXED GEOMETRY. No Math.random anywhere in the render path.
 *
 * Randomised render-time geometry produces server/client hydration mismatches
 * and tests that cannot assert anything. These are literals so two renders —
 * on the server and in the browser — are byte-identical.
 */
export const DIAL_LAYER_A: readonly DialRing[] = [
  { r: 44, w: 0.5, o: 0.13, dash: "1 3" },
  { r: 40, w: 0.7, o: 0.3, dash: null },
  { r: 36, w: 1.1, o: 0.45, dash: ".6 2.2" },
  { r: 26, w: 0.8, o: 0.55, dash: null },
  { r: 13, w: 0.9, o: 0.8, dash: null },
];

export const DIAL_LAYER_B: readonly DialRing[] = [
  { r: 31, w: 3, o: 0.2, dash: "6 4" },
  { r: 22, w: 1.6, o: 0.6, dash: ".5 1.6" },
  { r: 17, w: 4, o: 0.14, dash: null },
  { r: 9, w: 1.4, o: 0.9, dash: ".4 1.2" },
];
