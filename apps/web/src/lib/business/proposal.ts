import type { PaymentMethod, TripStatus, TripType } from "@/lib/types";
import { formatUsd } from "@/lib/money";
import { businessDayLabelParts, joinBusinessDayLabel } from "./schedule";

/**
 * V3 — the proposal model. PURE.
 *
 * OBSIDIAN may PROPOSE an action; the owner approves it; nothing executes on
 * the assistant's own authority.
 *
 * The action is a discriminated union carrying TYPED ARGUMENTS — never a
 * free-text command and never a serialized blob the executor re-parses. That
 * is the load-bearing decision: if the model cannot represent an action, that
 * action cannot be proposed. Refunds, deletes, auth/membership changes and
 * message sending are absent by construction, not blocked at runtime.
 */

/** Scope of this pass. Anything not here is unrepresentable. */
export type ProposalAction =
  | {
      kind: "create_trip";
      customerName: string | null;
      tripDate: string;
      tripType: TripType;
      status: Extract<TripStatus, "scheduled" | "completed">;
      /** Required when status is completed; null only for a booking. */
      revenueCents: number | null;
      pickup: string | null;
      dropoff: string | null;
      paymentMethod: PaymentMethod | null;
      /**
       * V3.1: costs captured with the ride, written as linked expense rows —
       * the same thing the form writes. Without these a proposed ride would
       * drop its gas and tolls and OVERSTATE profit by exactly that amount,
       * silently, against a summary that never mentioned them.
       */
      costs: {
        gasCents: number | null;
        tollsCents: number | null;
        otherCents: number | null;
        otherLabel: string | null;
      };
    }
  | {
      kind: "update_trip";
      tripId: string;
      /** What the proposal believed when it was built (safety step 6). */
      expectedStatus: TripStatus;
      /**
       * Non-financial fields only. Fare edits are deliberately absent: the
       * roadmap keeps "price changes" gated, and this pass was not authorized
       * to open them. Completing a ride still sets its final revenue through
       * the existing S1 rule, which is a defined business rule rather than an
       * arbitrary re-price.
       */
      changes: {
        pickup?: string | null;
        dropoff?: string | null;
        tripType?: TripType;
        passengerCount?: number | null;
        notes?: string | null;
      };
    }
  | {
      kind: "complete_trip";
      tripId: string;
      expectedStatus: Extract<TripStatus, "scheduled">;
      /** S1: closing out always requires the final amount. */
      revenueCents: number;
    }
  | {
      kind: "cancel_trip";
      tripId: string;
      expectedStatus: Extract<TripStatus, "scheduled">;
    }
  | {
      kind: "record_payment";
      tripId: string;
      expectedStatus: TripStatus;
      /** Cents received. 0 is a real statement ("nothing yet"), not "untracked". */
      amountPaidCents: number;
    };

export type ProposalActionKind = ProposalAction["kind"];

export const PROPOSAL_ACTION_KINDS: ProposalActionKind[] = [
  "create_trip",
  "update_trip",
  "complete_trip",
  "cancel_trip",
  "record_payment",
];

export type RiskLevel = "low" | "medium" | "high";
export type ProposalStatus = "pending" | "approved" | "rejected" | "executed" | "expired";

/** A record this proposal will touch, for the reload/precondition steps. */
export interface AffectedRecord {
  table: "trips";
  id: string;
}

/**
 * The roadmap's model, with one deliberate change: `actionType` and
 * `structuredPayload` are fused into the typed `action` union rather than
 * kept as a string plus an opaque blob. A blob would have to be re-parsed by
 * the executor, which is exactly the seam where a proposal and its execution
 * drift apart.
 */
export interface Proposal {
  proposalId: string;
  action: ProposalAction;
  /** Derived from `action` — never authored separately. See buildProposal. */
  humanReadableSummary: string;
  affectedRecords: AffectedRecord[];
  riskLevel: RiskLevel;
  createdAt: string;
  expiresAt: string;
  status: ProposalStatus;
  requiresConfirmation: boolean;
}

/** How long a proposal stays actionable. */
export const PROPOSAL_TTL_MS = 5 * 60_000;

function money(cents: number): string {
  return formatUsd(cents);
}

/** Business-day wording for a date-only key, via the F1 formatter. */
function day(dateKey: string, now: Date): string {
  return joinBusinessDayLabel(businessDayLabelParts(dateKey, now));
}

/**
 * The summary the owner reads, DERIVED from the same typed fields the executor
 * will use. There is no parallel description to drift.
 *
 * Exhaustive with a never-check: a new action kind fails to compile until its
 * wording exists.
 */
