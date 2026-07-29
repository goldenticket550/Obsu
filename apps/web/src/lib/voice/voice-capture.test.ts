import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  MIN_CAPTURE_BYTES,
  MIN_CAPTURE_MS,
  SILENCE_PEAK_THRESHOLD,
  assessCapture,
  captureCopy,
  type CaptureAssessment,
} from "./capture-assessment";
import {
  classifyMicError,
  micPermissionCopy,
  requestMicrophone,
  userGesture,
  type MicDeps,
  type MicPermission,
} from "./mic-permission";
import {
  startCapture,
  type CaptureDeps,
  type LevelMeterLike,
  type RecorderLike,
} from "./audio-capture";

/**
 * V2 — the capture layer. Nothing here touches a real browser API: every one is
 * injected, which is the whole reason these are modules instead of a component.
 */

/* ------------------------------------------------------------------ */
/* capture-assessment                                                  */
/* ------------------------------------------------------------------ */

describe("what came out of the microphone", () => {
  const good = { bytes: 40_000, durationMs: 2_000, peakLevel: 0.4 };

  it("passes a normal recording", () => {
    expect(assessCapture(good)).toEqual({ kind: "usable" });
    expect(captureCopy(assessCapture(good)).usable).toBe(true);
  });

  it("separates 'you released too fast' from 'the mic heard nothing'", () => {
    const quick = assessCapture({ bytes: 5_000, durationMs: 120, peakLevel: 0 });
    const silent = assessCapture({ ...good, peakLevel: 0 });

    expect(quick.kind).toBe("too_short");
    expect(silent.kind).toBe("silent");
    // The distinction only matters if it reaches the operator as different words.
    expect(captureCopy(quick).message).not.toBe(captureCopy(silent).message);
    expect(captureCopy(quick).suggestion).not.toBe(captureCopy(silent).suggestion);
  });

  /**
   * The failure that froze this feature: permission granted, recorder ran,
   * bytes arrived, and every sample was flat. The old message was "no audio was
   * captured", which sent the operator looking for a bug in the app instead of
   * at their system input.
   */
  it("names a live-but-empty input as exactly that", () => {
    const assessment = assessCapture({
      bytes: 60_000,
      durationMs: 4_000,
      peakLevel: 0.001,
    });
    expect(assessment).toEqual({ kind: "silent", peakLevel: 0.001 });
    const copy = captureCopy(assessment);
    expect(copy.usable).toBe(false);
    expect(copy.message).toMatch(/heard silence/i);
    expect(copy.suggestion).toMatch(/system sound|input/i);
  });

  it("reports an empty recording before blaming the level", () => {
    expect(assessCapture({ bytes: 0, durationMs: 4_000, peakLevel: 0 })).toEqual({
      kind: "empty",
    });
  });

  it("distinguishes a starved encoder from a silent room", () => {
    const starved = assessCapture({ bytes: 200, durationMs: 4_000, peakLevel: 0.5 });
    expect(starved).toEqual({ kind: "no_signal", bytes: 200 });
  });

  /**
   * Absence of a measurement is not a measurement. Without an analyser there is
   * no evidence of silence, so the capture is not condemned for it.
   */
  it("does not call a capture silent when nothing measured the level", () => {
    expect(
      assessCapture({ bytes: 40_000, durationMs: 2_000, peakLevel: null }),
    ).toEqual({ kind: "usable" });
  });

  it("treats the thresholds as boundaries, not approximations", () => {
    expect(
      assessCapture({ bytes: 40_000, durationMs: MIN_CAPTURE_MS, peakLevel: 0.5 }).kind,
    ).toBe("usable");
    expect(
      assessCapture({ bytes: 40_000, durationMs: MIN_CAPTURE_MS - 1, peakLevel: 0.5 })
        .kind,
    ).toBe("too_short");
    expect(
      assessCapture({ bytes: MIN_CAPTURE_BYTES, durationMs: 2_000, peakLevel: 0.5 })
        .kind,
    ).toBe("usable");
    expect(
      assessCapture({
        bytes: 40_000,
        durationMs: 2_000,
        peakLevel: SILENCE_PEAK_THRESHOLD,
      }).kind,
    ).toBe("usable");
  });

  it("gives every assessment kind its own words, and only 'usable' is silent", () => {
    const all: CaptureAssessment[] = [
      { kind: "usable" },
      { kind: "empty" },
      { kind: "too_short", durationMs: 100 },
      { kind: "no_signal", bytes: 10 },
      { kind: "silent", peakLevel: 0 },
    ];
    const messages = new Set<string>();
    for (const a of all) {
      const copy = captureCopy(a);
      expect(copy.usable).toBe(a.kind === "usable");
      if (a.kind === "usable") {
        expect(copy.message).toBeNull();
      } else {
        expect(copy.message).toBeTruthy();
        messages.add(copy.message as string);
      }
    }
    // Four distinct problems, four distinct explanations.
    expect(messages.size).toBe(4);
  });
});

/* ------------------------------------------------------------------ */
/* mic-permission                                                      */
/* ------------------------------------------------------------------ */

