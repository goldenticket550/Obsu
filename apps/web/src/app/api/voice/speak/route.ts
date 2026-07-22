import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { synthesizeSpeech } from "@/lib/voice/elevenlabs";
import { errorMessage } from "@/lib/form";

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

  try {
    const audio = await synthesizeSpeech(text);
    return new NextResponse(audio, {
      status: 200,
      headers: { "content-type": "audio/mpeg", "cache-control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 502 });
  }
}
