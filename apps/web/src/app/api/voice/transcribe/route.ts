import { writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
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
  let clientMs = "?";
  let clientChunks = "?";
  try {
    const form = await req.formData();
    const file = form.get("audio");
    if (file && typeof file !== "string") blob = file;
    clientMs = String(form.get("ms") ?? "?");
    clientChunks = String(form.get("chunks") ?? "?");
  } catch {
    blob = null;
  }
  if (!blob || blob.size === 0) {
    return NextResponse.json({ error: "No audio received." }, { status: 400 });
  }

  // Rebuild a clean Blob from the raw bytes (avoids any forwarded-Blob quirk).
  const buf = Buffer.from(await blob.arrayBuffer());
  const clean = new Blob([buf], { type: blob.type || "audio/webm" });

  // TEMP DEBUG — save exactly what the browser recorded so we can inspect it.
  try {
    const meta = `size=${buf.length} type=${blob.type} ms=${clientMs} chunks=${clientChunks} magic=${buf.subarray(0, 12).toString("hex")}`;
    await writeFile(path.join(os.tmpdir(), "obsidian-voice-last.bin"), buf);
    await writeFile(path.join(os.tmpdir(), "obsidian-voice-last.meta.txt"), meta + "\n");
  } catch {
    /* ignore debug write failures */
  }

  try {
    const text = await transcribeAudio(clean);
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 502 });
  }
}
