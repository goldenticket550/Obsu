import { createSupabaseServerClient } from "./supabase-server";
import type { ActionLog, ActionLogEntry } from "@/lib/business/execute-proposal";

/**
 * V3.1 — the Supabase-backed action log.
 *
 * The write is gated on the table existing, so this file is safe to run before
 * migration 0005_action_log.sql is applied: `isAvailable()` returns false, the
 * executor reports `logged: false`, and nothing throws.
 *
 * Reads are RLS-scoped like everything else. organization_id and actor_user_id
 * come from the executor's session-derived context, never from a proposal.
 */

/**
 * Probed once per server process. A missing table does not become missing
 * forever within a process — but it does not re-probe on every action either,
 * which would put an extra round trip in front of every write. After the
 * migration is applied, the next process picks it up.
 */
let cached: boolean | null = null;

/** Test seam: forces the next isAvailable() to probe again. */
export function resetActionLogAvailability(): void {
  cached = null;
}

export function createActionLog(): ActionLog {
  return {
    async isAvailable(): Promise<boolean> {
      if (cached !== null) return cached;
      const supabase = createSupabaseServerClient();
      // head:true fetches no rows — this asks "does this relation exist and can
      // I see it?" at the cost of one empty request.
      const { error } = await supabase
        .from("action_log")
        .select("id", { count: "exact", head: true });
      cached = !error;
      return cached;
    },

    async append(entry: ActionLogEntry): Promise<void> {
      const supabase = createSupabaseServerClient();
      const { error } = await supabase.from("action_log").insert({
        organization_id: entry.organizationId,
        actor_user_id: entry.actorUserId,
        proposal_id: entry.proposalId,
        action_kind: entry.actionKind,
        approved_summary: entry.approvedSummary,
        outcome: entry.outcome,
        refusal_reason: entry.refusalReason,
        detail: entry.detail,
        trip_id: entry.tripId,
        occurred_at: entry.occurredAt,
      });
      // Thrown, not swallowed here: the executor decides what a log failure
      // means (it tolerates and discloses it). Deciding that twice, in two
      // places, is how the two answers drift apart.
      if (error) throw error;
    },
  };
}
