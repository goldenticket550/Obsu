"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { ObsidianOrb, type OrbState } from "@/components/obsidian-orb";
import { createDefaultTts, type ObsidianTts } from "@/lib/voice/tts";
import { askAction } from "@/app/ask/actions";

/**
 * M11.1 — the voice interface with REAL server-side speech.
 *
 * Voice IN: tap the orb to start recording (tap again, or a ~1.4s pause of
 * silence, to stop). We capture the mic with getUserMedia + MediaRecorder and
 * keep a Web Audio AnalyserNode on the SAME stream so the orb reacts to your
 * voice live. The recorded audio is POSTed to /api/voice/transcribe (ElevenLabs
 * Scribe, key server-side) and the transcript is fed into the EXISTING M7
 * askAction — same tools, same no-fabrication guarantee.
 *
 * Voice OUT: the answer is spoken via the swappable TTS (ElevenLabs cinematic
 * voice, browser speech as automatic fallback); the orb pulses to that audio.
 *
 * Works on any browser/phone that supports getUserMedia + MediaRecorder. The
 * typed box always works.
 */

const SPEAK_THRESHOLD = 0.045; // RMS above this counts as speech
const SILENCE_MS = 1400; // auto-stop after this much quiet once speech began
const MAX_MS = 15000; // hard cap on a single recording

function clientExt(mime: string): string {
  if (mime.includes("mp4") || mime.includes("m4a")) return "mp4";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  return "webm";
}

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const prefs = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const m of prefs) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch {
      /* ignore */
    }
  }
  return "";
}

