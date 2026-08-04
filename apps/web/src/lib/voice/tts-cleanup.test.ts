import { afterEach, describe, expect, it, vi } from "vitest";
import { ElevenLabsTts, FallbackTts, TtsCancelledError, type ObsidianTts } from "./tts";

function installAudioContext(
  decode: () => Promise<AudioBuffer>,
  failAt?: "source" | "analyser" | "connect" | "start",
) {
  const close = vi.fn().mockResolvedValue(undefined);
  const source = {
    buffer: null,
    connect: failAt === "connect" ? vi.fn(() => { throw new Error("connect failed"); }) : vi.fn(),
    disconnect: vi.fn(),
    start: failAt === "start" ? vi.fn(() => { throw new Error("start failed"); }) : vi.fn(),
    stop: vi.fn(),
    onended: null,
  };
  const analyser = {
    fftSize: 0,
    frequencyBinCount: 16,
    connect: vi.fn(),
    disconnect: vi.fn(),
    getByteTimeDomainData: vi.fn(),
  };
  const context = {
    resume: vi.fn().mockResolvedValue(undefined),
    decodeAudioData: vi.fn(decode),
    close,
    createBufferSource: failAt === "source" ? vi.fn(() => { throw new Error("source failed"); }) : vi.fn(() => source),
    createAnalyser: failAt === "analyser" ? vi.fn(() => { throw new Error("analyser failed"); }) : vi.fn(() => analyser),
    destination: {},
  };
  function MockAudioContext() { return context; }
  Object.defineProperty(globalThis, "window", { configurable: true, value: { AudioContext: MockAudioContext } });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(2)) }));
  return { context, close, source, analyser };
}

function installAnimationFrame() {
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
}
afterEach(() => { vi.unstubAllGlobals(); Reflect.deleteProperty(globalThis, "window"); });

describe("ElevenLabs TTS cleanup", () => {
  async function expectStartupFallback(failAt: "source" | "analyser" | "connect" | "start") {
    const installed = installAudioContext(() => Promise.resolve({} as AudioBuffer), failAt);
    const fallback: ObsidianTts = { name: "browser", speak: vi.fn().mockResolvedValue(undefined), cancel: vi.fn() };
    await new FallbackTts([new ElevenLabsTts(), fallback]).speak("hello");
    expect(installed.close).toHaveBeenCalledOnce();
    expect(fallback.speak).toHaveBeenCalledOnce();
    return installed;
  }

  it("closes a context after decode failure and permits legitimate fallback", async () => {
    const { close } = installAudioContext(() => Promise.reject(new Error("decode failed")));
    const fallback: ObsidianTts = { name: "browser", speak: vi.fn().mockResolvedValue(undefined), cancel: vi.fn() };
    await new FallbackTts([new ElevenLabsTts(), fallback]).speak("hello");
    expect(close).toHaveBeenCalledOnce();
    expect(fallback.speak).toHaveBeenCalledOnce();
  });

  it("cleans up when buffer-source construction fails", async () => {
    await expectStartupFallback("source");
  });

  it("disconnects a created source when analyser construction fails", async () => {
    const { source } = await expectStartupFallback("analyser");
    expect(source.disconnect).toHaveBeenCalledOnce();
  });

  it("disconnects source and analyser when graph connection fails", async () => {
    const { source, analyser } = await expectStartupFallback("connect");
    expect(source.disconnect).toHaveBeenCalledOnce();
    expect(analyser.disconnect).toHaveBeenCalledOnce();
  });

  it("cleans the graph when source playback cannot start", async () => {
    const { source, analyser } = await expectStartupFallback("start");
    expect(source.disconnect).toHaveBeenCalledOnce();
    expect(analyser.disconnect).toHaveBeenCalledOnce();
  });

  it("cancellation during decode closes resources and never starts playback", async () => {
    let finishDecode!: (value: AudioBuffer) => void;
    const decoding = new Promise<AudioBuffer>((resolve) => { finishDecode = resolve; });
    const { context, close } = installAudioContext(() => decoding);
    const tts = new ElevenLabsTts();
    const speaking = tts.speak("hello");
    await vi.waitFor(() => expect(context.decodeAudioData).toHaveBeenCalledOnce());
    tts.cancel();
    finishDecode({} as AudioBuffer);
    await expect(speaking).rejects.toBeInstanceOf(TtsCancelledError);
    expect(close).toHaveBeenCalled();
    expect(context.createBufferSource).not.toHaveBeenCalled();
  });

  it("resolves an active playback when cancellation prevents onended", async () => {
    installAnimationFrame();
    const { context, close, source, analyser } = installAudioContext(
      () => Promise.resolve({} as AudioBuffer),
    );
    const tts = new ElevenLabsTts();
    const speaking = tts.speak("hello");
    await vi.waitFor(() => expect(source.start).toHaveBeenCalledOnce());

    tts.cancel();

    await expect(speaking).resolves.toBeUndefined();
    expect(source.stop).toHaveBeenCalledOnce();
    expect(source.disconnect).toHaveBeenCalledOnce();
    expect(analyser.disconnect).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    expect(context.createBufferSource).toHaveBeenCalledOnce();
  });
});