import { describe, expect, it } from "vitest";
import {
  IDLE,
  ORB_EVENT_TYPES,
  ORB_KINDS,
  orbCopy,
  orbLevel,
  transition,
  type OrbEvent,
  type OrbState,
} from "./orb";
import { buildProposal } from "./proposal";

/**
 * V1 — the orb state machine. Every assertion here is driven from the unions
 * themselves, so adding a variant makes these fail rather than pass by
 * omission.
 */

/** A real proposal, built the same way production builds one. */
const SAMPLE_PROPOSAL = buildProposal(
  "prop-1",
  { kind: "cancel_trip", tripId: "trip-1", expectedStatus: "scheduled" },
  new Date("2026-07-28T23:00:00Z"),
);

/** One representative value per state kind, built from the union. */
const SAMPLE_STATES: Record<OrbState["kind"], OrbState> = {
  idle: { kind: "idle" },
  requesting_permission: { kind: "requesting_permission" },
  listening: { kind: "listening", level: 0.4 },
  transcribing: { kind: "transcribing" },
  thinking: { kind: "thinking", transcript: "how much did I make this month" },
  speaking: { kind: "speaking", level: 0.6 },
  action_proposed: { kind: "action_proposed", proposal: SAMPLE_PROPOSAL },
  executing: { kind: "executing", proposal: SAMPLE_PROPOSAL },
  success: { kind: "success" },
  warning: { kind: "warning", message: "Some data was stale." },
  error: { kind: "error", message: "The assistant is unreachable." },
  offline: { kind: "offline" },
};

/** One representative value per event type, built from the union. */
const SAMPLE_EVENTS: Record<OrbEvent["type"], OrbEvent> = {
  permission_requested: { type: "permission_requested" },
  permission_granted: { type: "permission_granted" },
  permission_denied: { type: "permission_denied" },
  level_changed: { type: "level_changed", level: 0.5 },
  capture_stopped: { type: "capture_stopped" },
  transcript_ready: { type: "transcript_ready", transcript: "hello" },
  text_submitted: { type: "text_submitted", transcript: "hello" },
  answer_ready: { type: "answer_ready" },
  playback_finished: { type: "playback_finished" },
  proposal_received: { type: "proposal_received", proposal: SAMPLE_PROPOSAL },
  proposal_approved: { type: "proposal_approved" },
  proposal_rejected: { type: "proposal_rejected" },
  execution_finished: { type: "execution_finished" },
  warned: { type: "warned", message: "Careful" },
  failed: { type: "failed", message: "Boom" },
  went_offline: { type: "went_offline" },
  came_online: { type: "came_online" },
  dismissed: { type: "dismissed" },
  cancelled: { type: "cancelled" },
};

const allStates = ORB_KINDS.map((k) => SAMPLE_STATES[k]);
const allEvents = ORB_EVENT_TYPES.map((t) => SAMPLE_EVENTS[t]);

describe("the samples cover the whole union", () => {
  it("has a sample for every state kind", () => {
    expect(Object.keys(SAMPLE_STATES).sort()).toEqual([...ORB_KINDS].sort());
    expect(allStates).toHaveLength(12);
  });

  it("has a sample for every event type", () => {
    expect(Object.keys(SAMPLE_EVENTS).sort()).toEqual([...ORB_EVENT_TYPES].sort());
  });
});

describe("transition is total", () => {
  it("returns a valid state for EVERY (state, event) pair", () => {
    for (const state of allStates) {
      for (const event of allEvents) {
        const next = transition(state, event);
        expect(next).toBeDefined();
        expect(ORB_KINDS).toContain(next.kind);
      }
    }
  });

  it("never throws on any pair", () => {
    for (const state of allStates) {
      for (const event of allEvents) {
        expect(() => transition(state, event)).not.toThrow();
      }
    }
  });

  it("returns the SAME state object for meaningless pairs, never a wrong one", () => {
    // answer_ready only means something while thinking.
    for (const state of allStates) {
      if (state.kind === "thinking") continue;
      expect(transition(state, { type: "answer_ready" })).toBe(state);
    }
  });
});

