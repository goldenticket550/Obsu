/**
 * V2 — microphone permission. Its own module, per the separation of concerns.
 *
 * This module ONLY asks for the microphone and reports what the answer was. It
 * does not record, does not analyse, does not touch the orb, and does not
 * decide what happens next.
 *
 * The privacy rule it enforces: **never auto-request on page load, never record
 * without a direct user action.** That is enforced structurally, not by comment
 * — `requestMicrophone` demands a `UserGesture`, and the only way to obtain one
 * is `userGesture()`, which is called from an event handler. A module-scope or
 * effect-time call has nothing to pass it.
 *
 * The browser API is injected so the decision logic is testable in node.
 */

/**
 * Proof that a real person did something. Deliberately opaque: it cannot be
 * constructed by a caller, only obtained from `userGesture()` at the point an
 * event is being handled.
 */
declare const gestureBrand: unique symbol;
export interface UserGesture {
  readonly [gestureBrand]: true;
}

/**
 * Mints the token. Call this INSIDE a click/tap/keypress handler and nowhere
 * else — it is the seam that keeps capture tied to an intentional act.
 */
export function userGesture(): UserGesture {
  return {} as UserGesture;
}

export type MicPermission =
  /** Not asked yet. */
  | { kind: "unasked" }
  /** This browser or context cannot do it at all. */
  | { kind: "unsupported"; reason: "no_api" | "insecure_context" }
  | { kind: "granted"; stream: MediaStream }
  /** The person said no, or the browser remembers that they did. */
  | { kind: "denied" }
  /** The prompt was closed without an answer. Not the same as "no". */
  | { kind: "dismissed" }
  /** Permission was fine; there is no input device to grant. */
  | { kind: "no_device" }
  /** The device exists and something else is holding it. */
  | { kind: "in_use" }
  /** Something we do not recognise. Reported, never swallowed. */
  | { kind: "failed"; detail: string };

export interface MicDeps {
  /** Normally `navigator.mediaDevices.getUserMedia`, bound. Null when absent. */
  getUserMedia: ((c: MediaStreamConstraints) => Promise<MediaStream>) | null;
  /** Normally `window.isSecureContext`. getUserMedia is unavailable without it. */
  isSecureContext: boolean;
}

/**
 * Maps a getUserMedia rejection onto a state.
 *
 * The names come from the Media Capture spec. They are checked by `name`, not
 * by message text, because messages are localized and vendor-specific.
 */
export function classifyMicError(error: unknown): MicPermission {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String((error as { name: unknown }).name)
      : "";

  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return { kind: "denied" };
    case "AbortError":
      return { kind: "dismissed" };
    case "NotFoundError":
    case "DevicesNotFoundError":
      return { kind: "no_device" };
    case "NotReadableError":
    case "TrackStartError":
      return { kind: "in_use" };
    case "SecurityError":
      return { kind: "unsupported", reason: "insecure_context" };
    default: {
      const detail =
        error instanceof Error && error.message
          ? error.message
          : name || "The microphone could not be opened.";
      return { kind: "failed", detail };
    }
  }
}

/**
 * Asks for the microphone. Requires a user gesture — see `UserGesture`.
 *
 * Returns a live stream on success. The CALLER owns that stream and must hand
 * it to the capture module, which is what stops it again; this module never
 * holds one, so it cannot leak one.
 */
export async function requestMicrophone(
  _gesture: UserGesture,
  deps: MicDeps,
): Promise<MicPermission> {
  if (!deps.isSecureContext) {
    return { kind: "unsupported", reason: "insecure_context" };
  }
  if (!deps.getUserMedia) return { kind: "unsupported", reason: "no_api" };

  try {
    const stream = await deps.getUserMedia({ audio: true });
    return { kind: "granted", stream };
  } catch (error) {
    return classifyMicError(error);
  }
}

export interface MicPermissionCopy {
  message: string;
  /** The one action worth offering, or null when there is nothing to suggest. */
  suggestion: string | null;
  /** Whether asking again could plausibly change the answer. */
  retryable: boolean;
}

/** Exhaustive. A new permission state fails the type check until it has words. */
export function micPermissionCopy(state: MicPermission): MicPermissionCopy {
  switch (state.kind) {
    case "unasked":
      return {
        message: "Tap to speak.",
        suggestion: null,
        retryable: true,
      };
    case "granted":
      return { message: "Listening.", suggestion: null, retryable: false };
    case "denied":
      return {
        message: "Microphone access is blocked.",
        // Re-asking cannot help: once blocked, the browser stops prompting.
        suggestion:
          "Allow the microphone for this site in your browser's address-bar settings, then reload.",
        retryable: false,
      };
    case "dismissed":
      return {
        message: "The microphone prompt was closed.",
        suggestion: "Tap again and choose Allow.",
        retryable: true,
      };
    case "no_device":
      return {
        message: "No microphone was found.",
        suggestion: "Connect one, then try again.",
        retryable: true,
      };
    case "in_use":
      return {
        message: "Another app is using the microphone.",
        suggestion: "Close it — a call or meeting window is the usual cause.",
        retryable: true,
      };
    case "unsupported":
      return state.reason === "insecure_context"
        ? {
            message: "Voice needs a secure connection.",
            suggestion: "Open this site over https and try again.",
            retryable: false,
          }
        : {
            message: "This browser can't record audio.",
            suggestion: "Type your question instead.",
            retryable: false,
          };
    case "failed":
      return {
        message: "The microphone couldn't be opened.",
        suggestion: state.detail,
        retryable: true,
      };
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}
