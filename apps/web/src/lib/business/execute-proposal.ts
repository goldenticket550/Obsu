import type { TripStatus } from "@/lib/types";
import {
  isExpired,
  preconditionHolds,
  validateAction,
  type Proposal,
  type ProposalAction,
  type ProposalActionKind,
} from "./proposal";

/**
 * V3 — the ONE path from an approved proposal to the database.
 *
 * Every dependency is injected, so the whole safety sequence is testable
 * without a database and the executor itself stays pure control flow. The real
 * wiring supplies RLS-scoped functions and a session-derived org id.
 */

/** The subset of a ride the executor needs to check its preconditions. */
export interface TripSnapshot {
  id: string;
  organizationId: string;
  status: TripStatus;
}

/** What a create actually produced — a ride, and whether its costs landed. */
export interface CreatedTrip {
  tripId: string;
  costsRequested: number;
  costsWritten: boolean;
}

/** The allowlist. There is no dynamic dispatch and no string-to-function. */
export interface ProposalWrites {
  createTrip(
    action: Extract<ProposalAction, { kind: "create_trip" }>,
  ): Promise<CreatedTrip>;
  updateTrip(action: Extract<ProposalAction, { kind: "update_trip" }>): Promise<void>;
  completeTrip(action: Extract<ProposalAction, { kind: "complete_trip" }>): Promise<void>;
  cancelTrip(action: Extract<ProposalAction, { kind: "cancel_trip" }>): Promise<void>;
  recordPayment(action: Extract<ProposalAction, { kind: "record_payment" }>): Promise<void>;
}

export interface ExecutionContext {
  /**
   * The signed-in user, re-read at execution time (step 1). Null when the
   * session has gone.
   */
  userId: string | null;
  /**
   * The org from the SERVER SESSION. Never from the proposal and never from
   * the client. Null when membership no longer resolves (step 2).
   */
  orgId: string | null;
  now: Date;
  /** Org-scoped read of a ride (step 4). Null when it is gone. */
  loadTrip(tripId: string): Promise<TripSnapshot | null>;
  /**
   * Records that this proposal id has begun executing, returning false if it
   * already had (step 7). Must be atomic in the real implementation.
   */
  claimExecution(proposalId: string): boolean;
  writes: ProposalWrites;
  /** Absent means no log at all — every outcome then reports logged: false. */
  log?: ActionLog;
}

export type RefusalReason =
  | "not_approved"
  | "session_lost"
  | "not_authorized"
  | "invalid_payload"
  | "record_missing"
  | "foreign_org"
  | "expired"
  | "state_changed"
  | "already_executed";

/**
 * Outcomes are typed and there is no default-to-success path.
 *
 * V3 dropped "partially applied" because every action then in scope was a
 * single-row write, and a case that cannot happen is a lie in the type.
 * V3.1 reinstates it, because that premise no longer holds: creating a ride
 * now writes the trip AND its linked expense rows (matching the form), and
 * Supabase's client cannot open a multi-statement transaction — so the trip
 * can land while its costs do not. The variant came back with the multi-write
 * action, exactly as V3 said it would.
 */
export type ExecutionOutcome =
  | { kind: "succeeded"; tripId: string; summary: string; logged: boolean }
  | {
      kind: "partially_applied";
      tripId: string;
      summary: string;
      /** What landed and what did not, in the owner's words. */
      message: string;
      logged: boolean;
    }
  | { kind: "refused"; reason: RefusalReason; message: string; logged: boolean }
  | { kind: "failed"; message: string; logged: boolean };

/** An outcome before the log attempt — `logged` is decided by the recorder. */
type PendingOutcome =
  | Omit<Extract<ExecutionOutcome, { kind: "succeeded" }>, "logged">
  | Omit<Extract<ExecutionOutcome, { kind: "partially_applied" }>, "logged">
  | Omit<Extract<ExecutionOutcome, { kind: "refused" }>, "logged">
  | Omit<Extract<ExecutionOutcome, { kind: "failed" }>, "logged">;

