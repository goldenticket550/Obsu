/**
 * M11.1 — text-to-speech behind a swappable interface.
 *
 * Default is `ElevenLabsTts`: it POSTs the answer text to our server route
 * `/api/voice/speak` (which calls ElevenLabs with the key server-side), decodes
 * the returned MP3 through a Web Audio graph, plays it, and reports live
 * amplitude via `onLevel` so the orb pulses to the REAL voice. If the route
 * fails (no key, network, unsupported audio) it automatically falls back to the
 * free browser `SpeechSynthesis`.
 *
 * Client-only (uses `window`/AudioContext); imported by the "use client" voice
 * component. No provider key ever reaches this layer — only our own route.
 */

export interface TtsOpts {
  onStart?: () => void;
  onEnd?: () => void;
  /** Live 0..1 amplitude during playback (ElevenLabs path only). */
  onLevel?: (level: number) => void;
}

export interface ObsidianTts {
  readonly name: string;
  /** Resolves when playback finishes; rejects if it could not start (triggers fallback). */
  speak(text: string, opts?: TtsOpts): Promise<void>;
  cancel(): void;
}

export class TtsCancelledError extends Error {
  constructor() { super("Voice playback cancelled"); this.name = "TtsCancelledError"; }
}

export class BrowserTts implements ObsidianTts {
  readonly name = "browser";
  private generation = 0;
  private finish: (() => void) | null = null;

  speak(text: string, opts?: TtsOpts): Promise<void> {
    this.cancel();
    const generation = ++this.generation;
    return new Promise<void>((resolve) => {
      if (typeof window === "undefined" || !window.speechSynthesis) {
        opts?.onEnd?.();
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1;
      u.pitch = 1;
      u.onstart = () => opts?.onStart?.();
      const done = () => {
        if (generation !== this.generation) return;
        this.finish = null;
        opts?.onEnd?.();
        resolve();
      };
      this.finish = resolve;
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.speak(u);
    });
  }

  cancel(): void {
    this.generation += 1;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.finish?.();
    this.finish = null;
  }
}

export class ElevenLabsTts implements ObsidianTts {
  readonly name = "elevenlabs";
  private ctx: AudioContext | null = null;
  private src: AudioBufferSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private raf = 0;
  private abort: AbortController | null = null;
  private generation = 0;
  private finish: (() => void) | null = null;
  private finishGeneration = 0;

  async speak(text: string, opts?: TtsOpts): Promise<void> {
    this.cancel();
    const generation = ++this.generation;
    const abort = new AbortController();
    this.abort = abort;
    let bytes: ArrayBuffer;
    try {
      const res = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
        signal: abort.signal,
      });
      if (generation !== this.generation) throw new TtsCancelledError();
      if (!res.ok) throw new Error(`speak ${res.status}`);
      bytes = await res.arrayBuffer();
      if (generation !== this.generation) throw new TtsCancelledError();
    } finally {
      if (this.abort === abort) this.abort = null;
    }

    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) throw new Error("no AudioContext");

    const ctx = new AC();
    this.ctx = ctx;
    let audioBuf: AudioBuffer;
    try {
      await ctx.resume();
      audioBuf = await ctx.decodeAudioData(bytes);
      if (generation !== this.generation) throw new TtsCancelledError();
    } catch (error) {
      await ctx.close().catch(() => {});
      if (this.ctx === ctx) this.ctx = null;
      throw error;
    }

    let src: AudioBufferSourceNode | null = null;
    let analyser: AnalyserNode | null = null;
    try {
      src = ctx.createBufferSource();
      src.buffer = audioBuf;
      this.src = src;
      analyser = ctx.createAnalyser();
      this.analyser = analyser;
      analyser.fftSize = 512;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      const data = new Uint8Array(analyser.frequencyBinCount);

      await new Promise<void>((resolve, reject) => {
        this.finish = resolve;
        this.finishGeneration = generation;
        const loop = () => {
          analyser?.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = ((data[i] ?? 128) - 128) / 128;
            sum += v * v;
          }
          opts?.onLevel?.(Math.min(1, Math.sqrt(sum / data.length) * 4));
          this.raf = requestAnimationFrame(loop);
        };
        src!.onended = () => {
          if (generation !== this.generation) return;
          this.cleanup();
          opts?.onLevel?.(0);
          opts?.onEnd?.();
          resolve();
        };
        try {
          src!.start();
          this.raf = requestAnimationFrame(loop);
          opts?.onStart?.();
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      this.cleanupOwned(ctx, src, analyser, generation);
      if (generation !== this.generation) throw new TtsCancelledError();
      throw error;
    }
  }

  cancel(): void {
    this.generation += 1;
    this.abort?.abort();
    this.abort = null;
    // Preserve the active completion callback before cleanup clears ownership.
    // A cancelled playback is a clean terminal path: callers must not be left
    // awaiting a promise whose source can no longer emit onended.
    const finish = this.finish;
    try {
      this.src?.stop();
    } catch {
      /* already stopped */
    }
    this.cleanup();
    finish?.();
  }

  private cleanup(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    try {
      this.src?.disconnect();
    } catch {
      /* ignore */
    }
    this.src = null;
    try {
      this.analyser?.disconnect();
    } catch {
      /* ignore */
    }
    this.analyser = null;
    this.abort = null;
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.finish = null;
    this.finishGeneration = 0;
  }

  private cleanupOwned(
    ctx: AudioContext,
    src: AudioBufferSourceNode | null,
    analyser: AnalyserNode | null,
    generation: number,
  ): void {
    if (this.raf && generation === this.generation) cancelAnimationFrame(this.raf);
    if (generation === this.generation) this.raf = 0;
    try { src?.disconnect(); } catch { /* ignore */ }
    try { analyser?.disconnect(); } catch { /* ignore */ }
    void ctx.close().catch(() => {});
    if (this.src === src) this.src = null;
    if (this.analyser === analyser) this.analyser = null;
    if (this.ctx === ctx) this.ctx = null;
    if (this.finishGeneration === generation) {
      this.finish = null;
      this.finishGeneration = 0;
    }
  }
}

/** Tries each backend in order; falls back to the next if one throws before playing. */
export class FallbackTts implements ObsidianTts {
  readonly name = "fallback";
  constructor(private readonly impls: ObsidianTts[]) {}

  async speak(text: string, opts?: TtsOpts): Promise<void> {
    for (const impl of this.impls) {
      try {
        await impl.speak(text, opts);
        return;
      } catch (error) {
        if (error instanceof TtsCancelledError || (error instanceof DOMException && error.name === "AbortError")) return;
        /* try the next backend */
      }
    }
    // Nothing could speak — still release the caller.
    opts?.onEnd?.();
  }

  cancel(): void {
    this.impls.forEach((i) => i.cancel());
  }
}

/** The default TTS: the configured ElevenLabs voice. Never substitute a generic browser voice. */
export function createDefaultTts(): ObsidianTts {
  return new ElevenLabsTts();
}
