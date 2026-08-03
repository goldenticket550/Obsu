"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ObsidianOrb } from "@/components/obsidian-orb";
import { orbCopy, transition, type OrbEvent, type OrbState } from "@/lib/business/orb";
import { createDefaultTts, type ObsidianTts } from "@/lib/voice/tts";
import { requestMicrophone, userGesture } from "@/lib/voice/mic-permission";
import { micPermissionCopy } from "@/lib/voice/mic-permission";
import { startCapture, type CaptureSession } from "@/lib/voice/audio-capture";
import { createBrowserLevelMeter, createBrowserRecorder } from "@/lib/voice/browser-audio";
import { captureCopy } from "@/lib/voice/capture-assessment";
import { transcribe } from "@/lib/voice/transcribe-client";
import { presentSpeech, type SpeechAttempt } from "@/lib/voice/speech-outcome";
import {
  shouldReleaseMicrophone,
  showsRecordingIndicator,
} from "@/lib/voice/mic-lifecycle";
import { submitTranscript, approveProposal, rejectProposal } from "@/app/ask/assistant-actions";

/**
 * V2 — the voice surface. COMPOSITION ONLY.
 *
 * Everything that was fused into one 461-line component now lives in a module
 * that owns its boundary: permission, capture, browser adapters, assessment,
 * transcription, orchestration, speech presentation, orb state. What is left
 * here is wiring and markup.
 *
 * The microphone contract, as implemented:
 *   • opens ONLY from a click handler, via a UserGesture token that cannot be
 *     obtained anywhere else — there is no effect, timer, or module-scope path
 *     to a live microphone;
 *   • closes on an explicit tap, and on every terminal state — error, offline,
 *     unmount, and sign-out — through one release function;
 *   • no wake word and no ambient listening: nothing starts capture but a tap;
 *   • the live indicator is `state.kind === "listening"`, read from the state
 *     machine. There is no parallel `isRecording` flag that could disagree.
 */
