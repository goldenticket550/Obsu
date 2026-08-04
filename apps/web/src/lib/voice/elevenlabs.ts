/**
 * ElevenLabs provider — SERVER ONLY (reached only from the /api/voice route
 * handlers). One `ELEVENLABS_API_KEY` covers both Speech-to-Text (Scribe) and
 * Text-to-Speech. The key is read from the server env and NEVER sent to the
 * client. Verified against the ElevenLabs API reference (2026).
 */

/**
 * Voice id — a single config constant. Default: "Sarah" (calm, professional).
 * NOTE: this must be a "default" ElevenLabs voice — Voice Library voices (e.g.
 * "Rachel" 21m00Tcm4TlvDq8ikWAM) return 402 `paid_plan_required` on free
 * accounts via the API. Verified free-tier-usable defaults: Sarah, Brian
 * (nPczCjzI2devNBz1zQrb), Daniel (onwK4e9ZLuTAKqWW03F9). On a paid plan any
 * voice id works — just swap this constant.
 */
export const DEFAULT_ELEVENLABS_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";
export const ELEVENLABS_STT_MODEL = "scribe_v1";
export const ELEVENLABS_TTS_MODEL = "eleven_multilingual_v2";
export const ELEVENLABS_TTS_FORMAT = "mp3_44100_128";

const BASE = "https://api.elevenlabs.io/v1";
import { VOICE_PROVIDER_TIMEOUT_MS } from "./limits";

export class VoiceProviderError extends Error {
  constructor(readonly operation: "transcription" | "playback", readonly status?: number) {
    super(`Voice provider ${operation} failed`);
    this.name = "VoiceProviderError";
  }
}

export function configuredVoiceId(): string {
  return process.env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_ELEVENLABS_VOICE_ID;
}

async function withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VOICE_PROVIDER_TIMEOUT_MS);
  try { return await operation(controller.signal); } finally { clearTimeout(timer); }
}

function apiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    throw new Error(
      "ELEVENLABS_API_KEY is not set — add it to apps/web/.env.local (server-only) and restart the dev server.",
    );
  }
  return key;
}

function extFor(mime: string): string {
  if (mime.includes("mp4") || mime.includes("m4a")) return "mp4";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  return "webm";
}

/** Transcribe an audio blob via ElevenLabs Scribe. Returns the transcript text. */
export async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("file", blob, `audio.${extFor(blob.type || "audio/webm")}`);
  form.append("model_id", ELEVENLABS_STT_MODEL);

  const res = await withTimeout((signal) => fetch(`${BASE}/speech-to-text`, {
    method: "POST",
    headers: { "xi-api-key": apiKey() },
    body: form,
    signal,
  }));
  if (!res.ok) {
    throw new VoiceProviderError("transcription", res.status);
  }
  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}

/** Synthesize speech for `text` via ElevenLabs TTS. Returns MP3 audio bytes. */
export async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  const res = await withTimeout((signal) => fetch(
    `${BASE}/text-to-speech/${configuredVoiceId()}?output_format=${ELEVENLABS_TTS_FORMAT}`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey(), "content-type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_TTS_MODEL,
        voice_settings: {
          stability: 0.42,
          similarity_boost: 0.82,
          style: 0.28,
          use_speaker_boost: true,
          speed: 0.90,
        },
      }),
      signal,
    },
  ));
  if (!res.ok) {
    throw new VoiceProviderError("playback", res.status);
  }
  return res.arrayBuffer();
}
