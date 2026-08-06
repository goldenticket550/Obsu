"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProposalCard } from "@/components/proposal-card";
import { EclipseIris } from "@/components/command/eclipse-iris";
import { IrisVisualizer } from "@/components/command/iris-visualizer";
import ui from "./obsidian-intelligence.module.css";
import briefing from "./mobile-briefing.module.css";
import {
  deriveIrisVisualState,
  type CapabilityStatus,
  type InteractionPhase,
} from "@/lib/business/iris";
import {
  orbCopy,
  orbLevel,
  transition,
  type OrbEvent,
  type OrbState,
} from "@/lib/business/orb";
import {
  SIGN_OUT_EVENT,
  appendRedacted,
  clearConversation,
  type ConversationTurn,
} from "@/lib/conversation";
import {
  approveProposal,
  rejectProposal,
  submitTranscript,
} from "@/app/ask/assistant-actions";
import { requestMicrophone, userGesture, micPermissionCopy } from "@/lib/voice/mic-permission";
import { startCapture, type CaptureSession } from "@/lib/voice/audio-capture";
import { createBrowserLevelMeter, createBrowserRecorder } from "@/lib/voice/browser-audio";
import { captureCopy } from "@/lib/voice/capture-assessment";
import { transcribe } from "@/lib/voice/transcribe-client";
import { createDefaultTts, type ObsidianTts } from "@/lib/voice/tts";
import { shouldReleaseMicrophone } from "@/lib/voice/mic-lifecycle";

/**
 * Command Center intelligence controller.
 *
 * Typed and spoken requests share one verified assistant path. Voice begins
 * only after an explicit tap, microphone state is released on every terminal
 * path, and record-changing actions still require an approval button.
 */
/** How long a success rests on screen before the orb returns to idle. */
const SUCCESS_DWELL_MS = 2400;
const MAX_RECORDING_MS = 30_000;
export const BEAUTY_TODAY_OVERVIEW_REQUEST =
  "Give me a concise briefing covering today's appointments, revenue summary, and clients whose fills are due. Use only my organization's verified records, report empty or unavailable results honestly, and do not send any reminders or messages.";

const SURFACE_ANNOUNCEMENTS: Record<string, string> = {
  "tonights-flow": "Opening tonight's flow.",
  "action-required": "Opening items that need your attention.",
  "business-pulse": "Opening your business pulse.",
};

async function playStartupChime(): Promise<void> {
  const AudioContextClass = window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  await context.resume();
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.62);
  gain.connect(context.destination);
  [196, 293.66, 440].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    oscillator.start(context.currentTime + index * 0.085);
    oscillator.stop(context.currentTime + 0.62);
  });
  await new Promise((resolve) => window.setTimeout(resolve, 660));
  await context.close();
}

