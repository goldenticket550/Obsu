import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ORB_EVENT_TYPES,
  ORB_KINDS,
  orbCopy,
  transition,
  type OrbEvent,
  type OrbState,
} from "./orb";
import { buildProposal, type ProposalAction } from "./proposal";

/**
 * Phase 2 — the orb is the interface, and it must tell the truth about what is
 * actually happening.
 *
 * The load-bearing claim here is NEGATIVE: four states exist, are implemented,
 * and cannot be reached from the dashboard. An orb reading "Listening…" while
 * no microphone is open is precisely the lie this design exists to prevent —
 * and on this machine the microphone records silence, so the lie would also be
 * permanent.
 */

const NOW = new Date("2026-07-30T18:00:00Z");
const SRC = join(process.cwd(), "src");
const COMPONENT = join(SRC, "components", "command", "obsidian-intelligence.tsx");

const ACTION: ProposalAction = {
  kind: "create_trip",
  customerName: "Ashley",
  tripDate: "2026-07-30",
  tripType: "airport",
  status: "completed",
  revenueCents: 24000,
  pickup: null,
  dropoff: null,
  paymentMethod: null,
  costs: { gasCents: null, tollsCents: null, otherCents: null, otherLabel: null },
};
const PROPOSAL = buildProposal("p1", ACTION, NOW);

/** Drives the machine the way the component does: events only, never states. */
function run(events: OrbEvent[], from: OrbState = { kind: "idle" }): OrbState {
  return events.reduce(transition, from);
}

/* ================================================================== */
/* The real typed flow                                                 */
/* ================================================================== */

describe("the orb follows the verified typed flow", () => {
  it("rests at idle", () => {
    expect(run([]).kind).toBe("idle");
    expect(orbCopy({ kind: "idle" }).label).toBe("Ready");
  });

  it("goes to thinking when a request is in flight", () => {
    expect(run([{ type: "text_submitted", transcript: "how much did I make?" }]).kind).toBe(
      "thinking",
    );
  });

  it("returns to idle when an answer is SHOWN, never through speaking", () => {
    const end = run([
      { type: "text_submitted", transcript: "how much did I make?" },
      { type: "answer_shown" },
    ]);
    expect(end.kind).toBe("idle");
    // The typed path has no audio, so `speaking` must not appear in it.
    expect(end.kind).not.toBe("speaking");
  });

  it("shows a proposal, then executes it, then succeeds", () => {
    const proposed = run([
      { type: "text_submitted", transcript: "log a ride" },
      { type: "proposal_received", proposal: PROPOSAL },
    ]);
    expect(proposed.kind).toBe("action_proposed");

    const executing = transition(proposed, { type: "proposal_approved" });
    expect(executing.kind).toBe("executing");
    // What was approved is what runs — the proposal carries through unchanged.
    if (executing.kind === "executing") {
      expect(executing.proposal).toBe(PROPOSAL);
    }

    expect(transition(executing, { type: "execution_finished" }).kind).toBe("success");
  });

  it("rejecting a proposal returns to idle and executes nothing", () => {
    const proposed = run([
      { type: "text_submitted", transcript: "log a ride" },
      { type: "proposal_received", proposal: PROPOSAL },
    ]);
    expect(transition(proposed, { type: "proposal_rejected" }).kind).toBe("idle");
  });

  it("a refusal is a warning and a failure is an error, each carrying words", () => {
    const warned = run([
      { type: "text_submitted", transcript: "yes" },
      { type: "warned", message: "Approving is a button." },
    ]);
    expect(warned.kind).toBe("warning");
    expect(orbCopy(warned).detail).toBe("Approving is a button.");
    expect(orbCopy(warned).tone).toBe("warning");

    const failed = run([
      { type: "text_submitted", transcript: "how much?" },
      { type: "failed", message: "The assistant is unavailable." },
    ]);
    expect(failed.kind).toBe("error");
    expect(orbCopy(failed).tone).toBe("danger");
  });

  it("recovers from an error back to idle — the path out is real", () => {
    const failed = run([
      { type: "text_submitted", transcript: "x" },
      { type: "failed", message: "boom" },
    ]);
    expect(transition(failed, { type: "dismissed" }).kind).toBe("idle");
    // And from a warning, and from a success.
    expect(transition({ kind: "warning", message: "w" }, { type: "dismissed" }).kind).toBe("idle");
    expect(transition({ kind: "success" }, { type: "dismissed" }).kind).toBe("idle");
  });

  it("going offline is shown, and coming back restores rest", () => {
    const offline = transition({ kind: "idle" }, { type: "went_offline" });
    expect(offline.kind).toBe("offline");
    expect(orbCopy(offline).label).toBe("Offline");
    expect(transition(offline, { type: "came_online" }).kind).toBe("idle");
  });

  /** An action already touching the database must not be yanked out from under. */
  it("nothing interrupts an execution in flight", () => {
    const executing: OrbState = { kind: "executing", proposal: PROPOSAL };
    for (const event of [
      { type: "went_offline" } as const,
      { type: "failed", message: "x" } as const,
      { type: "cancelled" } as const,
    ]) {
      expect(transition(executing, event).kind).toBe("executing");
    }
  });
});

