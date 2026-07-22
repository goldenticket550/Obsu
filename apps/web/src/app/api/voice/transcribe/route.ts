import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { transcribeAudio } from "@/lib/voice/elevenlabs";
import { errorMessage } from "@/lib/form";

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

  try {
    const text = await transcribeAudio(blob);
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 502 });
  }
}