export function ObsidianIntelligence({
  needsAttention = false,
  actionCount = 0,
  briefingDayKey = "",
  dailyBriefing = "",
  shortGreeting = "",
  showTodayOverview = false,
  speakTypedAnswers = false,
  todayOverviewClassName = "",
  presentation = "standard",
}: {
  /**
   * Gate 1: the ONLY real-data input to the orb's amber treatment. Passed from
   * the Command Center, derived from the same action-required list that
   * produces "1 ride needs closing out" — not a second calculation of the same
   * question.
   */
  needsAttention?: boolean;
  /** Exact length of the server-derived Action Required list. */
  actionCount?: number;
  briefingDayKey?: string;
  dailyBriefing?: string;
  shortGreeting?: string;
  /** Adds the Beauty briefing shortcut without creating a second Ask path. */
  showTodayOverview?: boolean;
  /** Beauty speaks typed and shortcut answers; Rides keeps its existing default. */
  speakTypedAnswers?: boolean;
  /** Lets a vertical own presentation without leaking styles into this shared controller. */
  todayOverviewClassName?: string;
  /** Keeps the shared controller fully functional in a compact Beauty card. */
  presentation?: "standard" | "beauty-compact";
}) {
  const [state, setState] = useState<OrbState>({ kind: "idle" });
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [askFocused, setAskFocused] = useState(false);
  const [expandedSurface, setExpandedSurface] = useState<string | null>(null);
  const [welcomePending, setWelcomePending] = useState(Boolean(briefingDayKey && dailyBriefing && shortGreeting));
  const [welcomeBusy, setWelcomeBusy] = useState(false);

  const stateRef = useRef<OrbState>({ kind: "idle" });
  const mountedRef = useRef(true);
  const dwellRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef<CaptureSession | null>(null);
  const ttsRef = useRef<ObsidianTts | null>(null);
  const levelTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceOperationRef = useRef(0);
  const transcriptionAbortRef = useRef<AbortController | null>(null);

  const releaseMic = useCallback(() => {
    if (levelTimerRef.current) {
      clearInterval(levelTimerRef.current);
      levelTimerRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    sessionRef.current?.abandon();
    sessionRef.current = null;
    transcriptionAbortRef.current?.abort();
    transcriptionAbortRef.current = null;
  }, []);

  const scrollToSurface = useCallback((id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });
    setExpandedSurface(id);
    void ttsRef.current?.speak(SURFACE_ANNOUNCEMENTS[id] ?? "Opening that section.").catch(() => {});
  }, []);


  /**
   * The ONLY way state changes. Callers report an EVENT; the centralized
   * machine decides the state. No component — including this one — assigns an
   * orb state directly.
   */
  const send = useCallback((event: OrbEvent): OrbState => {
    const next = transition(stateRef.current, event);
    stateRef.current = next;
    setState(next);
    if (shouldReleaseMicrophone(next)) releaseMic();
    return next;
  }, [releaseMic]);

  const clearDwell = useCallback(() => {
    if (dwellRef.current) {
      clearTimeout(dwellRef.current);
      dwellRef.current = null;
    }
  }, []);

  /** Success rests briefly, then the orb goes back to ready on its own. */
  useEffect(() => {
    if (state.kind !== "success") return;
    clearDwell();
    dwellRef.current = setTimeout(() => {
      dwellRef.current = null;
      send({ type: "dismissed" });
    }, SUCCESS_DWELL_MS);
    return clearDwell;
  }, [state.kind, send, clearDwell]);

  /** Connection state is real and worth showing; both listeners are removed. */
  useEffect(() => {
    mountedRef.current = true;
    ttsRef.current = createDefaultTts();
    const goOffline = () => send({ type: "went_offline" });
    const goOnline = () => send({ type: "came_online" });
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    const onSignOut = () => {
      setHistory(clearConversation());
      send({ type: "cancelled" });
    };
    window.addEventListener(SIGN_OUT_EVENT, onSignOut);

    return () => {
      mountedRef.current = false;
      voiceOperationRef.current += 1;
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      window.removeEventListener(SIGN_OUT_EVENT, onSignOut);
      clearDwell();
      releaseMic();
      ttsRef.current?.cancel();
      setHistory(clearConversation());
    };
  }, [send, clearDwell, releaseMic]);


  async function beginWelcome() {
    if (welcomeBusy || !briefingDayKey || !dailyBriefing || !shortGreeting) return;
    setWelcomeBusy(true);
    const storageKey = `obsidian-command-briefing:${briefingDayKey}`;
    let firstOpeningToday = true;
    try {
      firstOpeningToday = !document.cookie.split("; ").includes(`${storageKey}=played`);
      if (firstOpeningToday) {
        document.cookie = `${storageKey}=played; Max-Age=172800; Path=/; SameSite=Lax`;
      }
    } catch {
      // Cookies can be unavailable; the briefing still works.
    }
    setWelcomePending(false);
    try {
      await playStartupChime();
      await ttsRef.current?.speak(firstOpeningToday ? dailyBriefing : shortGreeting);
    } catch {
      send({ type: "failed", message: "The Charles voice is temporarily unavailable. Please try again." });
    } finally {
      setWelcomeBusy(false);
    }
  }
  async function replayDailyBriefing() {
    if (welcomeBusy || !dailyBriefing) return;
    setWelcomeBusy(true);
    try {
      await ttsRef.current?.speak(dailyBriefing);
    } catch {
      send({ type: "failed", message: "The Charles voice is temporarily unavailable. Please try again." });
    } finally {
      setWelcomeBusy(false);
    }
  }
  function remember(turn: ConversationTurn) {
    setHistory((current) => appendRedacted(current, turn));
  }

  async function run(text: string, source: "typed" | "voice" = "typed") {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    // Spoken text has already moved through transcribing -> thinking. Typed text
    // enters thinking here. Both then share the same verified assistant path.
    if (source === "typed") {
      const started = send({ type: "text_submitted", transcript: trimmed });
      if (started.kind !== "thinking") return;
    } else if (stateRef.current.kind !== "thinking") {
      return;
    }

    setQuestion("");
    remember({ role: "user", text: trimmed });
    setBusy(true);
    try {
      const turn = await submitTranscript(trimmed);
      switch (turn.kind) {
        case "answer":
          remember({ role: "assistant", text: turn.text });
          if (source === "voice" || speakTypedAnswers) {
            send({ type: "answer_ready" });
            await speak(turn.text);
          } else {
            send({ type: "answer_shown" });
          }
          break;
        case "proposal":
          remember({ role: "proposal", summary: turn.proposal.humanReadableSummary });
          send({ type: "proposal_received", proposal: turn.proposal });
          break;
        case "declined":
          remember({ role: "assistant", text: turn.message });
          send({ type: "warned", message: turn.message });
          break;
        case "failed":
          remember({ role: "error", text: turn.message });
          send({ type: "failed", message: turn.message });
          break;
        default: {
          const exhaustive: never = turn;
          return exhaustive;
        }
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "That didn't go through.";
      remember({ role: "error", text: message });
      send({ type: "failed", message });
    } finally {
      setBusy(false);
    }
  }

  async function speak(text: string) {
    let started = false;
    try {
      await ttsRef.current?.speak(text, {
        onStart: () => {
          started = true;
          send({ type: "answer_ready" });
        },
        onLevel: (level) => send({ type: "level_changed", level }),
      });
    } finally {
      // Speaking is entered only from the audio backend's real onStart event.
      // If no backend could start, the verified text remains visible without
      // the Iris falsely claiming that sound played.
      send({ type: started ? "playback_finished" : "answer_shown" });
    }
  }

  async function stopListening() {
    const session = sessionRef.current;
    if (!session) return;
    if (levelTimerRef.current) {
      clearInterval(levelTimerRef.current);
      levelTimerRef.current = null;
    }
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    // Detach before the transition: transcribing may not hold a live mic, but
    // this session still needs to finish cleanly and return its recording.
    sessionRef.current = null;
    const operation = ++voiceOperationRef.current;
    send({ type: "capture_stopped" });

    let result;
    try {
      result = await session.stop();
    } catch {
      if (mountedRef.current && operation === voiceOperationRef.current) {
        send({ type: "failed", message: "The recording could not be completed. Please try again." });
      }
      return;
    }
    if (!mountedRef.current || operation !== voiceOperationRef.current) return;
    const assessment = captureCopy(result.assessment);
    if (!assessment.usable || !result.audio) {
      const message = assessment.suggestion
        ? `${assessment.message ?? "That did not record."} ${assessment.suggestion}`
        : (assessment.message ?? "That did not record.");
      send({ type: "failed", message });
      return;
    }

    const controller = new AbortController();
    transcriptionAbortRef.current?.abort();
    transcriptionAbortRef.current = controller;
    const transcription = await transcribe(result.audio, { fetch, signal: controller.signal });
    if (!mountedRef.current || operation !== voiceOperationRef.current) return;
    transcriptionAbortRef.current = null;
    if (transcription.kind === "failed") {
      send({ type: "failed", message: transcription.message });
      return;
    }
    if (transcription.kind === "no_speech") {
      send({ type: "failed", message: "I did not catch any words. Try again." });
      return;
    }

    send({ type: "transcript_ready", transcript: transcription.text });
    await run(transcription.text, "voice");
  }

  async function startListening() {
    if (busy) return;
    const current = stateRef.current.kind;
    if (current === "success" || current === "warning" || current === "error") {
      send({ type: "dismissed" });
    }
    if (stateRef.current.kind !== "idle") return;

    const operation = ++voiceOperationRef.current;
    send({ type: "permission_requested" });
    const permission = await requestMicrophone(userGesture(), {
      getUserMedia: navigator.mediaDevices?.getUserMedia
        ? navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
        : null,
      isSecureContext: window.isSecureContext,
    });

    if (!mountedRef.current || operation !== voiceOperationRef.current) {
      if (permission.kind === "granted") {
        permission.stream.getTracks().forEach((track) => track.stop());
      }
      return;
    }
    if (permission.kind !== "granted") {
      const copy = micPermissionCopy(permission);
      const message = copy.suggestion ? `${copy.message} ${copy.suggestion}` : copy.message;
      send({ type: "failed", message });
      return;
    }

    try {
      const session = startCapture({
        stream: permission.stream,
        createRecorder: createBrowserRecorder,
        createLevelMeter: createBrowserLevelMeter,
        now: () => Date.now(),
      });
      sessionRef.current = session;
      send({ type: "permission_granted" });
      levelTimerRef.current = setInterval(() => {
        if (stateRef.current.kind === "listening") {
          send({ type: "level_changed", level: session.level() ?? 0 });
        }
      }, 80);
      recordingTimerRef.current = setTimeout(() => {
        void stopListening();
      }, MAX_RECORDING_MS);
    } catch (error) {
      permission.stream.getTracks().forEach((track) => track.stop());
      const message = error instanceof Error ? error.message : "Voice could not start.";
      send({ type: "failed", message });
    }
  }

  function onVoiceControl() {
    const kind = stateRef.current.kind;
    if (kind === "idle" || kind === "success" || kind === "warning" || kind === "error") {
      void startListening();
    } else if (kind === "listening") {
      void stopListening();
    } else if (kind === "speaking") {
      ttsRef.current?.cancel();
      send({ type: "playback_finished" });
    }
  }
  async function approve(proposalId: string) {
    if (busy) return;
    send({ type: "proposal_approved" });
    setBusy(true);
    try {
      const result = await approveProposal(proposalId);
      const detail = result.detail ?? result.label;
      // A log that did not record is disclosed, never hidden.
      const text = result.logged ? detail : `${detail} (not recorded in the log)`;
      remember({ role: "outcome", text, ok: result.ok });
      // execution_finished only means "it finished". Whether it WORKED comes
      // from the outcome, so a refusal or failure must not read as success.
      send({ type: "execution_finished" });
      if (!result.ok) send({ type: "warned", message: text });
    } catch (error) {
      const message =
        error instanceof Error && error.message ? error.message : "That didn't work.";
      remember({ role: "error", text: message });
      send({ type: "execution_finished" });
      send({ type: "failed", message });
    } finally {
      setBusy(false);
    }
  }

  async function reject(proposalId: string) {
    send({ type: "proposal_rejected" });
    remember({ role: "outcome", text: "Discarded — nothing was changed.", ok: true });
    await rejectProposal(proposalId);
  }

  const copy = orbCopy(state);

  /** Current failures desaturate the Iris until the operator dismisses them. */
  const capability: CapabilityStatus =
    state.kind === "error" || state.kind === "offline"
      ? "temporarily_unavailable"
      : "available";
  const phase: InteractionPhase =
    state.kind === "requesting_permission" ||
    state.kind === "listening" ||
    state.kind === "transcribing" ||
    state.kind === "thinking" ||
    state.kind === "speaking" ||
    state.kind === "executing"
      ? "requesting_response"
      : state.kind === "action_proposed" || state.kind === "success"
        ? "presenting_response"
        : "idle";
  const visual = deriveIrisVisualState({ capability, phase, needsAttention });

  const proposal =
    state.kind === "action_proposed" || state.kind === "executing"
      ? state.proposal
      : null;

  const resting =
    state.kind === "idle" ||
    state.kind === "success" ||
    state.kind === "warning" ||
    state.kind === "error";
  const canRecover = state.kind === "warning" || state.kind === "error";
  const voiceControlEnabled = resting || state.kind === "listening" || state.kind === "speaking";
  const visualizerPhase =
    state.kind === "listening"
      ? "listening"
      : state.kind === "speaking"
        ? "speaking"
        : state.kind === "thinking"
          ? "thinking"
        : state.kind === "requesting_permission" ||
            state.kind === "transcribing" ||
            state.kind === "executing"
          ? "processing"
          : state.kind === "offline"
            ? "offline"
          : state.kind === "warning"
            ? "alert"
          : state.kind === "error"
            ? "error"
            : "idle";
  const voiceLabel =
    state.kind === "listening"
      ? "Stop listening"
      : state.kind === "speaking"
        ? "Stop speaking"
        : "Start voice input";

  return (
    <div className={`${ui.root} ${presentation === "beauty-compact" ? ui.beautyCompact : ""}`}>
      {/* The orb. Embedded, never floating — it sits in the page flow so it
          cannot cover navigation, approval controls or an error message.
          Animation is pure CSS on compositor-friendly properties, so nothing
          here re-renders per frame. */}
      <div className={ui.instrumentStage}>
        {welcomePending ? (
          <div className={ui.welcomeGate}>
            <p>Voice briefing ready</p>
            <button type="button" onClick={() => void beginWelcome()} disabled={welcomeBusy}>
              {welcomeBusy ? "Starting…" : "Enter Command Center"}
            </button>
          </div>
        ) : null}
        <ul className={ui.controlCluster} aria-label="Command Center sections">
          <li>
            <button
              type="button"
              className={ui.controlButton}
              aria-controls="tonights-flow"
              aria-expanded={expandedSurface === "tonights-flow"}
              onClick={() => scrollToSurface("tonights-flow")}
            >
              Tonight&apos;s Flow
            </button>
          </li>
          <li>
            <button
              type="button"
              className={ui.controlButton}
              aria-controls="action-required"
              aria-expanded={expandedSurface === "action-required"}
              onClick={() => scrollToSurface("action-required")}
            >
              {actionCount > 0 ? `Action Required · ${actionCount}` : "All clear"}
            </button>
          </li>
          <li>
            <button
              type="button"
              className={ui.controlButton}
              aria-controls="business-pulse"
              aria-expanded={expandedSurface === "business-pulse"}
              onClick={() => scrollToSurface("business-pulse")}
            >
              Business Pulse
            </button>
          </li>
        </ul>
        <button
          type="button"
          className={ui.irisButton}
          onClick={onVoiceControl}
          aria-label={voiceLabel}
          disabled={!voiceControlEnabled}
        >
          <EclipseIris
            visual={visual}
            size={460}
            focused={askFocused || state.kind === "listening" || state.kind === "speaking"}
            amplitude={orbLevel(state)}
          />
        </button>
      </div>
      <div className={`${briefing.briefingCard} ${presentation === "beauty-compact" ? ui.beautyCompactBriefing : ""}`}>
        <p className={briefing.briefingLabel}>{presentation === "beauty-compact" ? "OBSIDIAN ASSISTANT" : "OBSIDIAN"}</p>
        <p className={briefing.briefingText}>
          {dailyBriefing || (presentation === "beauty-compact" && state.kind === "idle" ? "Tap the orb for insights and smart suggestions." : copy.detail || copy.label)}
        </p>
        <IrisVisualizer phase={visualizerPhase} amplitude={orbLevel(state)} />
        <span className="sr-only" role="status" aria-live="polite">
          Voice status: {copy.label}
        </span>
      </div>

      {/* The status, in words. The orb is decorative; this is the information,
          and it is legible with no colour and no motion. */}
      <p className={ui.status}>{copy.label}</p>
      {dailyBriefing && !welcomePending ? (
        <button
          type="button"
          className={ui.replayBriefing}
          onClick={() => void replayDailyBriefing()}
          disabled={welcomeBusy}
        >
          {welcomeBusy ? "Speaking…" : "Replay daily briefing"}
        </button>
      ) : null}
      {showTodayOverview ? (
        <button
          type="button"
          className={todayOverviewClassName}
          onClick={() => void run(BEAUTY_TODAY_OVERVIEW_REQUEST)}
          disabled={busy || !resting}
          aria-label="Today's overview: appointments, revenue, and fills due"
        >
          {busy ? "Preparing overview…" : "Today’s overview"}
        </button>
      ) : null}
      {copy.detail && !proposal ? (
        <p className="mt-1 max-w-sm text-center text-xs text-content-muted">
          {copy.detail}
        </p>
      ) : null}

      {/* V3's approval interface. `executing` shows the same summary with no
          decision left to make. */}
      {proposal ? (
        <div className="mt-4 w-full">
          <ProposalCard
            proposal={proposal}
            busy={state.kind === "executing"}
            onApprove={approve}
            onReject={reject}
          />
        </div>
      ) : null}

      {/* Recovery is visible, not implied. Only offered where retrying can
          actually change the answer. */}
      {canRecover ? (
        <button
          type="button"
          onClick={() => send({ type: "dismissed" })}
          className="mt-3 min-h-[44px] rounded-lg border border-line px-4 text-sm text-content-secondary transition-colors hover:border-accent-soft hover:text-content-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
        >
          Dismiss and try again
        </button>
      ) : null}

      {/* THE TYPED PATH. Demoted beneath the orb, fully functional, and the
          only input that exists — this is the flow verified end to end. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(question);
        }}
        className={ui.commandDock}
      >
        <div className={ui.dockWaveform} aria-hidden="true">
          <IrisVisualizer phase={visualizerPhase} amplitude={orbLevel(state)} />
        </div>
        <span className={ui.dockLabel}>Ask Obsidian</span>
        <label htmlFor="obsidian-ask" className="sr-only">
          Ask a question about your business, or describe a ride to record
        </label>
        <input
          id="obsidian-ask"
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onFocus={() => setAskFocused(true)}
          onBlur={() => setAskFocused(false)}
          placeholder="Ask anything, or describe a ride to log…"
          className="min-h-[44px] flex-1 bg-transparent px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:outline-none"
        />
        <button
          type="button"
          onClick={onVoiceControl}
          disabled={!voiceControlEnabled}
          className={ui.voiceButton}
          aria-label={voiceLabel}
          aria-pressed={state.kind === "listening"}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 14.5a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 1 0-7 0v5a3.5 3.5 0 0 0 3.5 3.5Z" />
            <path d="M5.5 10.5v.5a6.5 6.5 0 0 0 13 0v-.5M12 17.5V21M8.5 21h7" />
          </svg>
          <span>{state.kind === "listening" ? "Stop" : "Voice"}</span>
        </button>

        <button
          type="submit"
          disabled={busy || !question.trim() || !resting}
          className="min-h-[44px] rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Working…" : "Ask"}
        </button>
      </form>
      <p className={ui.inputNote}>
        {state.kind === "listening"
          ? "Recording now — tap the Iris or Stop when you are finished."
          : "Tap the Iris or Voice to speak. Every change still requires your approval."}
      </p>

      {/* Conversation. Bounded and cleared on sign-out; these lines name real
          customers. Each role is labelled as well as styled. */}
      <div aria-live="polite" aria-atomic="false" className="w-full">
        {history.length > 0 ? (
          <ol className="mt-4 w-full space-y-2">
            {history.map((turn, index) => (
              <li
                key={`${turn.role}-${index}`}
                className="rounded-lg border border-line bg-surface-base/50 px-4 py-3"
              >
                <p className="text-[11px] uppercase tracking-wide text-content-muted">
                  {turn.role === "user"
                    ? "You"
                    : turn.role === "proposal"
                      ? "Proposed — not yet done"
                      : turn.role === "outcome"
                        ? turn.ok
                          ? "Done"
                          : "Not done"
                        : turn.role === "error"
                          ? "Problem"
                          : "OBSIDIAN"}
                </p>
                <p
                  className={`mt-1 whitespace-pre-wrap text-sm leading-relaxed ${
                    turn.role === "error" ? "text-state-danger" : "text-content-primary"
                  }`}
                >
                  {turn.role === "proposal" ? turn.summary : turn.text}
                </p>
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      {history.length > 0 ? (
        <button
          type="button"
          onClick={() => setHistory(clearConversation())}
          className="mt-3 self-end rounded-lg px-3 py-1.5 text-xs text-content-muted underline-offset-2 transition-colors hover:text-content-secondary hover:underline"
        >
          Clear conversation
        </button>
      ) : null}

      <p className={ui.trust}>
        OBSIDIAN answers only from your verified business data — every figure
        comes from a tool that queries your records. It never guesses numbers.
        Anything that would change your records is shown for your approval first.
        {copy.label ? <span className="sr-only"> Status: {copy.label}.</span> : null}
      </p>
    </div>
  );
}
