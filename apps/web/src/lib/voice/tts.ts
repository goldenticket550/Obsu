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

class BrowserTts implements ObsidianTts {
  readonly name = "browser";

  speak(text: string, opts?: TtsOpts): Promise<void> {
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
        opts?.onEnd?.();
        resolve();
      };
      u.onend = done;
      u.onerror = done;
      window.speechSynthesis.speak(u);
    });
  }

  cancel(): void {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}

class ElevenLabsTts implements ObsidianTts {
  readonly name = "elevenlabs";
  private ctx: AudioContext | null = null;
  private src: AudioBufferSourceNode | null = null;
  private raf = 0;

  async speak(text: string, opts?: TtsOpts): Promise<void> {
    const res = await fetch("/api/voice/speak", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`speak ${res.status}`);
    const bytes = await res.arrayBuffer();

    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) throw new Error("no AudioContext");

    const ctx = new AC();
    this.ctx = ctx;
    await ctx.resume().catch(() => {});
    const audioBuf = await ctx.decodeAudioData(bytes);

    const src = ctx.createBufferSource();
    src.buffer = audioBuf;
    this.src = src;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);
    analyser.connect(ctx.destination);
    const data = new Uint8Array(analyser.frequencyBinCount);

    return new Promise<void>((resolve) => {
      const loop = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = ((data[i] ?? 128) - 128) / 128;
          sum += v * v;
        }
        opts?.onLevel?.(Math.min(1, Math.sqrt(sum / data.length) * 4));
        this.raf = requestAnimationFrame(loop);
      };
      src.onended = () => {
        this.cleanup();
        opts?.onLevel?.(0);
        opts?.onEnd?.();
        resolve();
      };
      opts?.onStart?.();
      src.start();
      this.raf = requestAnimationFrame(loop);
    });
  }

  cancel(): void {
    try {
      this.src?.stop();
    } catch {
      /* already stopped */
    }
    this.cleanup();
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
    this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}

/** Tries each backend in order; falls back to the next if one throws before playing. */
class FallbackTts implements ObsidianTts {
  readonly name = "fallback";
  constructor(private readonly impls: ObsidianTts[]) {}

  async speak(text: string, opts?: TtsOpts): Promise<void> {
    for (const impl of this.impls) {
      try {
        await impl.speak(text, opts);
        return;
      } catch {
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

/** The default TTS: ElevenLabs cinematic voice, with browser speech as fallback. */
export function createDefaultTts(): ObsidianTts {
  return new FallbackTts([new ElevenLabsTts(), new BrowserTts()]);
}