function refuse(reason: RefusalReason, message: string): PendingOutcome {
  return { kind: "refused", reason, message };
}

/** One row of the action log — what was approved, and what came of it. */
export interface ActionLogEntry {
  proposalId: string;
  actionKind: ProposalActionKind;
  /** The exact words the owner approved, not a re-description. */
  approvedSummary: string;
  outcome: ExecutionOutcome["kind"];
  /** Set only for refusals, so "why not" is queryable. */
  refusalReason: RefusalReason | null;
  detail: string | null;
  tripId: string | null;
  actorUserId: string;
  organizationId: string;
  occurredAt: string;
}

/**
 * The append-only record. Injected like every other dependency.
 *
 * `isAvailable` gates the write on the table existing, so this code is safe to
 * commit and run before the migration is applied.
 */
export interface ActionLog {
  isAvailable(): Promise<boolean>;
  append(entry: ActionLogEntry): Promise<void>;
}

/**
 * Executes an approved proposal, running the roadmap's safety sequence in
 * order. Any step that does not hold refuses — it never proceeds on a guess,
 * and it never reports a refusal or a failure as success.
 */
export async function executeProposal(
  proposal: Proposal,
  context: ExecutionContext,
): Promise<ExecutionOutcome> {
  const pending = await decideOutcome(proposal, context);
  const logged = await recordOutcome(proposal, context, pending);
  return { ...pending, logged } as ExecutionOutcome;
}

/**
 * Writes the log row, returning whether it landed.
 *
 * A failure to log NEVER changes the outcome. The database write has already
 * happened by this point; reporting failure afterwards would tell the owner
 * something didn't happen when it did, and would invite a retry that creates a
 * second ride. But an unlogged action is not silently swallowed either — the
 * outcome carries `logged: false` so callers can say so out loud. Recorded and
 * tolerated, never hidden.
 *
 * Refusals raised before the session and org are known cannot be attributed to
 * an actor, so they are not written; RLS would reject them anyway. Those report
 * logged: false, which is accurate: there is no row.
 */
