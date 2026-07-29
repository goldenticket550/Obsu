/**
 * V1 — the orb state machine. PURE: no React, no DOM, no fetch, no clock.
 *
 * The orb is a STATE DISPLAY, not a controller. Components report an event;
 * this file decides the resulting state. That is what stops the orb lying
 * about what the system is actually doing — no component may set an arbitrary
 * state, and no appearance is computed from a second source.
 *
 * Every variant carries exactly the data that variant needs and nothing more.
 * That is deliberate and load-bearing: it makes "an error message while idle"
 * or "a transcript while offline" unrepresentable rather than merely unlikely.
 */

export type OrbState =
  /** At rest. Carries nothing — an idle orb knows nothing. */
  | { kind: "idle" }
  /** The browser's microphone prompt is open. Not capturing yet. */
  | { kind: "requesting_permission" }
  /** Capturing audio. `level` is live amplitude, 0..1. */
  | { kind: "listening"; level: number }
  /** Audio captured, being turned into text. */
  | { kind: "transcribing" }
  /** Working on an answer. Holds the transcript it is working FROM. */
  | { kind: "thinking"; transcript: string }
  /** Playing a spoken answer. `level` is playback amplitude, 0..1. */
  | { kind: "speaking"; level: number }
  /** An action is proposed and awaiting approval (V3 produces this). */
  | { kind: "action_proposed"; summary: string }
  /** An approved action is running (V3 produces this). Not interruptible. */
  | { kind: "executing"; summary: string }
  /** Transient confirmation. Carries nothing — success needs no explanation. */
  | { kind: "success" }
  /** Completed, but with something the operator should know. */
  | { kind: "warning"; message: string }
  /** Failed. Carries why. */
  | { kind: "error"; message: string }
  /** No connection. Carries nothing — offline knows no transcript. */
  | { kind: "offline" };

export type OrbKind = OrbState["kind"];

/** Every state kind, for exhaustive iteration in tests. */
export const ORB_KINDS: OrbKind[] = [
  "idle",
  "requesting_permission",
  "listening",
  "transcribing",
  "thinking",
  "speaking",
  "action_proposed",
  "executing",
  "success",
  "warning",
  "error",
  "offline",
];

export type OrbEvent =
  /** The user asked to talk; the permission prompt is about to open. */
  | { type: "permission_requested" }
  | { type: "permission_granted" }
  | { type: "permission_denied" }
  /** Live amplitude tick. Only meaningful while listening or speaking. */
  | { type: "level_changed"; level: number }
  /** Capture ended (silence, tap, or cap) — audio is on its way to be read. */
  | { type: "capture_stopped" }
  | { type: "transcript_ready"; transcript: string }
  | { type: "answer_ready" }
  | { type: "playback_finished" }
  /** V3 emits these; V1 defines them so the machine is total. */
  | { type: "proposal_received"; summary: string }
  | { type: "proposal_approved" }
  | { type: "proposal_rejected" }
  | { type: "execution_finished" }
  | { type: "warned"; message: string }
  | { type: "failed"; message: string }
  | { type: "went_offline" }
  | { type: "came_online" }
  /** The user dismissed a result, or cancelled what was in flight. */
  | { type: "dismissed" }
  | { type: "cancelled" };

export type OrbEventType = OrbEvent["type"];

export const ORB_EVENT_TYPES: OrbEventType[] = [
  "permission_requested",
  "permission_granted",
  "permission_denied",
  "level_changed",
  "capture_stopped",
  "transcript_ready",
  "answer_ready",
  "playback_finished",
  "proposal_received",
  "proposal_approved",
  "proposal_rejected",
  "execution_finished",
  "warned",
  "failed",
  "went_offline",
  "came_online",
  "dismissed",
  "cancelled",
];

export const IDLE: OrbState = { kind: "idle" };

/** Clamp an amplitude into 0..1 so a bad reading cannot distort the orb. */
function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 0;
  if (level < 0) return 0;
  if (level > 1) return 1;
  return level;
}

/**
 * The single transition function. TOTAL: every (state, event) pair has a
 * defined result.
 *
 * An event that is meaningless in the current state returns the state
 * UNCHANGED — it never throws, and it never moves somewhere merely plausible.
 * A late amplitude tick arriving after playback ends must not resurrect
 * `speaking`, and a stray `answer_ready` while idle must not invent one.
 *
 * Two rules override everything, because they describe reality rather than
 * intent:
 *   • `went_offline` and `failed` can interrupt anything — except `executing`,
 *     which must report its own outcome rather than being yanked out from
 *     under an action that may already have written to the database.
 *   • `cancelled` returns to idle from anything the user can still back out
 *     of, and is ignored while executing for the same reason.
 */
