import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  PROPOSAL_ACTION_KINDS,
  buildProposal,
  isExpired,
  preconditionHolds,
  riskLevelFor,
  summarizeProposal,
  validateAction,
  type Proposal,
  type ProposalAction,
} from "./proposal";
import {
  executeProposal,
  outcomeCopy,
  type ActionLog,
  type ActionLogEntry,
  type ExecutionContext,
  type ExecutionOutcome,
  type ProposalWrites,
} from "./execute-proposal";
import { formatUsd } from "@/lib/money";

/**
 * V3 — proposals are approval-gated. Nothing here reads a clock: `now` is
 * always injected.
 */

const NOW = new Date("2026-07-28T23:00:00Z"); // 7 PM EDT Jul 28
const ORG = "org-mine";
const OTHER_ORG = "org-someone-else";

/** One representative action per kind, built from the union. */
const SAMPLE_ACTIONS: Record<ProposalAction["kind"], ProposalAction> = {
  create_trip: {
    kind: "create_trip",
    customerName: "Ashley",
    tripDate: "2026-07-28",
    tripType: "airport",
    status: "scheduled",
    revenueCents: 24000,
    pickup: "Brooklyn",
    dropoff: "JFK",
    paymentMethod: null,
    costs: { gasCents: null, tollsCents: null, otherCents: null, otherLabel: null },
  },
  update_trip: {
    kind: "update_trip",
    tripId: "trip-1",
    expectedStatus: "scheduled",
    changes: { pickup: "Queens" },
  },
  complete_trip: {
    kind: "complete_trip",
    tripId: "trip-1",
    expectedStatus: "scheduled",
    revenueCents: 24000,
  },
  cancel_trip: {
    kind: "cancel_trip",
    tripId: "trip-1",
    expectedStatus: "scheduled",
  },
  record_payment: {
    kind: "record_payment",
    tripId: "trip-1",
    expectedStatus: "completed",
    amountPaidCents: 10000,
  },
};

const allActions = PROPOSAL_ACTION_KINDS.map((k) => SAMPLE_ACTIONS[k]);

function approved(action: ProposalAction): Proposal {
  return { ...buildProposal("prop-1", action, NOW), status: "approved" };
}

/** Fake writes that record what they were given, so we can compare. */
function makeWrites(options: { costsWritten?: boolean } = {}) {
  const seen: { fn: string; action: ProposalAction }[] = [];
  const writes: ProposalWrites = {
    createTrip: vi.fn(async (a) => {
      seen.push({ fn: "createTrip", action: a });
      const requested = [a.costs.gasCents, a.costs.tollsCents, a.costs.otherCents]
        .filter((c) => typeof c === "number" && c > 0).length;
      return {
        tripId: "trip-new",
        costsRequested: requested,
        costsWritten: options.costsWritten ?? true,
      };
    }),
    updateTrip: vi.fn(async (a) => {
      seen.push({ fn: "updateTrip", action: a });
    }),
    completeTrip: vi.fn(async (a) => {
      seen.push({ fn: "completeTrip", action: a });
    }),
    cancelTrip: vi.fn(async (a) => {
      seen.push({ fn: "cancelTrip", action: a });
    }),
    recordPayment: vi.fn(async (a) => {
      seen.push({ fn: "recordPayment", action: a });
    }),
  };
  return { writes, seen };
}

function makeContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  const { writes } = makeWrites();
  const claimed = new Set<string>();
  return {
    userId: "user-1",
    orgId: ORG,
    now: NOW,
    loadTrip: async (id) => ({ id, organizationId: ORG, status: "scheduled" }),
    claimExecution: (id) => (claimed.has(id) ? false : (claimed.add(id), true)),
    writes,
    ...overrides,
  };
}