async function recordOutcome(
  proposal: Proposal,
  context: ExecutionContext,
  pending: PendingOutcome,
): Promise<boolean> {
  const log = context.log;
  if (!log || !context.userId || !context.orgId) return false;
  try {
    if (!(await log.isAvailable())) return false;
    await log.append({
      proposalId: proposal.proposalId,
      actionKind: proposal.action.kind,
      approvedSummary: proposal.humanReadableSummary,
      outcome: pending.kind,
      refusalReason: pending.kind === "refused" ? pending.reason : null,
      detail: pending.kind === "succeeded" ? null : pending.message,
      tripId:
        pending.kind === "succeeded" || pending.kind === "partially_applied"
          ? pending.tripId
          : null,
      actorUserId: context.userId,
      organizationId: context.orgId,
      occurredAt: context.now.toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}

async function decideOutcome(
  proposal: Proposal,
  context: ExecutionContext,
): Promise<PendingOutcome> {
  // Approval is explicit, per-proposal, and read from THIS proposal. It does
  // not generalize to the next one, does not persist, and cannot be inferred
  // from anything the model produced.
  if (proposal.status !== "approved") {
    return refuse(
      "not_approved",
      "That hasn't been approved, so nothing was done.",
    );
  }

  // 1. Reconfirm session.
  if (!context.userId) {
    return refuse("session_lost", "You're signed out, so nothing was done.");
  }

  // 2. Recheck authorization. In this app the membership lookup that proves
  //    authorization is also what yields the org id, so these are one round
  //    trip — but a missing org is still its own refusal, not a session error.
  const orgId = context.orgId;
  if (!orgId) {
    return refuse(
      "not_authorized",
      "You don't have access to that business, so nothing was done.",
    );
  }

  // 3. Revalidate the payload against the same rules the forms enforce.
  const problems = validateAction(proposal.action);
  const firstProblem = problems[0];
  if (firstProblem) {
    return refuse("invalid_payload", firstProblem.message);
  }

  // 5. Confirm the proposal has not expired. Checked before touching the
  //    database so a stale proposal costs no reads.
  if (isExpired(proposal, context.now)) {
    return refuse(
      "expired",
      "That suggestion timed out. Ask again and I'll re-check the numbers.",
    );
  }

  // 4 + 6. Reload the affected record and confirm the world still matches what
  //        the proposal assumed.
  if (proposal.action.kind !== "create_trip") {
    const trip = await context.loadTrip(proposal.action.tripId);
    if (!trip) {
      return refuse("record_missing", "That ride no longer exists, so nothing was done.");
    }
    // The org id comes from the session; a record belonging to anyone else is
    // refused outright rather than written to.
    if (trip.organizationId !== orgId) {
      return refuse("foreign_org", "That ride isn't yours, so nothing was done.");
    }
    if (!preconditionHolds(proposal.action, trip.status)) {
      return refuse(
        "state_changed",
        `That ride is now ${trip.status}, so nothing was done. Ask again to get a fresh suggestion.`,
      );
    }
  }

  // 7. Prevent duplicate execution. Claimed after the checks so a refused
  //    proposal can be corrected and retried, but before any write so a
  //    double-tap cannot produce two.
  if (!context.claimExecution(proposal.proposalId)) {
    return refuse("already_executed", "That was already done — nothing was repeated.");
  }

  // 8. Execute through the allowlist. Dispatch is an exhaustive switch over a
  //    closed union: there is no path from a string to a function.
  try {
    const action = proposal.action;
    switch (action.kind) {
      case "create_trip": {
        const created = await context.writes.createTrip(action);
        if (!created.costsWritten) {
          // The ride exists but its costs do not. Reporting this as success
          // would leave profit overstated with nothing on screen to say why.
          return {
            kind: "partially_applied",
            tripId: created.tripId,
            summary: proposal.humanReadableSummary,
            message:
              "The ride was saved, but its costs weren't. Add them on the Expenses screen — profit is high until you do.",
          };
        }
        return {
          kind: "succeeded",
          tripId: created.tripId,
          summary: proposal.humanReadableSummary,
        };
      }
      case "update_trip":
        await context.writes.updateTrip(action);
        return { kind: "succeeded", tripId: action.tripId, summary: proposal.humanReadableSummary };
      case "complete_trip":
        await context.writes.completeTrip(action);
        return { kind: "succeeded", tripId: action.tripId, summary: proposal.humanReadableSummary };
      case "cancel_trip":
        await context.writes.cancelTrip(action);
        return { kind: "succeeded", tripId: action.tripId, summary: proposal.humanReadableSummary };
      case "record_payment":
        await context.writes.recordPayment(action);
        return { kind: "succeeded", tripId: action.tripId, summary: proposal.humanReadableSummary };
      default: {
        const exhaustive: never = action;
        return exhaustive;
      }
    }
  } catch (error) {
    // 11. A failure is reported as a failure. There is no branch here that
    //     turns a thrown write into a success message.
    const message =
      error instanceof Error && error.message
        ? error.message
        : "The change didn't go through.";
    return { kind: "failed", message };
  }
}

/**
 * 10 — the words shown for an outcome. Exhaustive, and structurally incapable
 * of describing a refusal or failure as success.
 */
export function outcomeCopy(outcome: ExecutionOutcome): {
  label: string;
  detail: string | null;
  ok: boolean;
} {
  switch (outcome.kind) {
    case "succeeded":
      return { label: "Done", detail: outcome.summary, ok: true };
    case "partially_applied":
      // Not ok. Part of it landed, and the owner has to finish it by hand.
      return { label: "Partly done", detail: outcome.message, ok: false };
    case "refused":
      return { label: "Not done", detail: outcome.message, ok: false };
    case "failed":
      return { label: "Didn't work", detail: outcome.message, ok: false };
    default: {
      const exhaustive: never = outcome;
      return exhaustive;
    }
  }
}
