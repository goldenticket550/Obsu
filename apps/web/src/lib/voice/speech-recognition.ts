/**
 * M11 — thin wrapper over the browser Web Speech API (SpeechRecognition).
 * Free, no key, works in Chrome/Edge. Client-only. The types below are minimal
 * hand-declared shapes since SpeechRecognition isn't in the standard TS lib.
 */

export interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
}
export interface SpeechRecognitionResultLike {
  readonly 0: SpeechRecognitionAlternativeLike;
  readonly isFinal: boolean;
  readonly length: number;
}
export interface SpeechRecognitionEventLike {
  readonly results: {
    readonly length: number;
    readonly [index: number]: SpeechRecognitionResultLike;
  };
  readonly resultIndex: number;
}
export interface SpeechRecognitionErrorLike {
  readonly error?: string;
}
export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** True when the browser supports speech recognition (Chrome/Edge desktop). */
export function speechSupported(): boolean {
  return getCtor() !== null;
}

/** A fresh SpeechRecognition instance, or null if unsupported. */
export function createRecognition(): SpeechRecognitionLike | null {
  const Ctor = getCtor();
  return Ctor ? new Ctor() : null;
}

/** Build the (possibly interim) transcript and whether a final result arrived. */
export function extractTranscript(e: SpeechRecognitionEventLike): {
  text: string;
  final: boolean;
} {
  let text = "";
  let final = false;
  for (let i = 0; i < e.results.length; i++) {
    const result = e.results[i];
    if (!result) continue;
    text += result[0].transcript;
    if (result.isFinal) final = true;
  }
  return { text: text.trim(), final };
}