describe("every action kind round-trips to a summary", () => {
  it("covers the whole union", () => {
    expect(Object.keys(SAMPLE_ACTIONS).sort()).toEqual(
      [...PROPOSAL_ACTION_KINDS].sort(),
    );
  });

  it("produces a non-empty summary for every kind, without throwing", () => {
    for (const action of allActions) {
      expect(() => summarizeProposal(action, NOW)).not.toThrow();
      expect(summarizeProposal(action, NOW).length).toBeGreaterThan(0);
    }
  });

  it("assigns a risk level to every kind", () => {
    for (const action of allActions) {
      expect(["low", "medium", "high"]).toContain(riskLevelFor(action));
    }
  });
});

/**
 * The relationship the whole design rests on: the words approved and the
 * fields executed come from the SAME data.
 */
describe("the summary is derived from the executed fields", () => {
  it("changing a field changes the summary", () => {
    const a = summarizeProposal(SAMPLE_ACTIONS.complete_trip, NOW);
    const b = summarizeProposal(
      { ...SAMPLE_ACTIONS.complete_trip, revenueCents: 99900 } as ProposalAction,
      NOW,
    );
    expect(a).not.toBe(b);
  });

  it("money in the summary uses the existing formatter", () => {
    const summary = summarizeProposal(SAMPLE_ACTIONS.complete_trip, NOW);
    expect(summary).toContain(formatUsd(24000));
    expect(summary).toContain("$240.00");
  });

  it("dates use the F1 business-day formatter", () => {
    // 2026-07-28 is the current business day at 7 PM on the 28th.
    const summary = summarizeProposal(SAMPLE_ACTIONS.create_trip, NOW);
    expect(summary).toContain("Tonight · Tuesday, July 28");
  });

  it("the executor receives exactly the action the summary described", async () => {
    const { writes, seen } = makeWrites();
    const proposal = approved(SAMPLE_ACTIONS.complete_trip);
    const outcome = await executeProposal(proposal, makeContext({ writes }));

    expect(outcome.kind).toBe("succeeded");
    expect(seen).toHaveLength(1);
    // The very object summarized is the object written.
    expect(seen[0]?.action).toBe(proposal.action);
    expect(proposal.humanReadableSummary).toBe(
      summarizeProposal(proposal.action, NOW),
    );
  });

  it("a built proposal's summary always matches its action", () => {
    for (const action of allActions) {
      const proposal = buildProposal("p", action, NOW);
      expect(proposal.humanReadableSummary).toBe(summarizeProposal(action, NOW));
    }
  });
});

describe("no write occurs without an approval", () => {
  it("refuses a pending proposal and writes nothing", async () => {
    const { writes, seen } = makeWrites();
    const pending = buildProposal("prop-1", SAMPLE_ACTIONS.cancel_trip, NOW);
    expect(pending.status).toBe("pending");

    const outcome = await executeProposal(pending, makeContext({ writes }));
    expect(outcome).toEqual({
      kind: "refused",
      reason: "not_approved",
      message: expect.any(String),
      logged: false,
    });
    expect(seen).toEqual([]);
  });

  it("refuses every non-approved status", async () => {
    for (const status of ["pending", "rejected", "executed", "expired"] as const) {
      const { writes, seen } = makeWrites();
      const proposal: Proposal = {
        ...buildProposal("p", SAMPLE_ACTIONS.cancel_trip, NOW),
        status,
      };
      const outcome = await executeProposal(proposal, makeContext({ writes }));
      expect(outcome.kind).toBe("refused");
      expect(seen).toEqual([]);
    }
  });

  it("approval does not generalize to the next proposal", async () => {
    const { writes, seen } = makeWrites();
    const context = makeContext({ writes });

    await executeProposal(approved(SAMPLE_ACTIONS.cancel_trip), context);
    expect(seen).toHaveLength(1);

    // A second, separately-built proposal is still pending and is refused,
    // even though one was just approved in the same session.
    const next = buildProposal("prop-2", SAMPLE_ACTIONS.complete_trip, NOW);
    const outcome = await executeProposal(next, context);
    expect(outcome.kind).toBe("refused");
    expect(seen).toHaveLength(1);
  });
});

