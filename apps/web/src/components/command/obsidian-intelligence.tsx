"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProposalCard } from "@/components/proposal-card";
import { EclipseIris } from "@/components/command/eclipse-iris";
import { IrisVisualizer } from "@/components/command/iris-visualizer";
import ui from "./obsidian-intelligence.module.css";
import {
  deriveIrisVisualState,
  irisStatusText,
  type CapabilityStatus,
  type InteractionPhase,
} from "@/lib/business/iris";
import {
  orbCopy,
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

/**
 * Phase 2 — OBSIDIAN Intelligence, with the orb as the centerpiece.
 *
 * THE RULE THIS COMPONENT EXISTS TO KEEP: the orb tells the truth about what
 * is actually happening. It is not decoration and it is not a preview of
 * voice. Every state it can reach from here corresponds to something the
 * application is really doing on the verified typed path:
 *
 *   resting                      → idle
 *   request in flight            → thinking
 *   proposal returned            → action_proposed
 *   approval pressed             → executing
 *   write succeeded              → success, then back to idle
 *   refusal / failure            → warning / error, recovery visible
 *   connection lost              → offline
 *
 * The four voice states — requesting_permission, listening, transcribing,
 * speaking — are implemented in the machine and covered by tests, and are
 * DELIBERATELY UNREACHABLE from this component. Nothing here dispatches
 * `permission_requested`, `capture_stopped`, `transcript_ready`,
 * `level_changed` or `answer_ready`. An orb that showed "Listening…" while no
 * microphone was open would be the exact lie this design forbids, and on this
 * machine the microphone records silence anyway.
 *
 * The typed path is DEMOTED, never removed. It is the path verified against
 * production, and if voice never works, OBSIDIAN still works.
 */

/** How long a success rests on screen before the orb returns to idle. */
const SUCCESS_DWELL_MS = 2400;

export function ObsidianIntelligence({
  needsAttention = false,
}: {
  /**
   * Gate 1: the ONLY real-data input to the orb's amber treatment. Passed from
   * the Command Center, derived from the same action-required list that
   * produces "1 ride needs closing out" — not a second calculation of the same
   * question.
   */
  needsAttention?: boolean;
} = {}) {
  const [state, setState] = useState<OrbState>({ kind: "idle" });
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [askFocused, setAskFocused] = useState(false);

  const stateRef = useRef<OrbState>({ kind: "idle" });
  const dwellRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollToSurface = useCallback((id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.focus({ preventScroll: true });
    target.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    });
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
    return next;
  }, []);

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
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      window.removeEventListener(SIGN_OUT_EVENT, onSignOut);
      clearDwell();
      setHistory(clearConversation());
    };
  }, [send, clearDwell]);

  function remember(turn: ConversationTurn) {
    setHistory((current) => appendRedacted(current, turn));
  }

  async function run(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    // Refused by the machine (mid-execution, offline) — leave the box alone so
    // nothing the user typed is thrown away.
    const started = send({ type: "text_submitted", transcript: trimmed });
    if (started.kind !== "thinking") return;

    setQuestion("");
    remember({ role: "user", text: trimmed });
    setBusy(true);
    try {
      const turn = await submitTranscript(trimmed);
      switch (turn.kind) {
        case "answer":
          remember({ role: "assistant", text: turn.text });
          // Shown, not spoken — see `answer_shown` in orb.ts.
          send({ type: "answer_shown" });
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

  /**
   * Gate 1 wiring. `capability` is "available" because the only capability the
   * orb currently reflects is the typed path, which works. Voice is Gate 3 —
   * when it lands, an unconfigured or denied microphone flows in here and the
   * orb goes "unavailable" without any other change.
   */
  const capability: CapabilityStatus = "available";
  const phase: InteractionPhase =
    state.kind === "thinking" || state.kind === "executing"
      ? "requesting_response"
      : state.kind === "action_proposed" || state.kind === "success"
        ? "presenting_response"
        : "idle";
  const visual = deriveIrisVisualState({ capability, phase, needsAttention });
  const irisStatus = irisStatusText(visual);

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

  return (
    <div className={ui.root}>
      {/* The orb. Embedded, never floating — it sits in the page flow so it
          cannot cover navigation, approval controls or an error message.
          Animation is pure CSS on compositor-friendly properties, so nothing
          here re-renders per frame. */}
      <div className={ui.instrumentStage}>
        <ul className={ui.controlCluster} aria-label="Command Center sections">
          <li>
            <button
              type="button"
              className={ui.controlButton}
              aria-controls="tonights-flow"
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
              onClick={() => scrollToSurface("action-required")}
            >
              Action Required
            </button>
          </li>
          <li>
            <button
              type="button"
              className={ui.controlButton}
              aria-controls="business-pulse"
              onClick={() => scrollToSurface("business-pulse")}
            >
              Business Pulse
            </button>
          </li>
        </ul>
        <EclipseIris visual={visual} size={282} focused={askFocused} />
      </div>
      <IrisVisualizer phase="unavailable" amplitude={null} />

      {/* The status, in words. The orb is decorative; this is the information,
          and it is legible with no colour and no motion. */}
      <p className={ui.status}>{irisStatus}</p>
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
          type="submit"
          disabled={busy || !question.trim() || !resting}
          className="min-h-[44px] rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Working…" : "Ask"}
        </button>
      </form>

      {/* No microphone control. Voice is Phase 3, and a button that opened
          nothing would be exactly the dishonesty the orb is built to avoid.
          Saying so plainly is the honest affordance. */}
      <p className={ui.inputNote}>
        Typing is the only input for now — voice isn&apos;t enabled yet.
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