export function ObsidianVoice() {
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [level, setLevel] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [typed, setTyped] = useState("");

  const orbStateRef = useRef<OrbState>("idle");
  const ttsRef = useRef<ObsidianTts | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const maxRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingRef = useRef(false);
  const speechStartedRef = useRef(false);
  const lastLoudRef = useRef(0);

  function setPhase(s: OrbState) {
    orbStateRef.current = s;
    setOrbState(s);
  }

  useEffect(() => {
    ttsRef.current = createDefaultTts();
    const canRecord =
      typeof window !== "undefined" &&
      typeof MediaRecorder !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia;
    setSupported(canRecord);
    return () => {
      if (maxRef.current) clearTimeout(maxRef.current);
      teardownMic();
      try {
        recorderRef.current?.stop();
      } catch {
        /* ignore */
      }
      ttsRef.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function teardownMic() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setLevel(0);
  }

  /** Amplitude analyser on the live mic stream — drives the orb AND silence auto-stop. */
  function setupAnalyser(stream: MediaStream) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    audioCtxRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const loop = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = ((data[i] ?? 128) - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      setLevel(Math.min(1, rms * 3.2));

      if (recordingRef.current) {
        const now = performance.now();
        if (rms > SPEAK_THRESHOLD) {
          speechStartedRef.current = true;
          lastLoudRef.current = now;
        }
        if (speechStartedRef.current && now - lastLoudRef.current > SILENCE_MS) {
          stopListening(); // natural pause → stop
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }

  async function startListening() {
    setError(null);
    setAnswer(null);
    setTranscript("");
    ttsRef.current?.cancel();

    const md = navigator.mediaDevices;
    if (!md?.getUserMedia || typeof MediaRecorder === "undefined") {
      setSupported(false);
      setError("Voice recording isn't available in this browser — type your question below.");
      return;
    }

    setPhase("listening");
    let stream: MediaStream;
    try {
      stream = await md.getUserMedia({ audio: true });
    } catch {
      setError(
        "Microphone access is blocked. Allow the mic for this site (mic/lock icon in the address bar), then tap the orb again — or type your question below.",
      );
      setPhase("idle");
      return;
    }
    if (orbStateRef.current !== "listening") {
      stream.getTracks().forEach((t) => t.stop()); // cancelled while awaiting
      return;
    }
    streamRef.current = stream;
    setupAnalyser(stream);

    chunksRef.current = [];
    const mime = pickMime();
    let recorder: MediaRecorder;
    try {
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch {
      recorder = new MediaRecorder(stream);
    }
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || mime || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      teardownMic();
      void transcribeAndAsk(blob);
    };

    speechStartedRef.current = false;
    lastLoudRef.current = performance.now();
    recordingRef.current = true;
    recorder.start();

    maxRef.current = setTimeout(() => stopListening(), MAX_MS);
  }

  function stopListening() {
    recordingRef.current = false;
    if (maxRef.current) {
      clearTimeout(maxRef.current);
      maxRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop(); // fires onstop → transcribe
      } catch {
        teardownMic();
        setPhase("idle");
      }
    } else {
      teardownMic();
      setPhase("idle");
    }
  }

  async function transcribeAndAsk(blob: Blob) {
    if (!blob.size) {
      setPhase("idle");
      return;
    }
    setPhase("thinking");
    const form = new FormData();
    form.append("audio", blob, `audio.${clientExt(blob.type)}`);

    let text = "";
    try {
      const res = await fetch("/api/voice/transcribe", { method: "POST", body: form });
      const json = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok) {
        setError(json.error || "Couldn't transcribe that — try again, or type your question.");
        setPhase("idle");
        return;
      }
      text = String(json.text ?? "").trim();
    } catch {
      setError("Transcription failed — check your connection, or type your question.");
      setPhase("idle");
      return;
    }

    if (!text) {
      setError("I didn't catch any words — tap the orb and speak clearly, or type your question.");
      setPhase("idle");
      return;
    }
    setTranscript(text);
    await ask(text);
  }

  async function ask(text: string) {
    setTranscript(text);
    setPhase("thinking");
    const res = await askAction(text);
    if (res.error) {
      setError(res.error);
      setPhase("idle");
      return;
    }
    const a = res.answer ?? "";
    setAnswer(a);
    await speak(a);
  }

  async function speak(text: string) {
    if (!text) {
      setPhase("idle");
      return;
    }
    setPhase("speaking");
    try {
      await ttsRef.current?.speak(text, { onLevel: (l) => setLevel(l) });
    } catch {
      /* fallback handled inside the TTS layer */
    }
    setLevel(0);
    setPhase("idle");
  }

  function onOrbTap() {
    const s = orbStateRef.current;
    if (s === "idle") void startListening();
    else if (s === "listening") stopListening();
    else if (s === "speaking") {
      ttsRef.current?.cancel();
      setLevel(0);
      setPhase("idle");
    }
    // thinking: ignore taps
  }

  function submitTyped(e: FormEvent) {
    e.preventDefault();
    const t = typed.trim();
    if (!t || orbState === "thinking") return;
    setTyped("");
    void ask(t);
  }

  const label =
    orbState === "listening"
      ? "Listening… (tap to stop)"
      : orbState === "thinking"
        ? "Thinking…"
        : orbState === "speaking"
          ? "Speaking… (tap to stop)"
          : "Tap to talk";

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={onOrbTap}
        aria-label={label}
        className="touch-manipulation select-none rounded-full outline-none transition-transform focus-visible:ring-2 focus-visible:ring-obsidian-cyan active:scale-95"
      >
        <ObsidianOrb state={orbState} level={level} />
      </button>
      <p className="mt-1 text-sm text-obsidian-silver">{label}</p>

      {transcript ? (
        <p className="mt-6 max-w-xl text-center text-sm text-obsidian-platinum">
          &ldquo;{transcript}&rdquo;
        </p>
      ) : null}

      {answer && !error ? (
        <div className="mt-4 w-full max-w-xl rounded-xl border border-obsidian-line bg-obsidian-graphite p-5 shadow-panel">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-obsidian-platinum">
            {answer}
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 w-full max-w-xl rounded-lg border border-obsidian-negative/40 bg-obsidian-negative/10 px-4 py-3 text-sm text-obsidian-negative">
          {error}
        </p>
      ) : null}

      {!supported ? (
        <p className="mt-4 max-w-xl text-center text-xs text-obsidian-muted">
          Voice recording isn&apos;t available in this browser — the box below works everywhere.
        </p>
      ) : null}

      <form
        onSubmit={submitTyped}
        className="mt-6 flex w-full max-w-xl items-center gap-2 rounded-xl border border-obsidian-line bg-obsidian-graphite p-2 shadow-panel"
      >
        <input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="…or type your question"
          className="flex-1 bg-transparent px-3 py-2 text-sm text-obsidian-platinum placeholder:text-obsidian-muted focus:outline-none"
        />
        <button
          type="submit"
          disabled={orbState === "thinking" || !typed.trim()}
          className="rounded-lg bg-obsidian-platinum px-4 py-2 text-sm font-semibold text-obsidian-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Ask
        </button>
      </form>

      <p className="mt-4 max-w-xl text-center text-xs text-obsidian-muted">
        OBSIDIAN answers only from your verified business data — every figure
        comes from a tool, never a guess.
      </p>
    </div>
  );
}
