"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { ObsidianOrb, type OrbState } from "@/components/obsidian-orb";
import { createDefaultTts, type ObsidianTts } from "@/lib/voice/tts";
import {
  createRecognition,
  extractTranscript,
  speechSupported,
  type SpeechRecognitionLike,
} from "@/lib/voice/speech-recognition";
import { askAction } from "@/app/ask/actions";

/**
 * M11 — the voice interface. Tap the orb to talk: browser SpeechRecognition
 * transcribes, the transcript goes through the EXISTING M7 askAction (same
 * tools, same no-fabrication guarantee — no second answer path), and the answer
 * is spoken via the swappable TTS. The orb reacts to live mic amplitude while
 * listening and pulses while speaking. Typed fallback works everywhere.
 */
export function ObsidianVoice() {
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [level, setLevel] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [typed, setTyped] = useState("");

  const ttsRef = useRef<ObsidianTts | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const finalRef = useRef("");
  const interimRef = useRef("");

  useEffect(() => {
    ttsRef.current = createDefaultTts();
    setSupported(speechSupported());
    return () => {
      stopMicAnalyser();
      recRef.current?.abort();
      ttsRef.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopMicAnalyser() {
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

  async function startMicAnalyser() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
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
        setLevel(Math.min(1, Math.sqrt(sum / data.length) * 3.2));
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      /* amplitude reaction is best-effort; recognition still works without it */
    }
  }

  async function startListening() {
    const rec = createRecognition();
    if (!rec) {
      setSupported(false);
      return;
    }
    setError(null);
    setAnswer(null);
    setTranscript("");
    finalRef.current = "";
    interimRef.current = "";
    ttsRef.current?.cancel();
    recRef.current = rec;
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;

    rec.onresult = (e) => {
      const { text, final } = extractTranscript(e);
      interimRef.current = text;
      setTranscript(text);
      if (final) finalRef.current = text;
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError(
          "Microphone access was blocked. You can type your question below instead.",
        );
      } else if (e.error === "no-speech") {
        setError("I didn't catch that — tap to try again, or type your question.");
      }
    };
    rec.onend = () => {
      stopMicAnalyser();
      const text = (finalRef.current || interimRef.current).trim();
      if (text) {
        void ask(text);
      } else {
        setOrbState("idle");
      }
    };

    setOrbState("listening");
    void startMicAnalyser();
    try {
      rec.start();
    } catch {
      /* start() throws if already started — ignore */
    }
  }

  function stopListening() {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
  }

  async function ask(text: string) {
    setTranscript(text);
    setOrbState("thinking");
    const res = await askAction(text);
    if (res.error) {
      setError(res.error);
      setOrbState("idle");
      return;
    }
    const a = res.answer ?? "";
    setAnswer(a);
    speak(a);
  }

  function speak(text: string) {
    if (!text) {
      setOrbState("idle");
      return;
    }
    setOrbState("speaking");
    ttsRef.current?.speak(text, { onEnd: () => setOrbState("idle") });
  }

  function onOrbTap() {
    if (orbState === "idle") void startListening();
    else if (orbState === "listening") stopListening();
    else if (orbState === "speaking") {
      ttsRef.current?.cancel();
      setOrbState("idle");
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
      ? "Listening…"
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
        className="rounded-full outline-none transition-transform focus-visible:ring-2 focus-visible:ring-obsidian-cyan active:scale-95"
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
          Voice input isn&apos;t available in this browser (try Chrome or Edge on
          desktop) — the box below works everywhere.
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
