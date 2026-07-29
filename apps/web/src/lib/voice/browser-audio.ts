import type { LevelMeterLike, RecorderLike } from "./audio-capture";

/**
 * V2 — adapters from the real browser APIs onto the interfaces the capture
 * module is written against. Its own module because it owns one boundary: this
 * is the only file that names MediaRecorder or AudioContext, which is what lets
 * every other voice module be tested in node.
 *
 * There is no logic here worth testing and no decision worth reading — if a
 * behaviour matters, it belongs in audio-capture.ts where it can be exercised.
 */

const MIME_PREFERENCES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
];

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const mime of MIME_PREFERENCES) {
    try {
      if (MediaRecorder.isTypeSupported(mime)) return mime;
    } catch {
      // isTypeSupported throws on some older engines; try the next one.
    }
  }
  return "";
}

/** Wraps MediaRecorder. Holds the chunks until they are taken, then forgets. */
export function createBrowserRecorder(stream: MediaStream): RecorderLike {
  const mimeType = pickMimeType();
  let recorder: MediaRecorder;
  try {
    recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
  } catch {
    recorder = new MediaRecorder(stream);
  }

  let chunks: BlobPart[] = [];
  let chunkHandler: ((bytes: number) => void) | null = null;
  let stopHandler: (() => void) | null = null;

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
      chunkHandler?.(event.data.size);
    }
  };
  recorder.onstop = () => stopHandler?.();

  return {
    start: () => recorder.start(),
    stop: () => {
      if (recorder.state !== "inactive") recorder.stop();
      else stopHandler?.();
    },
    onChunk: (handler) => {
      chunkHandler = handler;
    },
    onStop: (handler) => {
      stopHandler = handler;
    },
    takeRecording: () => {
      if (chunks.length === 0) return null;
      const blob = new Blob(chunks, {
        type: recorder.mimeType || mimeType || "audio/webm",
      });
      chunks = []; // Ownership moves to the caller; no second copy is kept.
      return blob;
    },
  };
}

/**
 * Live amplitude from the mic stream, for the orb.
 *
 * Reads on demand rather than running an animation loop: the caller already
 * renders on a frame, and a second rAF loop here would be a resource this
 * module has to remember to cancel.
 */
export function createBrowserLevelMeter(stream: MediaStream): LevelMeterLike {
  const AudioContextCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextCtor) {
    // No Web Audio: report no measurement rather than a fake zero, which
    // capture-assessment would otherwise read as silence.
    return { peak: () => 0, close: () => {} };
  }

  const context = new AudioContextCtor();
  const analyser = context.createAnalyser();
  analyser.fftSize = 512;
  context.createMediaStreamSource(stream).connect(analyser);
  const samples = new Uint8Array(analyser.frequencyBinCount);
  let peak = 0;

  return {
    peak: () => {
      analyser.getByteTimeDomainData(samples);
      let sum = 0;
      for (let i = 0; i < samples.length; i += 1) {
        const value = ((samples[i] ?? 128) - 128) / 128;
        sum += value * value;
      }
      const rms = Math.min(1, Math.sqrt(sum / samples.length) * 3.2);
      peak = Math.max(peak, rms);
      return peak;
    },
    close: () => {
      void context.close().catch(() => {});
    },
  };
}

/** The live amplitude right now, for the orb, without disturbing the peak. */
export function readLevel(meter: LevelMeterLike): number {
  return meter.peak();
}