describe("org id comes from the session, never the proposal", () => {
  it("refuses a record belonging to another org", async () => {
    const { writes, seen } = makeWrites();
    const context = makeContext({
      writes,
      orgId: ORG,
      // The stored ride belongs to someone else.
      loadTrip: async (id) => ({ id, organizationId: OTHER_ORG, status: "scheduled" }),
    });

    const outcome = await executeProposal(approved(SAMPLE_ACTIONS.cancel_trip), context);
    expect(outcome).toEqual({
      kind: "refused",
      reason: "foreign_org",
      message: expect.any(String),
      logged: false,
    });
    expect(seen).toEqual([]);
  });

  it("a proposal cannot smuggle an org id — the action type has no such field", () => {
    for (const action of allActions) {
      expect(Object.keys(action)).not.toContain("organizationId");
      expect(Object.keys(action)).not.toContain("orgId");
    }
  });

  it("refuses when the session is gone", async () => {
    const { writes, seen } = makeWrites();
    const outcome = await executeProposal(
      approved(SAMPLE_ACTIONS.cancel_trip),
      makeContext({ writes, userId: null }),
    );
    expect(outcome.kind).toBe("refused");
    if (outcome.kind === "refused") expect(outcome.reason).toBe("session_lost");
    expect(seen).toEqual([]);
  });

  it("refuses when membership no longer resolves", async () => {
    const { writes, seen } = makeWrites();
    const outcome = await executeProposal(
      approved(SAMPLE_ACTIONS.cancel_trip),
      makeContext({ writes, orgId: null }),
    );
    expect(outcome.kind).toBe("refused");
    if (outcome.kind === "refused") expect(outcome.reason).toBe("not_authorized");
    expect(seen).toEqual([]);
  });
});

describe("the rest of the safety sequence", () => {
  it("refuses an expired proposal before touching the database", async () => {
    const loadTrip = vi.fn(async () => null);
    const { writes, seen } = makeWrites();
    const proposal = approved(SAMPLE_ACTIONS.cancel_trip);
    const later = new Date(NOW.getTime() + 10 * 60_000);

    const outcome = await executeProposal(
      proposal,
      makeContext({ writes, loadTrip, now: later }),
    );
    expect(outcome.kind).toBe("refused");
    if (outcome.kind === "refused") expect(outcome.reason).toBe("expired");
    expect(loadTrip).not.toHaveBeenCalled();
    expect(seen).toEqual([]);
  });

  it("refuses when the record is gone", async () => {
    const { writes, seen } = makeWrites();
    const outcome = await executeProposal(
      approved(SAMPLE_ACTIONS.cancel_trip),
      makeContext({ writes, loadTrip: async () => null }),
    );
    expect(outcome.kind).toBe("refused");
    if (outcome.kind === "refused") expect(outcome.reason).toBe("record_missing");
    expect(seen).toEqual([]);
  });

  it("refuses when the ride changed under the proposal", async () => {
    const { writes, seen } = makeWrites();
    // Proposed while scheduled; it has since been completed elsewhere.
    const outcome = await executeProposal(
      approved(SAMPLE_ACTIONS.cancel_trip),
      makeContext({
        writes,
        loadTrip: async (id) => ({ id, organizationId: ORG, status: "completed" }),
      }),
    );
    expect(outcome.kind).toBe("refused");
    if (outcome.kind === "refused") expect(outcome.reason).toBe("state_changed");
    expect(seen).toEqual([]);
  });

  it("refuses an invalid payload", async () => {
    const { writes, seen } = makeWrites();
    const bad: ProposalAction = {
      kind: "complete_trip",
      tripId: "trip-1",
      expectedStatus: "scheduled",
      revenueCents: -1,
    };
    const outcome = await executeProposal(approved(bad), makeContext({ writes }));
    expect(outcome.kind).toBe("refused");
    if (outcome.kind === "refused") expect(outcome.reason).toBe("invalid_payload");
    expect(seen).toEqual([]);
  });

  it("executes once, then refuses a repeat — a double tap writes one row", async () => {
    const { writes, seen } = makeWrites();
    const context = makeContext({ writes });
    const proposal = approved(SAMPLE_ACTIONS.cancel_trip);

    const first = await executeProposal(proposal, context);
    const second = await executeProposal(proposal, context);

    expect(first.kind).toBe("succeeded");
    expect(second.kind).toBe("refused");
    if (second.kind === "refused") expect(second.reason).toBe("already_executed");
    expect(seen).toHaveLength(1);
  });

  it("reports a write failure as a failure, never as success", async () => {
    const { writes } = makeWrites();
    writes.cancelTrip = vi.fn(async () => {
      throw new Error("database unreachable");
    });
    const outcome = await executeProposal(
      approved(SAMPLE_ACTIONS.cancel_trip),
      makeContext({ writes }),
    );
    expect(outcome.kind).toBe("failed");
    expect(outcomeCopy(outcome).ok).toBe(false);
  });

  it("no refusal or failure is ever described as success", () => {
    const outcomes: ExecutionOutcome[] = [
      { kind: "succeeded", tripId: "t", summary: "did it", logged: true },
      {
        kind: "partially_applied",
        tripId: "t",
        summary: "did it",
        message: "half of it",
        logged: true,
      },
      { kind: "refused", reason: "expired", message: "timed out", logged: true },
      { kind: "failed", message: "boom", logged: true },
    ];
    for (const outcome of outcomes) {
      expect(outcomeCopy(outcome).ok).toBe(outcome.kind === "succeeded");
    }
  });

  it("dispatches each kind to its own allowlisted write", async () => {
    for (const action of allActions) {
      const { writes, seen } = makeWrites();
      const status = action.kind === "record_payment" ? "completed" : "scheduled";
      const outcome = await executeProposal(
        approved(action),
        makeContext({
          writes,
          loadTrip: async (id) => ({ id, organizationId: ORG, status }),
        }),
      );
      expect(outcome.kind).toBe("succeeded");
      expect(seen).toHaveLength(1);
    }
  });
});

