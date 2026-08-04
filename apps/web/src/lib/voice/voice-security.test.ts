import { describe, expect, it } from "vitest";
import { isSupportedVoiceAudio, MAX_TTS_TEXT_CHARACTERS, MAX_VOICE_AUDIO_BYTES, MAX_VOICE_MULTIPART_BYTES, MULTIPART_OVERHEAD_ALLOWANCE_BYTES } from "./limits";
import { LocalVoiceRateLimiter } from "./rate-limit";

describe("voice security contracts", () => {
  it("validates upload size and MIME", () => {
    expect(MAX_VOICE_AUDIO_BYTES).toBe(8 * 1024 * 1024);
    expect(isSupportedVoiceAudio("audio/webm;codecs=opus")).toBe(true);
    expect(isSupportedVoiceAudio("application/octet-stream")).toBe(false);
  });
  it("caps speech text", () => expect(MAX_TTS_TEXT_CHARACTERS).toBe(2_000));
  it("allows named multipart overhead while retaining the exact file limit", () => {
    expect(MAX_VOICE_MULTIPART_BYTES).toBe(MAX_VOICE_AUDIO_BYTES + MULTIPART_OVERHEAD_ALLOWANCE_BYTES);
    expect(MAX_VOICE_MULTIPART_BYTES).toBeGreaterThan(MAX_VOICE_AUDIO_BYTES);
  });
  it("returns Retry-After data when limited", () => {
    const limiter = new LocalVoiceRateLimiter(1, 10_000, () => 1_000);
    expect(limiter.check("user").allowed).toBe(true);
    expect(limiter.check("user")).toEqual({ allowed: false, retryAfterSeconds: 10 });
  });
  it("opportunistically prunes expired keys without evicting active limits", () => {
    let now = 0;
    const limiter = new LocalVoiceRateLimiter(2, 10, () => now, 3, 2);
    limiter.check("expired");
    now = 11;
    limiter.check("active");
    expect(limiter.size).toBe(1);
    expect(limiter.check("active").allowed).toBe(true);
    expect(limiter.check("active").allowed).toBe(false);
  });
  it("denies new keys at capacity without exceeding the hard ceiling", () => {
    const limiter = new LocalVoiceRateLimiter(3, 10_000, () => 0, 2, 100);
    expect(limiter.check("one").allowed).toBe(true);
    expect(limiter.check("two").allowed).toBe(true);
    expect(limiter.check("three").allowed).toBe(false);
    expect(limiter.size).toBe(2);
    expect(limiter.check("one").allowed).toBe(true);
    expect(limiter.size).toBe(2);
  });

  it("prunes expired capacity before accepting a new key", () => {
    let now = 0;
    const limiter = new LocalVoiceRateLimiter(2, 10, () => now, 1, 100);
    expect(limiter.check("old").allowed).toBe(true);
    expect(limiter.check("new").allowed).toBe(false);
    now = 11;
    expect(limiter.check("new").allowed).toBe(true);
    expect(limiter.size).toBe(1);
  });
});