describe("the happy path", () => {
  it("walks idle -> permission -> listening -> transcribing -> thinking -> speaking -> idle", () => {
    let s: OrbState = IDLE;
    s = transition(s, { type: "permission_requested" });
    expect(s.kind).toBe("requesting_permission");
    s = transition(s, { type: "permission_granted" });
    expect(s.kind).toBe("listening");
    s = transition(s, { type: "capture_stopped" });
    expect(s.kind).toBe("transcribing");
    s = transition(s, { type: "transcript_ready", transcript: "what did I earn" });
    expect(s).toEqual({ kind: "thinking", transcript: "what did I earn" });
    s = transition(s, { type: "answer_ready" });
    expect(s.kind).toBe("speaking");
    s = transition(s, { type: "playback_finished" });
    expect(s).toEqual(IDLE);
  });

  it("carries the transcript into thinking, not a parallel variable", () => {
    const thinking = transition(
      { kind: "transcribing" },
      { type: "transcript_ready", transcript: "who is my top customer" },
    );
    expect(thinking).toEqual({
      kind: "thinking",
      transcript: "who is my top customer",
    });
  });

  it("walks the V3 approval path", () => {
    let s: OrbState = { kind: "thinking", transcript: "cancel my 9pm" };
    s = transition(s, { type: "proposal_received", proposal: SAMPLE_PROPOSAL });
    expect(s).toEqual({ kind: "action_proposed", proposal: SAMPLE_PROPOSAL });
    s = transition(s, { type: "proposal_approved" });
    // The very same proposal object carries through: what was approved is
    // exactly what will be executed.
    expect(s).toEqual({ kind: "executing", proposal: SAMPLE_PROPOSAL });
    if (s.kind === "executing") expect(s.proposal).toBe(SAMPLE_PROPOSAL);
    s = transition(s, { type: "execution_finished" });
    expect(s).toEqual({ kind: "success" });
  });

  it("rejecting a proposal returns to idle without executing", () => {
    const proposed: OrbState = { kind: "action_proposed", proposal: SAMPLE_PROPOSAL };
    expect(transition(proposed, { type: "proposal_rejected" })).toEqual(IDLE);
  });
});

describe("amplitude", () => {
  it("updates only where the orb actually moves to it", () => {
    expect(
      transition({ kind: "listening", level: 0 }, { type: "level_changed", level: 0.7 }),
    ).toEqual({ kind: "listening", level: 0.7 });
    expect(
      transition({ kind: "speaking", level: 0 }, { type: "level_changed", level: 0.3 }),
    ).toEqual({ kind: "speaking", level: 0.3 });
  });

  it("a late tick cannot resurrect a finished state", () => {
    // The classic bug: audio callback fires after playback ended.
    const after = transition(IDLE, { type: "level_changed", level: 0.9 });
    expect(after).toEqual(IDLE);
    expect(orbLevel(after)).toBe(0);
  });

  it("clamps out-of-range and non-finite readings", () => {
    const high = transition({ kind: "listening", level: 0 }, { type: "level_changed", level: 5 });
    const low = transition({ kind: "listening", level: 0 }, { type: "level_changed", level: -3 });
    const nan = transition({ kind: "listening", level: 0 }, { type: "level_changed", level: Number.NaN });
    expect(orbLevel(high)).toBe(1);
    expect(orbLevel(low)).toBe(0);
    expect(orbLevel(nan)).toBe(0);
  });

  it("is zero for every state that has no amplitude", () => {
    for (const state of allStates) {
      if (state.kind === "listening" || state.kind === "speaking") continue;
      expect(orbLevel(state)).toBe(0);
    }
  });
});

describe("interruptions", () => {
  it("going offline interrupts anything EXCEPT a running action", () => {
    for (const state of allStates) {
      const next = transition(state, { type: "went_offline" });
      if (state.kind === "executing") {
        // Losing the network does not un-run an action already in flight.
        expect(next).toBe(state);
      } else {
        expect(next).toEqual({ kind: "offline" });
      }
    }
  });

  it("a failure interrupts anything except a running action", () => {
    for (const state of allStates) {
      const next = transition(state, { type: "failed", message: "nope" });
      if (state.kind === "executing") expect(next).toBe(state);
      else expect(next).toEqual({ kind: "error", message: "nope" });
    }
  });

  it("cancelling returns to idle except while executing", () => {
    for (const state of allStates) {
      const next = transition(state, { type: "cancelled" });
      if (state.kind === "executing") expect(next).toBe(state);
      else expect(next).toEqual(IDLE);
    }
  });

  it("coming back online only helps when offline", () => {
    expect(transition({ kind: "offline" }, { type: "came_online" })).toEqual(IDLE);
    for (const state of allStates) {
      if (state.kind === "offline") continue;
      expect(transition(state, { type: "came_online" })).toBe(state);
    }
  });

  it("dismiss clears only a resting result, never work in progress", () => {
    const resting = ["success", "warning", "error"];
    for (const state of allStates) {
      const next = transition(state, { type: "dismissed" });
      if (resting.includes(state.kind)) expect(next).toEqual(IDLE);
      else expect(next).toBe(state);
    }
  });

  it("denying permission explains what to do, and only from the prompt", () => {
    const denied = transition(
      { kind: "requesting_permission" },
      { type: "permission_denied" },
    );
    expect(denied.kind).toBe("error");
    if (denied.kind === "error") {
      expect(denied.message.toLowerCase()).toContain("microphone");
    }
    // Meaningless anywhere else.
    expect(transition(IDLE, { type: "permission_denied" })).toEqual(IDLE);
  });
});