describe("validation and preconditions", () => {
  it("accepts every well-formed sample", () => {
    for (const action of allActions) expect(validateAction(action)).toEqual([]);
  });

  it("requires an amount to log a completed ride", () => {
    const problems = validateAction({
      ...SAMPLE_ACTIONS.create_trip,
      status: "completed",
      revenueCents: null,
    } as ProposalAction);
    expect(problems.map((p) => p.field)).toContain("revenueCents");
  });

  it("rejects an empty update", () => {
    const problems = validateAction({
      kind: "update_trip",
      tripId: "t",
      expectedStatus: "scheduled",
      changes: {},
    });
    expect(problems.map((p) => p.field)).toContain("changes");
  });

  it("holds only when the status still matches", () => {
    expect(preconditionHolds(SAMPLE_ACTIONS.cancel_trip, "scheduled")).toBe(true);
    expect(preconditionHolds(SAMPLE_ACTIONS.cancel_trip, "completed")).toBe(false);
    // Creating touches no existing record, so there is nothing to disagree with.
    expect(preconditionHolds(SAMPLE_ACTIONS.create_trip, "canceled")).toBe(true);
  });

  it("expires exactly at its deadline", () => {
    const p = buildProposal("p", SAMPLE_ACTIONS.cancel_trip, NOW);
    expect(isExpired(p, NOW)).toBe(false);
    expect(isExpired(p, new Date(NOW.getTime() + 4 * 60_000))).toBe(false);
    expect(isExpired(p, new Date(NOW.getTime() + 5 * 60_000))).toBe(true);
  });
});

/**
 * Out-of-scope actions are UNREPRESENTABLE, not rejected at runtime. The type
 * check is the first assertion; the source walk catches anything that tried to
 * sneak in through a different door.
 */
