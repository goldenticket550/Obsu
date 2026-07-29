/**
 * V2 Part 4 — degrade honestly when the voice is missing. PURE.
 *
 * The paid speech plan may not be active. When synthesis fails, ONE thing is
 * true and must reach the screen: the answer succeeded, and only the voice is
 * missing. Silence implies nothing happened. A spinner implies it is still
 * coming. An error banner implies the answer failed. All three are lies about a
 * question that was answered correctly.
 *
 * So a failed speak is not an error state at all — it resolves to "show the
 * text", which is what the interface was going to do anyway, plus an optional
 * quiet note explaining why nothing was said aloud.
 */

export type SpeechAttempt =
  /** Audio played to the end. */
  | { kind: "spoke" }
  /** Never started: no plan, no key, no browser support, network refused. */
  | { kind: "unavailable"; reason: string }
  /** The person stopped it. Not a fault and not worth explaining. */
  | { kind: "cancelled" };

export interface SpeechPresentation {
  /** Always true. The answer is shown whether or not it was spoken. */
  showsText: true;
  /** A quiet aside about the missing voice, or null when there is nothing to say. */
  note: string | null;
  /**
   * Whether this counts as a failure of the TURN. Always false — the answer
   * arrived. Present as a field so no caller has to re-derive it and get it
   * wrong.
   */
  turnFailed: false;
}

/** Exhaustive. A new attempt outcome fails the type check until handled. */
export function presentSpeech(attempt: SpeechAttempt): SpeechPresentation {
  switch (attempt.kind) {
    case "spoke":
      return { showsText: true, note: null, turnFailed: false };
    case "cancelled":
      // They stopped it on purpose. Explaining it would be noise.
      return { showsText: true, note: null, turnFailed: false };
    case "unavailable":
      return {
        showsText: true,
        note: "Answered — but I couldn't say it out loud just now.",
        turnFailed: false,
      };
    default: {
      const exhaustive: never = attempt;
      return exhaustive;
    }
  }
}

/**
 * Whether a failed provider call may be retried automatically.
 *
 * Always false, and it is a function so the rule has one home and a test.
 * Transcription and synthesis are metered: a retry nobody asked for spends the
 * owner's money, and a retry loop against a failing provider spends it fast.
 * A failure reports and waits for a person.
 */
export function mayRetryAutomatically(): false {
  return false;
}