/**
 * The structural guarantee: a state cannot carry data it has no business
 * holding. This is what the union buys us over a string plus side variables.
 */
describe("no reachable state carries data it should not", () => {
  /** Breadth-first over every state reachable from idle within N events. */
  function reachableStates(depth: number): OrbState[] {
    let frontier: OrbState[] = [IDLE];
    const seen: OrbState[] = [IDLE];
    for (let i = 0; i < depth; i++) {
      const next: OrbState[] = [];
      for (const state of frontier) {
        for (const event of allEvents) {
          const result = transition(state, event);
          if (!seen.some((s) => JSON.stringify(s) === JSON.stringify(result))) {
            seen.push(result);
            next.push(result);
          }
        }
      }
      frontier = next;
    }
    return seen;
  }

  const reachable = reachableStates(4);

  it("explores a meaningful part of the machine", () => {
    expect(reachable.length).toBeGreaterThan(8);
  });

  it("never produces an error message while idle", () => {
    for (const state of reachable) {
      if (state.kind === "idle") {
        expect(Object.keys(state)).toEqual(["kind"]);
      }
    }
  });

  it("never produces a transcript while offline", () => {
    for (const state of reachable) {
      if (state.kind === "offline") {
        expect(Object.keys(state)).toEqual(["kind"]);
        expect(JSON.stringify(state)).not.toContain("transcript");
      }
    }
  });

  it("keeps success free of any explanation", () => {
    for (const state of reachable) {
      if (state.kind === "success") expect(Object.keys(state)).toEqual(["kind"]);
    }
  });

  it("only ever attaches a level to listening and speaking", () => {
    for (const state of reachable) {
      const hasLevel = Object.prototype.hasOwnProperty.call(state, "level");
      expect(hasLevel).toBe(state.kind === "listening" || state.kind === "speaking");
    }
  });

  it("only ever attaches a message to warning and error", () => {
    for (const state of reachable) {
      const hasMessage = Object.prototype.hasOwnProperty.call(state, "message");
      expect(hasMessage).toBe(state.kind === "warning" || state.kind === "error");
    }
  });
});

describe("orbCopy", () => {
  it("renders every state without throwing", () => {
    for (const state of allStates) {
      expect(() => orbCopy(state)).not.toThrow();
    }
  });

  it("gives every state a non-empty label", () => {
    for (const state of allStates) {
      expect(orbCopy(state).label.length).toBeGreaterThan(0);
    }
  });

  it("surfaces the data a state carries as its detail", () => {
    expect(orbCopy({ kind: "error", message: "No connection" }).detail).toBe(
      "No connection",
    );
    expect(orbCopy({ kind: "warning", message: "Stale" }).detail).toBe("Stale");
    expect(orbCopy({ kind: "action_proposed", proposal: SAMPLE_PROPOSAL }).detail).toBe(
      SAMPLE_PROPOSAL.humanReadableSummary,
    );
  });

  it("gives states that carry nothing no invented detail", () => {
    for (const kind of ["idle", "success", "transcribing", "offline"] as const) {
      const copy = orbCopy(SAMPLE_STATES[kind]);
      if (kind === "offline") continue; // offline explains itself, carries no data
      expect(copy.detail).toBeNull();
    }
  });

  it("uses the fixed colour semantics", () => {
    expect(orbCopy({ kind: "error", message: "x" }).tone).toBe("danger");
    expect(orbCopy({ kind: "warning", message: "x" }).tone).toBe("warning");
    expect(orbCopy({ kind: "success" }).tone).toBe("positive");
    expect(orbCopy({ kind: "offline" }).tone).toBe("warning");
  });

  it("shows the proposal's own summary for the V3 states — no placeholder left", () => {
    // V3 replaced V1's placeholders with the real approval interface. The
    // detail shown is the proposal's generated summary, not invented text.
    for (const kind of ["action_proposed", "executing"] as const) {
      expect(orbCopy(SAMPLE_STATES[kind]).detail).toBe(
        SAMPLE_PROPOSAL.humanReadableSummary,
      );
    }
  });
});
