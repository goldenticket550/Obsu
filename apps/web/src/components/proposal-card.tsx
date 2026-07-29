"use client";

import type { Proposal } from "@/lib/business/proposal";

/**
 * V3 — the approval interface for a proposed action, and the same summary
 * shown while it runs.
 *
 * The text here is the proposal's own `humanReadableSummary`, which was
 * generated from the very fields the executor will use. What the owner reads
 * is what runs.
 *
 * Approval is explicit and per-proposal: this renders one proposal, its
 * buttons carry that proposal's id, and nothing here remembers a previous
 * decision.
 */

const RISK_TONE: Record<Proposal["riskLevel"], string> = {
  low: "text-obsidian-silver",
  medium: "text-obsidian-cyan",
  high: "text-obsidian-amber",
};

export function ProposalCard({
  proposal,
  onApprove,
  onReject,
  busy = false,
}: {
  proposal: Proposal;
  onApprove: (proposalId: string) => void;
  /** Rejecting discards the proposal outright — it is not parked for later. */
  onReject: (proposalId: string) => void;
  /** True while executing: the same summary, no decision to make. */
  busy?: boolean;
}) {
  const control =
    "inline-flex min-h-[44px] items-center rounded-lg px-4 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-black disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <section
      aria-labelledby={`proposal-${proposal.proposalId}`}
      className="w-full max-w-md rounded-xl border border-obsidian-line bg-obsidian-graphite p-4 text-left shadow-panel"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3
          id={`proposal-${proposal.proposalId}`}
          className="text-[11px] font-medium uppercase tracking-[0.18em] text-obsidian-silver"
        >
          {busy ? "Working on it" : "Approve this?"}
        </h3>
        <span className={`text-[10px] uppercase tracking-wide ${RISK_TONE[proposal.riskLevel]}`}>
          {proposal.riskLevel} impact
        </span>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-obsidian-platinum">
        {proposal.humanReadableSummary}
      </p>

      {busy ? (
        <p className="mt-3 text-xs text-obsidian-cyan" role="status">
          Applying this now…
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onApprove(proposal.proposalId)}
            className={`${control} bg-obsidian-blue text-white`}
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => onReject(proposal.proposalId)}
            className={`${control} border border-obsidian-line text-obsidian-silver`}
          >
            Reject
          </button>
        </div>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-obsidian-muted">
        Nothing happens until you approve. OBSIDIAN never acts on its own.
      </p>
    </section>
  );
}