export function ObsidianVoice() {
  const [state, setState] = useState<OrbState>({ kind: "idle" });
  const [transcriptText, setTranscriptText] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [speechNote, setSpeechNote] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [typed, setTyped] = useState("");

  const stateRef = useRef<OrbState>({ kind: "idle" });
  const sessionRef = useRef<CaptureSession | null>(null);
  const ttsRef = useRef<ObsidianTts | null>(null);
  const levelTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** The one way the microphone is released. Safe to call at any time. */
  const releaseMic = useCallback(() => {
    if (levelTimerRef.current) {
      clearInterval(levelTimerRef.current);
      levelTimerRef.current = null;
    }
    sessionRef.current?.abandon();
    sessionRef.current = null;
  }, []);

  /**
   * The one way state changes. Every caller reports an EVENT, never a state —
   * and every transition re-checks the microphone against the rule, so a state
   * that must not hold one cannot be reached while one is open. That covers
   * error and offline without either path having to remember to clean up.
   */
  const send = useCallback(
    (event: OrbEvent) => {
      const next = transition(stateRef.current, event);
      stateRef.current = next;
      setState(next);
      if (shouldReleaseMicrophone(next)) releaseMic();
      return next;
    },
    [releaseMic],
  );

  useEffect(() => {
    ttsRef.current = createDefaultTts();

    // Losing the network is a terminal state for anything in flight, and a live
    // microphone must not outlive it.
    const onOffline = () => {
      releaseMic();
      send({ type: "went_offline" });
    };
    const onOnline = () => send({ type: "came_online" });
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      // Unmount is where microphones get left open. This is the last chance.
      releaseMic();
      ttsRef.current?.cancel();
    };
  }, [releaseMic, send]);

  /** Sends a transcript onward. Identical for spoken and typed text. */
  const runTranscript = useCallback(
    async (text: string) => {
      setTranscriptText(text);
      const turn = await submitTranscript(text);

      switch (turn.kind) {
        case "answer": {
          setAnswer(turn.text);
          send({ type: "answer_ready" });
          await speak(turn.text);
          break;
        }
        case "proposal":
          // Nothing has been written. The card offers the decision.
          send({ type: "proposal_received", proposal: turn.proposal });
          break;
        case "declined":
          send({ type: "warned", message: turn.message });
          break;
        case "failed":
          send({ type: "failed", message: turn.message });
          break;
        default: {
          const exhaustive: never = turn;
          return exhaustive;
        }
      }
    },
    // speak is defined below and stable for the life of the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [send],
  );

  /**
   * Part 4 — a missing voice is not a failed answer. When synthesis is
   * unavailable the text is already on screen; all that changes is a quiet note.
   */
  async function speak(text: string) {
    let attempt: SpeechAttempt = { kind: "spoke" };
    try {
      await ttsRef.current?.speak(text, {
        onLevel: (level) => send({ type: "level_changed", level }),
      });
    } catch (error) {
      attempt = {
        kind: "unavailable",
        reason: error instanceof Error ? error.message : "no speech",
      };
    }
    setSpeechNote(presentSpeech(attempt).note);
    send({ type: "playback_finished" });
  }

  async function startListening() {
    // The gesture token can only be minted here, inside the handler.
    const permission = await requestMicrophone(userGesture(), {
      getUserMedia: navigator.mediaDevices?.getUserMedia
        ? navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
        : null,
      isSecureContext: window.isSecureContext,
    });

    if (permission.kind !== "granted") {
      // One event, carrying the specific reason. The machine's generic
      // permission_denied copy would replace a precise message ("another app
      // is using the microphone") with a vague one.
      const copy = micPermissionCopy(permission);
      send({
        type: "failed",
        message: copy.suggestion ? `${copy.message} ${copy.suggestion}` : copy.message,
      });
      return;
    }

    send({ type: "permission_granted" });

    const session = startCapture({
      stream: permission.stream,
      createRecorder: createBrowserRecorder,
      createLevelMeter: createBrowserLevelMeter,
      now: () => Date.now(),
    });
    sessionRef.current = session;

    // The orb moves to the real voice. Reading the meter is what drives it;
    // there is no second source of "am I recording".
    levelTimerRef.current = setInterval(() => {
      if (stateRef.current.kind === "listening") {
        send({ type: "level_changed", level: session.level() ?? 0 });
      }
    }, 100);
  }

  async function stopListening() {
    const session = sessionRef.current;
    if (!session) return;
    if (levelTimerRef.current) {
      clearInterval(levelTimerRef.current);
      levelTimerRef.current = null;
    }
    sessionRef.current = null;

    send({ type: "capture_stopped" });
    const result = await session.stop();

    const copy = captureCopy(result.assessment);
    if (!copy.usable || !result.audio) {
      send({
        type: "failed",
        message: copy.suggestion
          ? `${copy.message ?? "That didn't record."} ${copy.suggestion}`
          : (copy.message ?? "That didn't record."),
      });
      return;
    }

    // Exactly one attempt. No automatic retry against a metered provider.
    const transcription = await transcribe(result.audio, { fetch });
    if (transcription.kind === "failed") {
      send({ type: "failed", message: transcription.message });
      return;
    }
    if (transcription.kind === "no_speech") {
      send({ type: "failed", message: "I didn't catch any words. Try again." });
      return;
    }

    send({ type: "transcript_ready", transcript: transcription.text });
    await runTranscript(transcription.text);
  }

  function onOrbTap() {
    const kind = stateRef.current.kind;
    if (kind === "idle" || kind === "success" || kind === "warning" || kind === "error") {
      // Clear a resting result first: permission_requested is only accepted
      // from idle, so tapping after an error would otherwise do nothing at all.
      if (kind !== "idle") send({ type: "dismissed" });
      setAnswer(null);
      setOutcome(null);
      setSpeechNote(null);
      send({ type: "permission_requested" });
      void startListening();
    } else if (kind === "listening") {
      void stopListening();
    } else if (kind === "speaking") {
      ttsRef.current?.cancel();
      send({ type: "playback_finished" });
    }
    // transcribing, thinking, executing: nothing to interrupt safely.
  }

  function submitTyped(event: FormEvent) {
    event.preventDefault();
    const text = typed.trim();
    if (!text) return;
    const next = send({ type: "text_submitted", transcript: text });
    // Refused by the machine (mic live, or an action executing) — leave the box
    // alone so nothing the user typed is silently thrown away.
    if (next.kind !== "thinking") return;
    setTyped("");
    setAnswer(null);
    setOutcome(null);
    void runTranscript(text);
  }

  async function onApprove(proposalId: string) {
    send({ type: "proposal_approved" });
    const result = await approveProposal(proposalId);
    setOutcome(
      result.logged ? result.detail : `${result.detail ?? result.label} (not recorded in the log)`,
    );
    send({ type: "execution_finished" });
  }

  async function onReject(proposalId: string) {
    send({ type: "proposal_rejected" });
    await rejectProposal(proposalId);
  }

  const copy = orbCopy(state);
  // Derived from OrbState through the shared rule — never a parallel flag.
  const listening = showsRecordingIndicator(state);

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={onOrbTap}
        aria-label={copy.label}
        className="touch-manipulation select-none rounded-full outline-none transition-transform focus-visible:ring-2 focus-visible:ring-obsidian-cyan active:scale-95"
      >
        <ObsidianOrb
          state={state}
          onApproveProposal={onApprove}
          onRejectProposal={onReject}
        />
      </button>

      {/* The recording indicator derives from the state machine — the same
          value the orb animates from — so it cannot claim the microphone is
          open when it is closed, or the reverse. */}
      {listening ? (
        <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-obsidian-negative">
          <span
            aria-hidden
            className="inline-block h-2.5 w-2.5 rounded-full bg-obsidian-negative"
          />
          Recording — tap to stop
        </p>
      ) : null}

      {transcriptText ? (
        <p className="mt-6 max-w-xl text-center text-sm text-obsidian-platinum">
          &ldquo;{transcriptText}&rdquo;
        </p>
      ) : null}

      {answer ? (
        <div className="mt-4 w-full max-w-xl rounded-xl border border-obsidian-line bg-obsidian-graphite p-5 shadow-panel">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-obsidian-platinum">
            {answer}
          </p>
          {speechNote ? (
            <p className="mt-2 text-xs text-obsidian-muted">{speechNote}</p>
          ) : null}
        </div>
      ) : null}

      {outcome ? (
        <p className="mt-4 w-full max-w-xl rounded-lg border border-obsidian-line bg-obsidian-graphite px-4 py-3 text-sm text-obsidian-platinum">
          {outcome}
        </p>
      ) : null}

      <form
        onSubmit={submitTyped}
        className="mt-6 flex w-full max-w-xl items-center gap-2 rounded-xl border border-obsidian-line bg-obsidian-graphite p-2 shadow-panel"
      >
        <label htmlFor="obsidian-voice-typed" className="sr-only">
          Type your question
        </label>
        <input
          id="obsidian-voice-typed"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="…or type your question"
          className="flex-1 bg-transparent px-3 py-2 text-sm text-obsidian-platinum placeholder:text-obsidian-muted focus:outline-none"
        />
        <button
          type="submit"
          disabled={!typed.trim()}
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
