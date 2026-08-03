import { mayRetryAutomatically } from "./speech-outcome";

/**
 * V2 — the browser side of audio → text. Its own module because it owns the
 * browser/server line: it is the only place recorded audio leaves the page, and
 * it leaves to OUR route, never to a provider.
 *
 * No provider key is reachable from here, and none needs to be: the route holds
 * the key and makes the provider call server-side.
 *
 * Audio is passed straight from the capture module to one fetch and then
 * dropped. It is never written to disk, never cached, never put in storage, and
 * never sent anywhere but this one request.
 */

export type TranscriptionResult =
  | { kind: "transcribed"; text: string }
  /** The request succeeded and there were no words in it. */
  | { kind: "no_speech" }
  /** Reported, and then it waits for the person. See below. */
  | { kind: "failed"; message: string };

export interface TranscribeDeps {
  /** Normally `fetch`, bound. Injected so the boundary is testable. */
  fetch: typeof fetch;
}

/** Names the upload after the container the recorder actually produced. */
export function audioFileName(mimeType: string): string {
  const type = mimeType.toLowerCase();
  if (type.includes("mp4") || type.includes("m4a")) return "audio.mp4";
  if (type.includes("ogg")) return "audio.ogg";
  if (type.includes("wav")) return "audio.wav";
  if (type.includes("mpeg") || type.includes("mp3")) return "audio.mp3";
  return "audio.webm";
}

/**
 * Sends one recording for transcription. EXACTLY ONE ATTEMPT.
 *
 * There is no retry here and there must not be one. Transcription is metered,
 * so an automatic retry spends the owner's money on a request they did not ask
 * for — and a retry loop against a provider that is down spends it repeatedly,
 * fastest at the exact moment something is wrong. A failure is reported and the
 * person decides whether to try again. `mayRetryAutomatically()` is the written
 * form of that rule.
 */
export async function transcribe(
  audio: Blob,
  deps: TranscribeDeps,
): Promise<TranscriptionResult> {
  if (mayRetryAutomatically()) {
    throw new Error("unreachable: automatic retries against a paid provider");
  }

  const form = new FormData();
  form.append("audio", audio, audioFileName(audio.type));

  let response: Response;
  try {
    response = await deps.fetch.call(globalThis, "/api/voice/transcribe", {
      method: "POST",
      body: form,
    });
  } catch {
    return {
      kind: "failed",
      message: "Couldn't reach the server. Check your connection and try again.",
    };
  }

  const payload = (await response.json().catch(() => ({}))) as {
    text?: string;
    error?: string;
  };

  if (!response.ok) {
    return {
      kind: "failed",
      message: payload.error || "That couldn't be transcribed. Try again.",
    };
  }

  const text = String(payload.text ?? "").trim();
  return text ? { kind: "transcribed", text } : { kind: "no_speech" };
}
