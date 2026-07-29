import type { OrbState } from "@/lib/business/orb";

/**
 * V2 Part 5 — when the microphone must be released. PURE.
 *
 * This is a rule, so it lives somewhere a test can reach it. Left inside the
 * component it would be a scattering of `releaseMic()` calls that are correct
 * only as long as nobody adds a state — and adding a state is exactly when a
 * microphone gets left open.
 *
 * The rule: `listening` is the ONLY state that may hold a live microphone.
 * Every other state — including error and offline, the two people forget —
 * requires it released. Unmount is not a state, so it is handled separately by
 * the component's cleanup, which calls the same single release path.
 */
export function mayHoldMicrophone(state: OrbState): boolean {
  return state.kind === "listening";
}

/** The complement, stated positively because that is how callers read it. */
export function shouldReleaseMicrophone(state: OrbState): boolean {
  return !mayHoldMicrophone(state);
}

/**
 * Whether the recording indicator should be lit.
 *
 * DERIVED from the same state the orb animates from, so the dot and the orb
 * cannot disagree. There is deliberately no separate `isRecording` flag: two
 * values answering "is the microphone open" is exactly the duplication that
 * lets an interface lie about it.
 */
export function showsRecordingIndicator(state: OrbState): boolean {
  return mayHoldMicrophone(state);
}
