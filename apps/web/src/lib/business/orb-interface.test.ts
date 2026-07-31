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
/* The voice states are unreachable from the UI                        */
/* ================================================================== */

describe("voice states exist, are tested, and cannot be entered from the dashboard", () => {
  const VOICE_STATES = ["requesting_permission", "listening", "transcribing", "speaking"];

  /** They are real states with real copy — implemented, not stubbed out. */
  it("each voice state is implemented and has its own words", () => {
    for (const kind of VOICE_STATES) expect(ORB_KINDS).toContain(kind);
    expect(orbCopy({ kind: "listening", level: 0 }).label).toBe("Listening…");
    expect(orbCopy({ kind: "transcribing" }).label).toBe("Writing that down…");
    expect(orbCopy({ kind: "speaking", level: 0 }).label).toBe("Speaking…");
    expect(orbCopy({ kind: "requesting_permission" }).label).toBe("Waiting for microphone");
  });

  /**
   * The events that lead to them are exactly the events the component must not
   * dispatch. This is the guarantee, checked at the source.
   */
  it("the component dispatches none of the events that reach a voice state", () => {
    const code = readFileSync(COMPONENT, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");

    for (const forbidden of [
      "permission_requested",
      "permission_granted",
      "permission_denied",
      "capture_stopped",
      "transcript_ready",
      "level_changed",
      "answer_ready",
      "playback_finished",
    ]) {
      expect(code).not.toContain(forbidden);
    }
  });

  it("the component opens no microphone and imports no capture module", () => {
    const text = readFileSync(COMPONENT, "utf8");
    expect(text).not.toContain("getUserMedia");
    expect(text).not.toContain("MediaRecorder");
    expect(text).not.toContain("audio-capture");
    expect(text).not.toContain("mic-permission");
    expect(text).not.toContain("transcribe-client");
  });

  /**
   * Proof by exhaustion: starting from idle, no sequence built only from the
   * events the component actually sends can land on a voice state.
   */
  it("no reachable sequence of dashboard events produces a voice state", () => {
    const dashboardEvents: OrbEvent[] = [
      { type: "text_submitted", transcript: "t" },
      { type: "answer_shown" },
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

    // Breadth-first over every state reachable from idle using only those.
    const seen = new Set<string>();
    const queue: OrbState[] = [{ kind: "idle" }];
    const reached: OrbState[] = [];
    while (queue.length > 0) {
      const state = queue.shift() as OrbState;
      const key = JSON.stringify(state);
      if (seen.has(key)) continue;
      seen.add(key);
      reached.push(state);
      for (const event of dashboardEvents) queue.push(transition(state, event));
    }

    const kinds = new Set(reached.map((s) => s.kind));
    for (const voice of VOICE_STATES) expect([...kinds]).not.toContain(voice);
    // And the walk really explored something.
    expect(kinds.size).toBeGreaterThanOrEqual(6);
  });

  it("the UI offers no microphone control, and says why", () => {
    const text = readFileSync(COMPONENT, "utf8");
    expect(text).not.toMatch(/aria-label="[^"]*[Mm]icrophone/);
    // The affordance is a plain statement, not a dead button.
    expect(text).toContain("voice isn&apos;t enabled yet");
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

  it("approval and rejection both reach the server, through the orb's own card", () => {
    const text = readFileSync(COMPONENT, "utf8");
    expect(text).toContain("approveProposal");
    expect(text).toContain("rejectProposal");
    expect(text).toContain("onApproveProposal={approve}");
    expect(text).toContain("onRejectProposal={reject}");
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