/* ================================================================== */
/* Invalid transitions                                                 */
/* ================================================================== */

describe("invalid transitions are ignored, not obeyed", () => {
  it("a stray answer while idle does not invent a turn", () => {
    expect(transition({ kind: "idle" }, { type: "answer_shown" }).kind).toBe("idle");
    expect(transition({ kind: "idle" }, { type: "answer_ready" }).kind).toBe("idle");
  });

  it("approval while idle proposes nothing", () => {
    expect(transition({ kind: "idle" }, { type: "proposal_approved" }).kind).toBe("idle");
    expect(transition({ kind: "idle" }, { type: "execution_finished" }).kind).toBe("idle");
  });

  it("typing while the machine is busy is refused, so nothing is discarded", () => {
    const executing: OrbState = { kind: "executing", proposal: PROPOSAL };
    expect(
      transition(executing, { type: "text_submitted", transcript: "hello" }).kind,
    ).toBe("executing");
    expect(
      transition({ kind: "thinking", transcript: "a" }, {
        type: "text_submitted",
        transcript: "b",
      }).kind,
    ).toBe("thinking");
  });

  it("the machine is total — no state/event pair throws or returns undefined", () => {
    const states: OrbState[] = [
      { kind: "idle" },
      { kind: "requesting_permission" },
      { kind: "listening", level: 0.3 },
      { kind: "transcribing" },
      { kind: "thinking", transcript: "t" },
      { kind: "speaking", level: 0.2 },
      { kind: "action_proposed", proposal: PROPOSAL },
      { kind: "executing", proposal: PROPOSAL },
      { kind: "success" },
      { kind: "warning", message: "w" },
      { kind: "error", message: "e" },
      { kind: "offline" },
    ];
    const events: OrbEvent[] = [
      { type: "permission_requested" },
      { type: "permission_granted" },
      { type: "permission_denied" },
      { type: "level_changed", level: 0.5 },
      { type: "capture_stopped" },
      { type: "transcript_ready", transcript: "t" },
      { type: "text_submitted", transcript: "t" },
      { type: "answer_ready" },
      { type: "answer_shown" },
      { type: "playback_finished" },
      { type: "proposal_received", proposal: PROPOSAL },
      { type: "proposal_approved" },
      { type: "proposal_rejected" },
      { type: "execution_finished" },
      { type: "warned", message: "w" },
      { type: "failed", message: "f" },
      { type: "went_offline" },
      { type: "came_online" },
      { type: "dismissed" },
      { type: "cancelled" },
    ];
    expect(states).toHaveLength(ORB_KINDS.length);
    expect(events).toHaveLength(ORB_EVENT_TYPES.length);

    for (const state of states) {
      for (const event of events) {
        const next = transition(state, event);
        expect(next).toBeDefined();
        expect(ORB_KINDS).toContain(next.kind);
        // Copy exists for whatever came out.
        expect(orbCopy(next).label.length).toBeGreaterThan(0);
      }
    }
  });
});

/* ================================================================== */
/* Voice is a real, user-initiated Command Center capability            */
/* ================================================================== */

