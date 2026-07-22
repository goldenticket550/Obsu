/**
 * ElevenLabs provider — SERVER ONLY (reached only from the /api/voice route
 * handlers). One `ELEVENLABS_API_KEY` covers both Speech-to-Text (Scribe) and
 * Text-to-Speech. The key is read from the server env and NEVER sent to the
 * client. Verified against the ElevenLabs API reference (2026).
 */

/** Voice id — a single config constant. Default: "Rachel" (calm, professional). */
export const ELEVENLABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";
export const ELEVENLABS_STT_MODEL = "scribe_v1";
export const ELEVENLABS_TTS_MODEL = "eleven_multilingual_v2";
export const ELEVENLABS_TTS_FORMAT = "mp3_44100_128";

const BASE = "https://api.elevenlabs.io/v1";

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

  const res = await fetch(`${BASE}/speech-to-text`, {
    method: "POST",
    headers: { "xi-api-key": apiKey() },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs STT ${res.status}: ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as { text?: string };
  return (data.text ?? "").trim();
}

/** Synthesize speech for `text` via ElevenLabs TTS. Returns MP3 audio bytes. */
export async function synthesizeSpeech(text: string): Promise<ArrayBuffer> {
  const res = await fetch(
    `${BASE}/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=${ELEVENLABS_TTS_FORMAT}`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey(), "content-type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_TTS_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs TTS ${res.status}: ${detail.slice(0, 200)}`);
  }
  return res.arrayBuffer();
}