describe("out-of-scope actions cannot be expressed", () => {
  it("the action union contains only the five in scope", () => {
    expect([...PROPOSAL_ACTION_KINDS].sort()).toEqual([
      "cancel_trip",
      "complete_trip",
      "create_trip",
      "record_payment",
      "update_trip",
    ]);
  });

  it("rejects forbidden kinds at the type level", () => {
    // @ts-expect-error deleting a ride is not a representable action
    const del: ProposalAction = { kind: "delete_trip", tripId: "t" };
    // @ts-expect-error sending a message is not a representable action
    const sms: ProposalAction = { kind: "send_sms", to: "+1", body: "hi" };
    // @ts-expect-error changing membership is not a representable action
    const auth: ProposalAction = { kind: "add_member", userId: "u" };
    // @ts-expect-error a free-text command is exactly what the model forbids
    const raw: ProposalAction = { kind: "run", command: "drop table trips" };
    expect([del, sms, auth, raw]).toHaveLength(4);
  });

  it("the executor's allowlist has no write outside the five", () => {
    const context = makeContext();
    expect(Object.keys(context.writes).sort()).toEqual([
      "cancelTrip",
      "completeTrip",
      "createTrip",
      "recordPayment",
      "updateTrip",
    ]);
  });

  it("no proposal source mentions a forbidden operation", () => {
    const forbidden = [
      "delete_trip",
      "send_sms",
      "send_email",
      "issue_refund",
      "add_member",
      "export_",
    ];
    for (const file of ["proposal.ts", "execute-proposal.ts"]) {
      const text = readFileSync(join(process.cwd(), "src", "lib", "business", file), "utf8");
      const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      for (const term of forbidden) expect(code).not.toContain(term);
    }
  });
});

/**
 * V3.1 — the create_trip divergence. The form writes a ride PLUS its linked
 * cost rows; the executor used to write only the ride, silently dropping the
 * costs and overstating profit. Both now go through one function.
 */
describe("one definition of creating a trip", () => {
  const repoSrc = join(process.cwd(), "src");

  it("the ride form does not insert trips itself — it calls the shared function", () => {
    const text = readFileSync(join(repoSrc, "app", "trips", "actions.ts"), "utf8");
    expect(text).toContain("createTripWithCosts");
    // No second, parallel definition of what a created trip looks like. The
    // form's server actions now contain no row insert of their own at all.
    expect(text).not.toContain(".insert(");
  });

  it("the executor's production writes call the same shared function", () => {
    const text = readFileSync(join(repoSrc, "lib", "db", "proposal-writes.ts"), "utf8");
    expect(text).toContain("createTripWithCosts");
  });

  it("a proposed ride can carry costs at all — the action has the fields", () => {
    const action = SAMPLE_ACTIONS.create_trip;
    if (action.kind !== "create_trip") throw new Error("wrong sample");
    expect(Object.keys(action.costs).sort()).toEqual([
      "gasCents",
      "otherCents",
      "otherLabel",
      "tollsCents",
    ]);
  });

  it("costs the owner approves are named in the words they approve", () => {
    const withCosts: ProposalAction = {
      ...SAMPLE_ACTIONS.create_trip,
      kind: "create_trip",
      costs: { gasCents: 1800, tollsCents: 1200, otherCents: null, otherLabel: null },
    } as ProposalAction;
    const summary = summarizeProposal(withCosts, NOW);
    expect(summary).toContain("$18.00 gas");
    expect(summary).toContain("$12.00 tolls");

    // And a ride with no costs does not invent a mention of them.
    expect(summarizeProposal(SAMPLE_ACTIONS.create_trip, NOW)).not.toContain("gas");
  });

  it("a ride whose costs did not land is reported partly done, not done", async () => {
    const { writes } = makeWrites({ costsWritten: false });
    const action: ProposalAction = {
      ...SAMPLE_ACTIONS.create_trip,
      kind: "create_trip",
      costs: { gasCents: 1800, tollsCents: null, otherCents: null, otherLabel: null },
    } as ProposalAction;

    const outcome = await executeProposal(approved(action), makeContext({ writes }));
    expect(outcome.kind).toBe("partially_applied");
    // Not describable as success — profit is overstated until it is fixed.
    expect(outcomeCopy(outcome).ok).toBe(false);
    expect(outcomeCopy(outcome).detail).toMatch(/costs/i);
  });

  it("a ride whose costs did land is a plain success", async () => {
    const { writes } = makeWrites();
    const action: ProposalAction = {
      ...SAMPLE_ACTIONS.create_trip,
      kind: "create_trip",
      costs: { gasCents: 1800, tollsCents: null, otherCents: null, otherLabel: null },
    } as ProposalAction;

    const outcome = await executeProposal(approved(action), makeContext({ writes }));
    expect(outcome.kind).toBe("succeeded");
  });
});