export function transition(state: OrbState, event: OrbEvent): OrbState {
  switch (event.type) {
    case "went_offline":
      // Losing the network while an action is mid-flight does not un-run it.
      return state.kind === "executing" ? state : { kind: "offline" };

    case "came_online":
      return state.kind === "offline" ? IDLE : state;

    case "failed":
      return state.kind === "executing"
        ? state
        : { kind: "error", message: event.message };

    case "warned":
      return { kind: "warning", message: event.message };

    case "cancelled":
      return state.kind === "executing" ? state : IDLE;

    case "dismissed":
      // Only clears a resting result; never interrupts work in progress.
      return state.kind === "success" ||
        state.kind === "warning" ||
        state.kind === "error"
        ? IDLE
        : state;

    case "permission_requested":
      return state.kind === "idle" ? { kind: "requesting_permission" } : state;

    case "permission_granted":
      return state.kind === "requesting_permission"
        ? { kind: "listening", level: 0 }
        : state;

    case "permission_denied":
      return state.kind === "requesting_permission"
        ? {
            kind: "error",
            message:
              "Microphone access is blocked. Allow the mic for this site, then try again.",
          }
        : state;

    case "level_changed":
      // Amplitude is only meaningful where the orb is actually moving to it.
      if (state.kind === "listening") {
        return { kind: "listening", level: clampLevel(event.level) };
      }
      if (state.kind === "speaking") {
        return { kind: "speaking", level: clampLevel(event.level) };
      }
      return state;

    case "capture_stopped":
      return state.kind === "listening" ? { kind: "transcribing" } : state;

    case "transcript_ready":
      return state.kind === "transcribing"
        ? { kind: "thinking", transcript: event.transcript }
        : state;

    case "answer_ready":
      return state.kind === "thinking" ? { kind: "speaking", level: 0 } : state;

    case "playback_finished":
      return state.kind === "speaking" ? IDLE : state;

    case "proposal_received":
      return state.kind === "thinking"
        ? { kind: "action_proposed", summary: event.summary }
        : state;

    case "proposal_approved":
      return state.kind === "action_proposed"
        ? { kind: "executing", summary: state.summary }
        : state;

    case "proposal_rejected":
      return state.kind === "action_proposed" ? IDLE : state;

    case "execution_finished":
      return state.kind === "executing" ? { kind: "success" } : state;

    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

export interface OrbCopy {
  /** Short status line, e.g. "Listening…". */
  label: string;
  /** Extra context when the state carries some; null otherwise. */
  detail: string | null;
  /**
   * Semantic tone, mapped to the project's fixed colour meanings by the
   * component. Never the only signal — the label always carries words.
   */
  tone: "neutral" | "active" | "positive" | "warning" | "danger";
  /** True where no agreed visual exists yet (V3 states). */
  placeholder?: true;
}

/**
 * All orb copy in one place — same pattern as closeOutCopy. Exhaustive over
 * the union with a never-check, so adding a state fails to compile until its
 * presentation exists. No component writes orb strings inline.
 */
export function orbCopy(state: OrbState): OrbCopy {
  switch (state.kind) {
    case "idle":
      return { label: "Ready", detail: null, tone: "neutral" };
    case "requesting_permission":
      return {
        label: "Waiting for microphone",
        detail: "Allow access to continue.",
        tone: "active",
      };
    case "listening":
      return { label: "Listening…", detail: null, tone: "active" };
    case "transcribing":
      return { label: "Writing that down…", detail: null, tone: "active" };
    case "thinking":
      return { label: "Thinking…", detail: state.transcript || null, tone: "active" };
    case "speaking":
      return { label: "Speaking…", detail: null, tone: "active" };
    case "action_proposed":
      // V3 owns the approval interface; V1 shows a labelled placeholder rather
      // than inventing a design for it.
      return {
        label: "Action proposed",
        detail: state.summary,
        tone: "warning",
        placeholder: true,
      };
    case "executing":
      return {
        label: "Working…",
        detail: state.summary,
        tone: "active",
        placeholder: true,
      };
    case "success":
      return { label: "Done", detail: null, tone: "positive" };
    case "warning":
      return { label: "Check this", detail: state.message, tone: "warning" };
    case "error":
      return { label: "Didn't work", detail: state.message, tone: "danger" };
    case "offline":
      return {
        label: "Offline",
        detail: "No connection right now.",
        tone: "warning",
      };
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

/** Live amplitude for the animation, 0 where the state has none. */
export function orbLevel(state: OrbState): number {
  return state.kind === "listening" || state.kind === "speaking"
    ? state.level
    : 0;
}
