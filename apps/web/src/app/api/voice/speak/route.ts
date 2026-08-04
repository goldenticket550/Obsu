import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { synthesizeSpeech } from "@/lib/voice/elevenlabs";
import { MAX_TTS_TEXT_CHARACTERS } from "@/lib/voice/limits";
import { voiceRateLimiter } from "@/lib/voice/rate-limit";

/**
 * M11.1 — server-side text-to-speech. Returns ElevenLabs MP3 audio for the
 * answer text (key server-only). The client plays it and analyses it for the
 * orb. On any failure the client falls back to browser SpeechSynthesis.
 * Requires a signed-in user.
 */
export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  const limit = voiceRateLimiter.check(`speak:${user.id}`);
  if (!limit.allowed) return NextResponse.json({ error: "Too many voice requests. Please wait a moment." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });

  let text = "";
  try {
    const body = (await req.json()) as { text?: string };
    text = String(body.text ?? "").trim();
  } catch {
    text = "";
  }
  if (!text) {
    return NextResponse.json({ error: "No text." }, { status: 400 });
  }
  if (text.length > MAX_TTS_TEXT_CHARACTERS) return NextResponse.json({ error: "That response is too long for voice playback." }, { status: 413 });

  try {
    const audio = await synthesizeSpeech(text);
    return new NextResponse(audio, {
      status: 200,
      headers: { "content-type": "audio/mpeg", "cache-control": "no-store" },
    });
  } catch (error) {
    console.error("Voice playback provider failure", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: "Voice playback is temporarily unavailable. Your answer is still available as text." }, { status: 502 });
  }
}