describe("voice is real, explicit, and truthful on the dashboard", () => {
  it("each voice state is implemented and has its own words", () => {
    expect(orbCopy({ kind: "listening", level: 0 }).label).toBe("Listening…");
    expect(orbCopy({ kind: "transcribing" }).label).toBe("Writing that down…");
    expect(orbCopy({ kind: "speaking", level: 0 }).label).toBe("Speaking…");
    expect(orbCopy({ kind: "requesting_permission" }).label).toBe("Waiting for microphone");
  });

  it("the real voice sequence reaches only states backed by real work", () => {
    const states: OrbState[] = [{ kind: "idle" }];
    for (const event of [
      { type: "permission_requested" } as const,
      { type: "permission_granted" } as const,
      { type: "level_changed", level: 0.4 } as const,
      { type: "capture_stopped" } as const,
      { type: "transcript_ready", transcript: "how much did I make" } as const,
      { type: "answer_ready" } as const,
      { type: "playback_finished" } as const,
    ]) states.push(transition(states.at(-1) as OrbState, event));

    expect(states.map((state) => state.kind)).toEqual([
      "idle",
      "requesting_permission",
      "listening",
      "listening",
      "transcribing",
      "thinking",
      "speaking",
      "idle",
    ]);
  });

  it("the dashboard connects capture, transcription, and playback", () => {
    const text = readFileSync(COMPONENT, "utf8");
    expect(text).toContain("requestMicrophone(userGesture()");
    expect(text).toContain("startCapture({");
    expect(text).toContain("transcribe(result.audio");
    expect(text).toContain("createDefaultTts()");
    expect(text).toContain('send({ type: "level_changed", level: session.level() ?? 0 })');
  });

  it("voice begins only from an explicit control and remains stoppable", () => {
    const text = readFileSync(COMPONENT, "utf8");
    expect(text).toContain("onClick={onVoiceControl}");
    expect(text).toContain('aria-label={voiceLabel}');
    expect(text).toContain('aria-pressed={state.kind === "listening"}');
    expect(text).toContain('state.kind === "listening" ? "Stop" : "Voice"');
    expect(text).not.toMatch(/useEffect\([\s\S]{0,500}requestMicrophone/);
  });

  it("every live resource has a bounded, shared release path", () => {
    const text = readFileSync(COMPONENT, "utf8");
    expect(text).toContain("MAX_RECORDING_MS = 30_000");
    expect(text).toContain("sessionRef.current?.abandon()");
    expect(text).toContain("clearInterval(levelTimerRef.current)");
    expect(text).toContain("clearTimeout(recordingTimerRef.current)");
    expect(text).toContain("ttsRef.current?.cancel()");
    expect(text).toContain("mountedRef.current = false");
  });
});
/* ================================================================== */
/* Reduced motion, and animation off the React tree                    */
/* ================================================================== */

describe("motion and rendering discipline", () => {
  const ORB = join(SRC, "components", "obsidian-orb.tsx");

  it("the orb respects prefers-reduced-motion and still shows its label", () => {
    const text = readFileSync(ORB, "utf8");
    expect(text).toContain("prefers-reduced-motion: reduce");
    // Reduced motion paints one frame instead of starting a loop.
    expect(text).toContain("if (reducedMotion) {");
    expect(text).toContain("requestAnimationFrame");
    // The status line is rendered regardless of motion preference.
    expect(text).toContain('role="status"');
  });

  it("status is never colour alone — every state carries words", () => {
    for (const state of [
      { kind: "idle" } as const,
      { kind: "success" } as const,
      { kind: "warning", message: "w" } as const,
      { kind: "error", message: "e" } as const,
      { kind: "offline" } as const,
    ]) {
      expect(orbCopy(state).label.trim().length).toBeGreaterThan(0);
    }
  });

  it("the animation loop keeps its per-frame values in refs, not React state", () => {
    const text = readFileSync(ORB, "utf8");
    // Per-frame reads go through refs; a setState in the frame callback would
    // re-render the dashboard sixty times a second.
    expect(text).toContain("stateRef.current");
    expect(text).toContain("levelRef.current");
    const frame = text.slice(text.indexOf("const frame ="), text.indexOf("drawRef.current"));
    expect(frame).not.toContain("setState");
    expect(frame).not.toMatch(/\bset[A-Z]\w*\(/);
  });

  it("every timer, frame and listener the section starts is cleaned up", () => {
    const text = readFileSync(COMPONENT, "utf8");
    expect(text).toContain("clearTimeout");
    expect(text).toContain("removeEventListener");
    // Same number of listeners added as removed.
    const added = (text.match(/addEventListener\(/g) ?? []).length;
    const removed = (text.match(/removeEventListener\(/g) ?? []).length;
    expect(removed).toBe(added);

    const orb = readFileSync(ORB, "utf8");
    expect(orb).toContain("cancelAnimationFrame");
    expect(orb).toContain("removeEventListener");
  });

  it("the orb is embedded, not a floating overlay", () => {
    const text = readFileSync(COMPONENT, "utf8");
    // Nothing that lifts it out of the page flow over other controls.
    expect(text).not.toContain("position: fixed");
    expect(text).not.toMatch(/\bfixed\b.*\bz-\d/);
    expect(text).not.toContain("fixed bottom-");
  });
});

/* ================================================================== */
/* The typed path must not regress                                     */
/* ================================================================== */

describe("the typed path stays fully functional", () => {
  it("the input and its submit control are present and labelled", () => {
    const text = readFileSync(COMPONENT, "utf8");
    expect(text).toContain('htmlFor="obsidian-ask"');
    expect(text).toContain('id="obsidian-ask"');
    expect(text).toContain('type="submit"');
    expect(text).toContain("submitTranscript");
  });

  it("approval and rejection both reach the server, through the proposal card", () => {
    // EXPECTATION UPDATED: Gate 1 replaced the canvas orb with EclipseIris,
    // which is purely decorative and renders no controls. The ProposalCard is
    // therefore mounted by this component directly instead of being passed
    // through the orb's props. Same two handlers, same server actions — only
    // the owner of the card moved.
    const text = readFileSync(COMPONENT, "utf8");
    expect(text).toContain("approveProposal");
    expect(text).toContain("rejectProposal");
    expect(text).toContain("<ProposalCard");
    expect(text).toContain("onApprove={approve}");
    expect(text).toContain("onReject={reject}");
  });

  it("a failed approval is never described as success", () => {
    // execution_finished only means "it finished"; the outcome decides the words.
    const executing: OrbState = { kind: "executing", proposal: PROPOSAL };
    const finished = transition(executing, { type: "execution_finished" });
    expect(finished.kind).toBe("success");
    const corrected = transition(finished, { type: "warned", message: "Not done" });
    expect(corrected.kind).toBe("warning");
    expect(orbCopy(corrected).tone).not.toBe("positive");

    const component = readFileSync(COMPONENT, "utf8");
    expect(component).toContain("if (!result.ok) send({ type: \"warned\"");
  });
});
