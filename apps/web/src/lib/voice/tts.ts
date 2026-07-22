/**
 * M11 — text-to-speech behind a swappable interface. The default is the free
 * browser SpeechSynthesis. A future ElevenLabs implementation (fetching audio
 * from a server route and playing it via an <audio>/AnalyserNode) can implement
 * ObsidianTts and drop in without touching the voice UI.
 *
 * Client-only (uses `window`); imported by the "use client" voice component.
 */

export interface ObsidianTts {
  readonly name: string;
  /** Speak `text`; calls onStart when audio begins and onEnd when it finishes (or errors). */
  speak(text: string, opts?: { onStart?: () => void; onEnd?: () => void }): void;
  cancel(): void;
}

class BrowserTts implements ObsidianTts {
  readonly name = "browser";

  speak(text: string, opts?: { onStart?: () => void; onEnd?: () => void }): void {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      opts?.onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1;
    u.pitch = 1;
    u.onstart = () => opts?.onStart?.();
    u.onend = () => opts?.onEnd?.();
    u.onerror = () => opts?.onEnd?.();
    window.speechSynthesis.speak(u);
  }

  cancel(): void {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}

/** The default TTS. Swap this factory to change the voice everywhere. */
export function createDefaultTts(): ObsidianTts {
  return new BrowserTts();
}
