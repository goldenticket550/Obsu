"use server";

import { randomUUID } from "node:crypto";
import { askObsidian } from "@/lib/ai/ask";
import { parseTripFromText } from "@/lib/ai/parse-trip";
import { enumOrNull, errorMessage } from "@/lib/form";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { getCurrentOrgId } from "@/lib/db/org";
import { createActionLog } from "@/lib/db/action-log";
import { createProposalWrites } from "@/lib/db/proposal-writes";
import { dollarsToCents } from "@/lib/money";
import { TRIP_TYPES, PAYMENT_METHODS } from "@/lib/enums";
import { businessDayKey } from "@/lib/business/schedule";
import {
  executeProposal,
  outcomeCopy,
  type ExecutionOutcome,
  type TripSnapshot,
} from "@/lib/business/execute-proposal";
import type { Proposal, ProposalAction } from "@/lib/business/proposal";
import { handleTranscript, type AssistantTurn } from "@/lib/voice/orchestrator";
import { rememberProposal, takeProposal } from "@/lib/voice/proposal-store";

/**
 * V2 — the server side of the assistant. THE ONLY entry point from any client,
 * spoken or typed.
 *
 * The provider keys, the model call, the transcription route and the executor
 * all live behind this line. The browser sends a string and receives a typed
 * turn; it never receives a key, a signed provider URL, or a way to make an
 * arbitrary provider call.
 */

/** Proposal ids executed once already. Mirrors the store's one-shot rule. */
const claimed = new Set<string>();

async function session(): Promise<
  { userId: string; orgId: string } | { error: string }
> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  try {
    const orgId = await getCurrentOrgId();
    if (!orgId) return { error: "No business is linked to this account." };
    return { userId: user.id, orgId };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}

/**
 * Turns a parsed ride into a typed create_trip action, or null.
 *
 * Returns null rather than guessing when the parse produced nothing usable.
 * A proposal built from an empty parse would show the owner a ride with no
 * customer and no amount and ask them to approve it.
 */
function toCreateAction(
  parsed: Awaited<ReturnType<typeof parseTripFromText>>,
  now: Date,
): ProposalAction | null {
  const hasAnything =
    parsed.customerName || parsed.revenueDollars !== null || parsed.pickup;
  if (!hasAnything) return null;

  const tripType = enumOrNull(parsed.tripType ?? "", TRIP_TYPES);
  if (!tripType) return null; // U5: trip type is required.

  return {
    kind: "create_trip",
    customerName: parsed.customerName,
    tripDate: parsed.tripDate ?? businessDayKey(now),
    tripType,
    // Spoken entry logs a completed ride only when an amount came with it;
    // otherwise it is a booking, which S1 allows to have no price yet.
    status: parsed.revenueDollars !== null ? "completed" : "scheduled",
    revenueCents:
      parsed.revenueDollars !== null ? dollarsToCents(parsed.revenueDollars) : null,
    pickup: parsed.pickup,
    dropoff: parsed.dropoff,
    paymentMethod: enumOrNull(parsed.paymentMethod ?? "", PAYMENT_METHODS),
    costs: {
      gasCents: parsed.gasDollars !== null ? dollarsToCents(parsed.gasDollars) : null,
      tollsCents:
        parsed.tollsDollars !== null ? dollarsToCents(parsed.tollsDollars) : null,
      otherCents:
        parsed.otherDollars !== null ? dollarsToCents(parsed.otherDollars) : null,
      otherLabel: parsed.otherLabel,
    },
  };
}

/** What crosses back to the browser. A Proposal is plain data and safe to send. */
export type AssistantTurnWire =
  | { kind: "answer"; text: string }
  | { kind: "proposal"; proposal: Proposal }
  | { kind: "declined"; message: string }
  | { kind: "failed"; message: string };

/**
 * Handles one transcript, from ANY source.
 *
 * The spoken path and the typed box call this identical function with the
 * identical argument. Nothing here can tell them apart, which is why the whole
 * pipeline is exercisable without a microphone.
 */
export async function submitTranscript(
  transcript: string,
): Promise<AssistantTurnWire> {
  const who = await session();
  if ("error" in who) return { kind: "failed", message: who.error };

  const now = new Date();
  const turn: AssistantTurn = await handleTranscript(transcript, {
    ask: async (question) => {
      try {
        return { answer: await askObsidian(question) };
      } catch (e) {
        return { error: errorMessage(e) };
      }
    },
    parseRide: async (text) => toCreateAction(await parseTripFromText(text), now),
    now,
    newProposalId: () => randomUUID(),
  });

  // A proposal is held SERVER-SIDE and the browser is given only its id. The
  // action it would execute never travels through the client, so a modified
  // client cannot approve one thing and submit another.
  if (turn.kind === "proposal") {
    rememberProposal(turn.proposal, { userId: who.userId, organizationId: who.orgId }, now);
  }
  return turn;
}

export interface ApprovalResultWire {
  label: string;
  detail: string | null;
  ok: boolean;
  /** Disclosed rather than hidden — see V3.1's action log. */
  logged: boolean;
}

/**
 * Executes a proposal the user APPROVED by touching a control.
 *
 * This is a separate action reached only from a button. No transcript can call
 * it: `submitTranscript` has no reference to it, and the orchestrator has no
 * reference to the executor at all. Words shaped like "yes, do it" are refused
 * upstream by the intent classifier and never arrive here.
 *
 * The only thing the client supplies is an id. Everything executed is looked up
 * server-side from the proposal that was actually shown.
 */
export async function approveProposal(
  proposalId: string,
): Promise<ApprovalResultWire> {
  const who = await session();
  if ("error" in who) {
    return { label: "Not done", detail: who.error, ok: false, logged: false };
  }

  const now = new Date();
  const proposal = takeProposal(
    String(proposalId ?? ""),
    { userId: who.userId, organizationId: who.orgId },
    now,
  );
  if (!proposal) {
    return {
      label: "Not done",
      detail: "That suggestion has expired or was already handled. Ask again.",
      ok: false,
      logged: false,
    };
  }

  const supabase = createSupabaseServerClient();
  const outcome: ExecutionOutcome = await executeProposal(
    // Approval is recorded HERE, on the server, from the act of calling this
    // action — never carried in from the client and never inferred from text.
    { ...proposal, status: "approved" },
    {
      userId: who.userId,
      orgId: who.orgId,
      now,
      loadTrip: async (tripId): Promise<TripSnapshot | null> => {
        const { data } = await supabase
          .from("trips")
          .select("id, organization_id, status")
          .eq("id", tripId)
          .maybeSingle();
        if (!data) return null;
        const row = data as { id: string; organization_id: string; status: string };
        return {
          id: row.id,
          organizationId: row.organization_id,
          status: row.status as TripSnapshot["status"],
        };
      },
      claimExecution: (id) => {
        if (claimed.has(id)) return false;
        claimed.add(id);
        return true;
      },
      writes: createProposalWrites(who.orgId),
      log: createActionLog(),
    },
  );

  const copy = outcomeCopy(outcome);
  return { ...copy, logged: outcome.logged };
}

/** Discards a proposal outright. It is not parked for later. */
export async function rejectProposal(proposalId: string): Promise<{ ok: true }> {
  const who = await session();
  if (!("error" in who)) {
    takeProposal(String(proposalId ?? ""), { userId: who.userId, organizationId: who.orgId }, new Date());
  }
  return { ok: true };
}
