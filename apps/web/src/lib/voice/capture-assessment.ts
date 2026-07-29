/**
 * V2 — what actually came out of the microphone. PURE.
 *
 * This module exists because of a real failure that cost hours: the browser
 * granted permission, MediaRecorder ran, chunks arrived, and the recording
 * contained nothing but silence. The interface said "no audio was captured",
 * which is true and useless — it does not distinguish "you tapped and released
 * too fast" from "your operating system is handing this browser a dead input".
 *
 * Those need different responses from the person holding the phone, so they are
 * different states here, and the wording for each is derived from the state
 * rather than written at the call site.
 *
 * Nothing in here touches a browser API. It is handed the numbers a finished
 * capture produced and answers one question about them.
 */

/** Below this peak amplitude (0..1) a capture is indistinguishable from silence. */
export const SILENCE_PEAK_THRESHOLD = 0.02;

/** Shorter than this and there was never enough audio to transcribe. */
export const MIN_CAPTURE_MS = 350;

/**
 * A recording under this many bytes carries container headers and no meaningful
 * payload. Kept separate from duration: a long recording that produced almost
 * no bytes means the encoder never received frames, which is a different fault
 * from a short one.
 */
export const MIN_CAPTURE_BYTES = 1024;

export interface CaptureMeasurements {
  /** Total bytes across every chunk the recorder emitted. */
  bytes: number;
  /** Wall-clock duration of the capture. */
  durationMs: number;
  /**
   * Highest amplitude the analyser observed, 0..1. Null when no analyser ran —
   * absence of a measurement is not a measurement of silence.
   */
  peakLevel: number | null;
}

export type CaptureAssessment =
  | { kind: "usable" }
  /** The recorder produced no bytes at all. */
  | { kind: "empty" }
  /** Released almost immediately — a tap, not a sentence. */
  | { kind: "too_short"; durationMs: number }
  /** Bytes arrived, but the encoder was clearly starved. */
  | { kind: "no_signal"; bytes: number }
  /** Long enough, big enough, and flat. The input is live but hearing nothing. */
  | { kind: "silent"; peakLevel: number };

/**
 * Diagnoses a completed capture.
 *
 * Order matters and is deliberate: each check rules out a cause that would make
 * the later checks meaningless. A zero-byte recording has no peak to interpret;
 * a 40ms recording is expected to be quiet.
 */
export function assessCapture(m: CaptureMeasurements): CaptureAssessment {
  if (m.bytes <= 0) return { kind: "empty" };
  if (m.durationMs < MIN_CAPTURE_MS) {
    return { kind: "too_short", durationMs: m.durationMs };
  }
  if (m.bytes < MIN_CAPTURE_BYTES) return { kind: "no_signal", bytes: m.bytes };
  // Null means nothing measured the level. That is not evidence of silence, so
  // the capture is allowed through rather than blamed on the microphone.
  if (m.peakLevel !== null && m.peakLevel < SILENCE_PEAK_THRESHOLD) {
    return { kind: "silent", peakLevel: m.peakLevel };
  }
  return { kind: "usable" };
}

export interface CaptureCopy {
  /** What happened, in the operator's words. Null when nothing went wrong. */
  message: string | null;
  /** The single most useful next move, or null when there is nothing to do. */
  suggestion: string | null;
  /** Whether this capture is worth sending to transcription. */
  usable: boolean;
}

/**
 * Exhaustive: a new assessment kind fails the type check until it has wording.
 *
 * None of these blame the operator for a fault that isn't theirs, and none of
 * them claims to know something it cannot. "Silent" says the microphone was
 * reached and heard nothing — it does not assert which of a dozen OS-level
 * causes it was.
 */
export function captureCopy(assessment: CaptureAssessment): CaptureCopy {
  switch (assessment.kind) {
    case "usable":
      return { message: null, suggestion: null, usable: true };
    case "empty":
      return {
        message: "The recording came back empty.",
        suggestion: "Try once more. If it keeps happening, reload the page.",
        usable: false,
      };
    case "too_short":
      return {
        message: "That was too quick to catch.",
        suggestion: "Hold it a moment longer and speak right after the tone.",
        usable: false,
      };
    case "no_signal":
      return {
        message: "The microphone opened but sent almost nothing.",
        suggestion:
          "Another app may be holding the microphone. Close it and try again.",
        usable: false,
      };
    case "silent":
      return {
        message: "Your microphone was on, and it heard silence.",
        suggestion:
          "Check that the right input is selected and unmuted in your system sound settings — the browser is getting a live but empty input.",
        usable: false,
      };
    default: {
      const exhaustive: never = assessment;
      return exhaustive;
    }
  }
}
