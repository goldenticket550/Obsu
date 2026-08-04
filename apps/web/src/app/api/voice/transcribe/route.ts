import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { transcribeAudio } from "@/lib/voice/elevenlabs";
import { isSupportedVoiceAudio, MAX_VOICE_AUDIO_BYTES, MAX_VOICE_MULTIPART_BYTES } from "@/lib/voice/limits";
import { voiceRateLimiter } from "@/lib/voice/rate-limit";

/**
 * M11.1 — server-side speech-to-text. The browser POSTs recorded audio here;
 * we forward it to ElevenLabs (key server-only) and return the transcript.
 * Requires a signed-in user. No fabrication concern — this only returns text
 * the user spoke; answering still happens through the M7 brain.
 */
export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  const limit = voiceRateLimiter.check(`transcribe:${user.id}`);
  if (!limit.allowed) return NextResponse.json({ error: "Too many voice requests. Please wait a moment." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  const length = Number(req.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_VOICE_MULTIPART_BYTES) return NextResponse.json({ error: "That recording is too large. Please keep voice requests under 30 seconds." }, { status: 413 });

  let blob: Blob | null = null;
  try {
    const form = await req.formData();
    const file = form.get("audio");
    if (file && typeof file !== "string") blob = file;
  } catch {
    blob = null;
  }
  if (!blob || blob.size === 0) {
    return NextResponse.json({ error: "No audio received." }, { status: 400 });
  }
  if (blob.size > MAX_VOICE_AUDIO_BYTES) return NextResponse.json({ error: "That recording is too large. Please keep voice requests under 30 seconds." }, { status: 413 });
  if (!isSupportedVoiceAudio(blob.type)) return NextResponse.json({ error: "That audio format is not supported. Please try recording again." }, { status: 415 });

  try {
    const text = await transcribeAudio(blob);
    return NextResponse.json({ text });
  } catch (error) {
    console.error("Voice transcription provider failure", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "Voice transcription is temporarily unavailable." }, { status: 502 });
  }
}