/** V3.1 — every approved proposal that reaches the executor leaves a record. */
describe("the action log", () => {
  function makeLog(options: { available?: boolean; throws?: boolean } = {}) {
    const rows: ActionLogEntry[] = [];
    const log: ActionLog = {
      isAvailable: async () => options.available ?? true,
      append: async (entry) => {
        if (options.throws) throw new Error("log table unreachable");
        rows.push(entry);
      },
    };
    return { log, rows };
  }

  it("records a success, with the exact words that were approved", async () => {
    const { log, rows } = makeLog();
    const proposal = approved(SAMPLE_ACTIONS.complete_trip);
    const outcome = await executeProposal(proposal, makeContext({ log }));

    expect(outcome.kind).toBe("succeeded");
    expect(outcome.logged).toBe(true);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      proposalId: "prop-1",
      actionKind: "complete_trip",
      approvedSummary: proposal.humanReadableSummary,
      outcome: "succeeded",
      refusalReason: null,
      actorUserId: "user-1",
      organizationId: ORG,
    });
  });

  it("records a refusal — a refusal is a row, not an absence", async () => {
    const { log, rows } = makeLog();
    const outcome = await executeProposal(
      approved(SAMPLE_ACTIONS.cancel_trip),
      makeContext({
        log,
        loadTrip: async (id) => ({ id, organizationId: ORG, status: "completed" }),
      }),
    );

    expect(outcome.kind).toBe("refused");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.outcome).toBe("refused");
    expect(rows[0]?.refusalReason).toBe("state_changed");
  });

  it("records a failure", async () => {
    const { log, rows } = makeLog();
    const { writes } = makeWrites();
    writes.cancelTrip = vi.fn(async () => {
      throw new Error("database unreachable");
    });
    const outcome = await executeProposal(
      approved(SAMPLE_ACTIONS.cancel_trip),
      makeContext({ log, writes }),
    );

    expect(outcome.kind).toBe("failed");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.outcome).toBe("failed");
    expect(rows[0]?.detail).toContain("database unreachable");
  });

  it("records every outcome kind the executor can produce", async () => {
    const seen = new Set<string>();

    // succeeded
    {
      const { log, rows } = makeLog();
      await executeProposal(approved(SAMPLE_ACTIONS.cancel_trip), makeContext({ log }));
      rows.forEach((r) => seen.add(r.outcome));
    }
    // partially_applied
    {
      const { log, rows } = makeLog();
      const { writes } = makeWrites({ costsWritten: false });
      const action: ProposalAction = {
        ...SAMPLE_ACTIONS.create_trip,
        kind: "create_trip",
        costs: { gasCents: 500, tollsCents: null, otherCents: null, otherLabel: null },
      } as ProposalAction;
      await executeProposal(approved(action), makeContext({ log, writes }));
      rows.forEach((r) => seen.add(r.outcome));
    }
    // refused
    {
      const { log, rows } = makeLog();
      await executeProposal(
        approved(SAMPLE_ACTIONS.cancel_trip),
        makeContext({ log, loadTrip: async () => null }),
      );
      rows.forEach((r) => seen.add(r.outcome));
    }
    // failed
    {
      const { log, rows } = makeLog();
      const { writes } = makeWrites();
      writes.cancelTrip = vi.fn(async () => {
        throw new Error("boom");
      });
      await executeProposal(approved(SAMPLE_ACTIONS.cancel_trip), makeContext({ log, writes }));
      rows.forEach((r) => seen.add(r.outcome));
    }

    expect([...seen].sort()).toEqual([
      "failed",
      "partially_applied",
      "refused",
      "succeeded",
    ]);
  });

  /**
   * "Double execution produces one row, not two" — one row per ATTEMPT, and
   * exactly one of them succeeded. The second attempt's refusal is itself worth
   * knowing about, so it is written rather than dropped.
   */
  it("a double tap writes one ride, and leaves one success plus one refusal", async () => {
    const { log, rows } = makeLog();
    const { writes, seen } = makeWrites();
    const context = makeContext({ log, writes });
    const proposal = approved(SAMPLE_ACTIONS.cancel_trip);

    await executeProposal(proposal, context);
    await executeProposal(proposal, context);

    expect(seen).toHaveLength(1); // one write to the database
    expect(rows.map((r) => r.outcome)).toEqual(["succeeded", "refused"]);
    expect(rows[1]?.refusalReason).toBe("already_executed");
  });

  it("writes nothing when the table isn't there yet, and says so", async () => {
    const { log, rows } = makeLog({ available: false });
    const { writes, seen } = makeWrites();
    const outcome = await executeProposal(
      approved(SAMPLE_ACTIONS.cancel_trip),
      makeContext({ log, writes }),
    );

    // The action still happened. Only the record did not.
    expect(outcome.kind).toBe("succeeded");
    expect(outcome.logged).toBe(false);
    expect(seen).toHaveLength(1);
    expect(rows).toEqual([]);
  });

  it("a failed log write does not undo or re-describe the action", async () => {
    const { log } = makeLog({ throws: true });
    const { writes, seen } = makeWrites();
    const outcome = await executeProposal(
      approved(SAMPLE_ACTIONS.cancel_trip),
      makeContext({ log, writes }),
    );

    // Reporting failure here would tell the owner nothing happened when the
    // ride was already canceled — and invite a retry.
    expect(outcome.kind).toBe("succeeded");
    expect(outcome.logged).toBe(false);
    expect(seen).toHaveLength(1);
  });

  it("an unattributable refusal is not logged, and does not claim to be", async () => {
    const { log, rows } = makeLog();
    const outcome = await executeProposal(
      approved(SAMPLE_ACTIONS.cancel_trip),
      makeContext({ log, userId: null }),
    );
    expect(outcome.kind).toBe("refused");
    expect(outcome.logged).toBe(false);
    expect(rows).toEqual([]);
  });

  it("the log never carries an org id from the proposal", async () => {
    const { log, rows } = makeLog();
    await executeProposal(
      approved(SAMPLE_ACTIONS.cancel_trip),
      makeContext({ log, orgId: "org-from-session" }),
    );
    expect(rows[0]?.organizationId).toBe("org-from-session");
    for (const action of allActions) {
      expect(Object.keys(action)).not.toContain("organizationId");
    }
  });

  it("the migration makes the table append-only, not merely conventionally so", () => {
    const sql = readFileSync(
      join(process.cwd(), "..", "..", "supabase", "migrations", "0005_action_log.sql"),
      "utf8",
    );
    const code = sql.replace(/^\s*--[^\n]*$/gm, "");
    expect(code).toContain("for select");
    expect(code).toContain("for insert");
    // No policy grants a rewrite, and the grants and trigger back that up.
    expect(code).not.toContain("for update");
    expect(code).not.toContain("for delete");
    expect(code).toContain("revoke update, delete");
    expect(code).toContain("before update or delete");
  });
});

/** V1's placeholder strings must not survive anywhere. */
describe("the V1 orb placeholders are gone", () => {
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      return entry.isFile() && /\.tsx?$/.test(entry.name) ? [full] : [];
    });
  }

  it("no source file contains the placeholder copy", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(join(process.cwd(), "src"))) {
      if (/proposal\.test\.tsx?$/.test(file)) continue; // this file names them
      const text = readFileSync(file, "utf8");
      if (
        text.includes("Placeholder — interface arrives in V3") ||
        text.includes("interface arrives in V3")
      ) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });
});
