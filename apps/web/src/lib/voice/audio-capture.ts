import {
  assessCapture,
  type CaptureAssessment,
  type CaptureMeasurements,
} from "./capture-assessment";

/**
 * V2 — audio capture. Its own module.
 *
 * It records, it measures what it recorded, and it releases everything it took.
 * It does not ask for permission (that is mic-permission.ts), does not
 * transcribe, and does not know the orb exists.
 *
 * **Teardown is the point of this module.** The frozen monolith acquires a
 * stream, an AudioContext, an analyser, a rAF loop, and a timer across five
 * different functions, and unwinds them in several places — which is how a live
 * microphone survives a navigation. Here every resource is taken by one
 * function and released by one function, `stop()`, which is idempotent and runs
 * to completion even if an individual release throws.
 *
 * Every browser API is injected, so the lifecycle is testable in node.
 */

export interface CaptureDeps {
  /** The live stream from mic-permission. This module stops its tracks. */
  stream: MediaStream;
  /** Builds the recorder. Injected so tests need no MediaRecorder. */
  createRecorder(stream: MediaStream): RecorderLike;
  /** Builds the level meter, or null to run without one. */
  createLevelMeter?: ((stream: MediaStream) => LevelMeterLike) | null;
  /** Normally `() => Date.now()`. Injected — no ambient clock reads. */
  now(): number;
}

/** The slice of MediaRecorder this module uses. */
export interface RecorderLike {
  start(): void;
  stop(): void;
  onChunk(handler: (bytes: number) => void): void;
  onStop(handler: () => void): void;
}

/** A live amplitude source, and the means to shut it down. */
export interface LevelMeterLike {
  /** Highest amplitude seen so far, 0..1. */
  peak(): number;
  close(): void;
}

export interface CaptureResult {
  measurements: CaptureMeasurements;
  assessment: CaptureAssessment;
}

export interface CaptureSession {
  /** Ends the capture and releases everything. Safe to call more than once. */
  stop(): Promise<CaptureResult>;
  /**
   * Releases everything WITHOUT waiting for a result. For unmount, navigation,
   * sign-out, and error paths, where nothing is going to read the audio.
   */
  abandon(): void;
  /** True while the microphone is live — drives the visible recording indicator. */
  isActive(): boolean;
}

/**
 * Starts recording. The caller already holds a granted stream, so there is no
 * permission prompt in here and no way for this module to open a microphone
 * that nobody asked for.
 */
export function startCapture(deps: CaptureDeps): CaptureSession {
  const startedAt = deps.now();
  const meter = deps.createLevelMeter ? deps.createLevelMeter(deps.stream) : null;
  const recorder = deps.createRecorder(deps.stream);

  let bytes = 0;
  let active = true;
  let released = false;
  let stopResolve: (() => void) | null = null;

  recorder.onChunk((n) => {
    bytes += n;
  });
  recorder.onStop(() => {
    stopResolve?.();
    stopResolve = null;
  });

  // Handlers are attached before the recorder runs, so no chunk emitted on the
  // first tick can arrive before anything is counting it.
  recorder.start();

  /**
   * The single release path. Each step is independently guarded: a throwing
   * AudioContext close must not strand the media tracks, which are the part
   * that keeps the browser's recording indicator lit.
   */
  function release(): void {
    if (released) return;
    released = true;
    active = false;

    try {
      meter?.close();
    } catch {
      // Already closed, or closing during teardown. Nothing left to do.
    }
    for (const track of deps.stream.getTracks()) {
      try {
        track.stop();
      } catch {
        // A track already ended. The remaining tracks still must be stopped.
      }
    }
  }

  return {
    isActive: () => active,

    async stop(): Promise<CaptureResult> {
      // Peak is read BEFORE release, because closing the meter destroys it.
      const peakLevel = meter ? meter.peak() : null;

      if (!released) {
        const stopped = new Promise<void>((resolve) => {
          stopResolve = resolve;
        });
        try {
          recorder.stop();
          await stopped;
        } catch {
          // A recorder that was never running, or already stopped. The bytes
          // counted so far are still the truth about what was captured.
        } finally {
          release();
        }
      }

      const measurements: CaptureMeasurements = {
        bytes,
        durationMs: deps.now() - startedAt,
        peakLevel,
      };
      return { measurements, assessment: assessCapture(measurements) };
    },

    abandon(): void {
      try {
        recorder.stop();
      } catch {
        // Abandoning: whether the recorder stopped cleanly changes nothing,
        // because no one is going to read the result.
      }
      release();
    },
  };
}