export function summarizeProposal(action: ProposalAction, now: Date): string {
  switch (action.kind) {
    case "create_trip": {
      const who = action.customerName ?? "no customer";
      const when = day(action.tripDate, now);
      const route =
        action.pickup && action.dropoff
          ? `, ${action.pickup} to ${action.dropoff}`
          : "";
      const fare =
        action.revenueCents !== null ? ` for ${money(action.revenueCents)}` : "";
      const verb = action.status === "scheduled" ? "Schedule" : "Log";

      // Costs are named in the summary, because they are written with the ride
      // and they change profit. Approving must never hide a cost.
      const costParts: string[] = [];
      if (action.costs.gasCents) costParts.push(`${money(action.costs.gasCents)} gas`);
      if (action.costs.tollsCents) costParts.push(`${money(action.costs.tollsCents)} tolls`);
      if (action.costs.otherCents) {
        costParts.push(
          `${money(action.costs.otherCents)} ${action.costs.otherLabel ?? "other"}`,
        );
      }
      const costs =
        costParts.length > 0 ? ` Also record ${costParts.join(", ")}.` : "";

      return `${verb} a ${action.tripType} ride for ${who} on ${when}${route}${fare}.${costs}`;
    }
    case "update_trip": {
      const parts: string[] = [];
      if (action.changes.pickup !== undefined) {
        parts.push(`pickup to ${action.changes.pickup ?? "not set"}`);
      }
      if (action.changes.dropoff !== undefined) {
        parts.push(`destination to ${action.changes.dropoff ?? "not set"}`);
      }
      if (action.changes.tripType !== undefined) {
        parts.push(`type to ${action.changes.tripType}`);
      }
      if (action.changes.passengerCount !== undefined) {
        parts.push(
          `passengers to ${action.changes.passengerCount ?? "not recorded"}`,
        );
      }
      if (action.changes.notes !== undefined) {
        parts.push(action.changes.notes ? "the notes" : "clear the notes");
      }
      const what = parts.length > 0 ? parts.join(", ") : "nothing";
      return `Update this ride: change ${what}.`;
    }
    case "complete_trip":
      return `Mark this ride completed for ${money(action.revenueCents)}. It starts counting toward your totals.`;
    case "cancel_trip":
      return "Cancel this ride. It stays on record as canceled and counts toward nothing.";
    case "record_payment":
      return `Record ${money(action.amountPaidCents)} received for this ride. This does not change the fare.`;
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

/** Which records an action touches — the input to the reload step. */
export function affectedRecordsFor(action: ProposalAction): AffectedRecord[] {
  return action.kind === "create_trip"
    ? []
    : [{ table: "trips", id: action.tripId }];
}

/**
 * Risk is a property of the action, not a free field. Money-moving and
 * status-changing actions are not "low" just because they are small.
 */
export function riskLevelFor(action: ProposalAction): RiskLevel {
  switch (action.kind) {
    case "update_trip":
      return "low";
    case "create_trip":
      return "medium";
    case "complete_trip":
    case "record_payment":
    case "cancel_trip":
      // Each either moves money into the totals or takes a ride out of them.
      return "high";
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

/**
 * Builds a proposal. The summary is generated HERE from the action, so the
 * text the owner approves and the fields the executor uses are the same data.
 */
export function buildProposal(
  proposalId: string,
  action: ProposalAction,
  now: Date,
  ttlMs: number = PROPOSAL_TTL_MS,
): Proposal {
  return {
    proposalId,
    action,
    humanReadableSummary: summarizeProposal(action, now),
    affectedRecords: affectedRecordsFor(action),
    riskLevel: riskLevelFor(action),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    status: "pending",
    // Everything in scope touches real records; nothing here is a read.
    requiresConfirmation: true,
  };
}

export function isExpired(proposal: Proposal, now: Date): boolean {
  const expiry = new Date(proposal.expiresAt).getTime();
  if (!Number.isFinite(expiry)) return true;
  return now.getTime() >= expiry;
}

export interface PayloadProblem {
  field: string;
  message: string;
}

/**
 * Safety step 3 — revalidate the payload at execution time.
 *
 * The union already makes whole classes impossible, but numeric ranges and
 * cross-field rules are not expressible in the type system, so they are
 * checked here against the same rules the forms enforce.
 */
export function validateAction(action: ProposalAction): PayloadProblem[] {
  const problems: PayloadProblem[] = [];
  const badMoney = (cents: number): boolean =>
    !Number.isInteger(cents) || cents < 0;

  switch (action.kind) {
    case "create_trip":
      if (!/^\d{4}-\d{2}-\d{2}$/.test(action.tripDate)) {
        problems.push({ field: "tripDate", message: "Trip date is not a valid date." });
      }
      if (action.status === "completed") {
        if (action.revenueCents === null) {
          problems.push({ field: "revenueCents", message: "A completed ride needs its amount." });
        } else if (badMoney(action.revenueCents)) {
          problems.push({ field: "revenueCents", message: "Amount must be a whole number of cents, zero or more." });
        }
      } else if (action.revenueCents !== null && badMoney(action.revenueCents)) {
        problems.push({ field: "revenueCents", message: "Amount must be a whole number of cents, zero or more." });
      }
      break;

    case "update_trip":
      if (!action.tripId) problems.push({ field: "tripId", message: "Missing ride." });
      if (Object.keys(action.changes).length === 0) {
        problems.push({ field: "changes", message: "Nothing would change." });
      }
      if (
        action.changes.passengerCount !== undefined &&
        action.changes.passengerCount !== null &&
        (!Number.isInteger(action.changes.passengerCount) ||
          action.changes.passengerCount <= 0)
      ) {
        problems.push({ field: "passengerCount", message: "Passengers must be a whole number above zero." });
      }
      break;

    case "complete_trip":
      if (!action.tripId) problems.push({ field: "tripId", message: "Missing ride." });
      if (badMoney(action.revenueCents)) {
        problems.push({ field: "revenueCents", message: "Amount must be a whole number of cents, zero or more." });
      }
      break;

    case "cancel_trip":
      if (!action.tripId) problems.push({ field: "tripId", message: "Missing ride." });
      break;

    case "record_payment":
      if (!action.tripId) problems.push({ field: "tripId", message: "Missing ride." });
      if (badMoney(action.amountPaidCents)) {
        problems.push({ field: "amountPaidCents", message: "Amount must be a whole number of cents, zero or more." });
      }
      break;

    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
  return problems;
}

/**
 * Safety step 6 — has the world changed incompatibly since the proposal was
 * built? Compares the reloaded row's status against what the proposal assumed.
 */
export function preconditionHolds(
  action: ProposalAction,
  currentStatus: TripStatus,
): boolean {
  return action.kind === "create_trip"
    ? true
    : action.expectedStatus === currentStatus;
}
