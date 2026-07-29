import type { Proposal, ProposalAction } from "@/lib/business/proposal";
import { buildProposal } from "@/lib/business/proposal";
import { classifyIntent, intentCopy, type Intent } from "./intent";

/**
 * V2 — the assistant orchestrator.
 *
 * It takes a TRANSCRIPT: a string. It does not own the microphone, does not
 * call the capture modules, and has no way to find out whether those words were
 * spoken or typed. That ignorance is the feature — it makes the whole pipeline
 * (transcript → intent → proposal → approval → executor) exercisable with no
 * audio hardware involved, which is the only reason any of it can be verified
 * on a machine whose microphone does not work.
 *
 * A transcript is UNTRUSTED TEXT, and three rules follow from that:
 *
 *   1. It cannot supply an organization id. There is no org field anywhere in
 *      this module's inputs; the org comes from the server session, at the
 *      executor, exactly as V3 established.
 *   2. It cannot approve anything. This module has no access to the executor —
 *      not a reference, not an injected dependency. The most it can produce is
 *      a Proposal that something else must have a human approve.
 *   3. Words shaped like consent are refused with an explanation, not obeyed.
 */

/** What the assistant produced. The only shapes the interface has to render. */
export type AssistantTurn =
  /** A read-only answer. Nothing changed. */
  | { kind: "answer"; text: string }
  /** A proposed change, awaiting a human. NOTHING has been written. */
  | { kind: "proposal"; proposal: Proposal }
  /** Understood, and deliberately did nothing. Carries the reason. */
  | { kind: "declined"; message: string }
  /** Something broke. Reported as a failure, never dressed as an answer. */
  | { kind: "failed"; message: string };

export interface OrchestratorDeps {
  /** The M7 brain: org-scoped, tool-backed, read-only. */
  ask(question: string): Promise<{ answer?: string; error?: string }>;
  /**
   * Turns free text into ride fields. Returns null when it cannot — a parser
   * that is unsure must not have its guess turned into a proposed write.
   */
  parseRide(text: string): Promise<ProposalAction | null>;
  /** Injected — no ambient clock, and the proposal's TTL depends on it. */
  now: Date;
  /** Injected so a proposal id is deterministic under test. */
  newProposalId(): string;
}

/**
 * Handles one transcript.
 *
 * Note what is absent from the return type: there is no "executed" and no
 * "done". This function cannot cause a write. The strongest thing it can say is
 * "here is a change a person could approve".
 */
export async function handleTranscript(
  transcript: string,
  deps: OrchestratorDeps,
): Promise<AssistantTurn> {
  const intent: Intent = classifyIntent(transcript);

  switch (intent.kind) {
    case "empty":
    case "unclear":
    case "bare_approval": {
      const { message } = intentCopy(intent);
      // Non-null for all three by construction; the fallback keeps the type
      // honest rather than asserting.
      return { kind: "declined", message: message ?? "Nothing to do." };
    }

    case "question": {
      try {
        const result = await deps.ask(transcript);
        if (result.error) return { kind: "failed", message: result.error };
        const text = (result.answer ?? "").trim();
        if (!text) {
          return {
            kind: "failed",
            message: "I couldn't find an answer to that.",
          };
        }
        return { kind: "answer", text };
      } catch (error) {
        return { kind: "failed", message: describe(error) };
      }
    }

    case "log_ride": {
      let action: ProposalAction | null;
      try {
        action = await deps.parseRide(transcript);
      } catch (error) {
        return { kind: "failed", message: describe(error) };
      }
      if (!action) {
        return {
          kind: "declined",
          message:
            "I couldn't pull a ride out of that. Try including who it was for and the amount.",
        };
      }
      // The summary is GENERATED from the action inside buildProposal, so the
      // words shown for approval and the fields that would execute are the same
      // data. See lib/business/proposal.ts.
      return {
        kind: "proposal",
        proposal: buildProposal(deps.newProposalId(), action, deps.now),
      };
    }

    default: {
      const exhaustive: never = intent;
      return exhaustive;
    }
  }
}

function describe(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : "Something went wrong.";
}