describe("asking for the microphone", () => {
  function deps(over: Partial<MicDeps> = {}): MicDeps {
    return {
      getUserMedia: async () => ({ getTracks: () => [] }) as unknown as MediaStream,
      isSecureContext: true,
      ...over,
    };
  }

  it("returns the stream when the person allows it", async () => {
    const result = await requestMicrophone(userGesture(), deps());
    expect(result.kind).toBe("granted");
  });

  it("maps each browser rejection to its own state", async () => {
    const cases: [string, MicPermission["kind"]][] = [
      ["NotAllowedError", "denied"],
      ["PermissionDeniedError", "denied"],
      ["AbortError", "dismissed"],
      ["NotFoundError", "no_device"],
      ["NotReadableError", "in_use"],
      ["SecurityError", "unsupported"],
    ];
    for (const [name, kind] of cases) {
      const error = Object.assign(new Error("x"), { name });
      expect(classifyMicError(error).kind).toBe(kind);
    }
  });

  it("reports an unrecognised failure instead of swallowing it", () => {
    const state = classifyMicError(
      Object.assign(new Error("the bus caught fire"), { name: "WeirdError" }),
    );
    expect(state).toEqual({ kind: "failed", detail: "the bus caught fire" });
  });

  it("classifies by name, not by message text", () => {
    // A localized message must not change the outcome.
    const spanish = Object.assign(new Error("Permiso denegado"), {
      name: "NotAllowedError",
    });
    expect(classifyMicError(spanish).kind).toBe("denied");
  });

  it("refuses an insecure context before touching the API", async () => {
    const getUserMedia = vi.fn();
    const result = await requestMicrophone(
      userGesture(),
      deps({ isSecureContext: false, getUserMedia }),
    );
    expect(result).toEqual({ kind: "unsupported", reason: "insecure_context" });
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("reports an absent API rather than throwing", async () => {
    const result = await requestMicrophone(userGesture(), deps({ getUserMedia: null }));
    expect(result).toEqual({ kind: "unsupported", reason: "no_api" });
  });

  /**
   * "Denied" is permanent until the person changes a browser setting; asking
   * again does nothing and looks broken. "Dismissed" is not an answer at all.
   */
  it("only offers to retry where retrying could help", () => {
    expect(micPermissionCopy({ kind: "denied" }).retryable).toBe(false);
    expect(micPermissionCopy({ kind: "dismissed" }).retryable).toBe(true);
    expect(micPermissionCopy({ kind: "in_use" }).retryable).toBe(true);
    expect(
      micPermissionCopy({ kind: "unsupported", reason: "insecure_context" }).retryable,
    ).toBe(false);
  });

  it("gives every permission state words", () => {
    const all: MicPermission[] = [
      { kind: "unasked" },
      { kind: "granted", stream: {} as MediaStream },
      { kind: "denied" },
      { kind: "dismissed" },
      { kind: "no_device" },
      { kind: "in_use" },
      { kind: "unsupported", reason: "no_api" },
      { kind: "unsupported", reason: "insecure_context" },
      { kind: "failed", detail: "d" },
    ];
    for (const state of all) {
      expect(micPermissionCopy(state).message.length).toBeGreaterThan(0);
    }
  });

  it("cannot be called without a user gesture", () => {
    // @ts-expect-error a gesture token is required and cannot be fabricated
    void requestMicrophone(undefined, deps());
    // @ts-expect-error and a plain object is not one
    void requestMicrophone({}, deps());
  });
});

/* ------------------------------------------------------------------ */
/* audio-capture                                                       */
/* ------------------------------------------------------------------ */

describe("capturing and releasing", () => {
  function makeRig(options: { meterThrowsOnClose?: boolean } = {}) {
    const stopped: string[] = [];
    const tracks = ["mic-a", "mic-b"].map((id) => ({
      stop: vi.fn(() => stopped.push(id)),
    }));
    const stream = { getTracks: () => tracks } as unknown as MediaStream;

    let chunkHandler: ((n: number) => void) | null = null;
    let stopHandler: (() => void) | null = null;
    const recorder: RecorderLike = {
      start: vi.fn(),
      stop: vi.fn(() => stopHandler?.()),
      onChunk: (h) => {
        chunkHandler = h;
      },
      onStop: (h) => {
        stopHandler = h;
      },
      takeRecording: vi.fn(() => {
        takenCount += 1;
        return { size: 40_000, type: "audio/webm" } as Blob;
      }),
    };
    let takenCount = 0;

    let meterClosed = 0;
    const meter: LevelMeterLike = {
      peak: () => 0.5,
      close: vi.fn(() => {
        meterClosed += 1;
        if (options.meterThrowsOnClose) throw new Error("context already closed");
      }),
    };

    let clock = 1_000;
    const deps: CaptureDeps = {
      stream,
      createRecorder: () => recorder,
      createLevelMeter: () => meter,
      now: () => clock,
    };

    return {
      deps,
      recorder,
      tracks,
      stopped,
      meterClosedCount: () => meterClosed,
      takenCount: () => takenCount,
      emit: (n: number) => chunkHandler?.(n),
      advance: (ms: number) => {
        clock += ms;
      },
    };
  }

  it("starts the recorder only after the handlers are attached", () => {
    const rig = makeRig();
    startCapture(rig.deps);
    expect(rig.recorder.start).toHaveBeenCalledTimes(1);
    // A chunk arriving on the first tick is still counted.
    rig.emit(1_000);
  });

  it("counts what it recorded and assesses it", async () => {
    const rig = makeRig();
    const session = startCapture(rig.deps);
    rig.emit(20_000);
    rig.emit(20_000);
    rig.advance(2_000);

    const result = await session.stop();
    expect(result.measurements).toEqual({
      bytes: 40_000,
      durationMs: 2_000,
      peakLevel: 0.5,
    });
    expect(result.assessment).toEqual({ kind: "usable" });
  });

  it("stops every media track — the recording indicator must go out", async () => {
    const rig = makeRig();
    const session = startCapture(rig.deps);
    expect(session.isActive()).toBe(true);

    await session.stop();
    expect(rig.stopped).toEqual(["mic-a", "mic-b"]);
    expect(session.isActive()).toBe(false);
  });

  /**
   * The leak this module exists to prevent: one throwing release step must not
   * strand the media tracks, which are what keep the microphone live.
   */
  it("still releases the tracks when closing the meter throws", async () => {
    const rig = makeRig({ meterThrowsOnClose: true });
    const session = startCapture(rig.deps);
    await expect(session.stop()).resolves.toBeDefined();
    expect(rig.stopped).toEqual(["mic-a", "mic-b"]);
  });

  it("releases once, however many times it is asked", async () => {
    const rig = makeRig();
    const session = startCapture(rig.deps);
    await session.stop();
    await session.stop();
    session.abandon();

    for (const track of rig.tracks) expect(track.stop).toHaveBeenCalledTimes(1);
    expect(rig.meterClosedCount()).toBe(1);
  });

  it("abandon releases everything without waiting for a result", () => {
    const rig = makeRig();
    const session = startCapture(rig.deps);
    session.abandon();
    expect(rig.stopped).toEqual(["mic-a", "mic-b"]);
    expect(session.isActive()).toBe(false);
  });

  it("reads the level before destroying the thing that measures it", async () => {
    const rig = makeRig();
    const session = startCapture(rig.deps);
    rig.emit(40_000);
    rig.advance(2_000);
    const result = await session.stop();
    // 0.5, not null — the meter was read first.
    expect(result.measurements.peakLevel).toBe(0.5);
  });

  it("runs without a level meter and reports no level rather than zero", async () => {
    const rig = makeRig();
    const session = startCapture({ ...rig.deps, createLevelMeter: null });
    rig.emit(40_000);
    rig.advance(2_000);
    const result = await session.stop();
    expect(result.measurements.peakLevel).toBeNull();
    expect(result.assessment.kind).toBe("usable");
  });

  it("still reports what it captured when the recorder throws on stop", async () => {
    const rig = makeRig();
    const session = startCapture(rig.deps);
    rig.emit(40_000);
    rig.advance(2_000);
    rig.recorder.stop = vi.fn(() => {
      throw new Error("recorder was never started");
    });

    const result = await session.stop();
    expect(result.measurements.bytes).toBe(40_000);
    expect(rig.stopped).toEqual(["mic-a", "mic-b"]);
  });

  it("reads no ambient clock — duration comes from the injected now()", async () => {
    const rig = makeRig();
    const session = startCapture(rig.deps);
    rig.emit(40_000);
    rig.advance(7_500);
    const result = await session.stop();
    expect(result.measurements.durationMs).toBe(7_500);
  });
});

/* ------------------------------------------------------------------ */
/* the privacy rules, as guards                                        */
/* ------------------------------------------------------------------ */

describe("microphone privacy rules", () => {
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      return entry.isFile() && /\.tsx?$/.test(entry.name) ? [full] : [];
    });
  }

  const voiceDir = join(process.cwd(), "src", "lib", "voice");

  it("no V2 voice module opens a microphone on its own", () => {
    for (const file of sourceFiles(voiceDir)) {
      if (/\.test\.tsx?$/.test(file)) continue;
      const text = readFileSync(file, "utf8");
      // Only mic-permission may name getUserMedia, and only as an injected dep.
      if (/mic-permission\.ts$/.test(file)) continue;
      expect(text).not.toContain("getUserMedia");
    }
  });

  it("the permission module never holds the stream it hands out", () => {
    const text = readFileSync(join(voiceDir, "mic-permission.ts"), "utf8");
    const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    // No module-level mutable stream to outlive a request.
    expect(code).not.toMatch(/^let\s/m);
    expect(code).not.toMatch(/^var\s/m);
  });

  it("the capture module cannot acquire a stream — it is given one", () => {
    const text = readFileSync(join(voiceDir, "audio-capture.ts"), "utf8");
    expect(text).not.toContain("navigator");
    expect(text).not.toContain("mediaDevices");
  });
});
