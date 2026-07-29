import { isExpired, type Proposal } from "@/lib/business/proposal";

/**
 * V2 — where a pending proposal lives between "here is what I'd do" and the
 * moment a human approves it. SERVER ONLY.
 *
 * This module exists because of one attack it closes. If the browser held the
 * proposal and posted it back on approval, the approval request would carry the
 * action — and a modified client could approve a $240 ride and submit $2,400,
 * or swap the trip id for someone else's. The screen would have shown one thing
 * and the executor would have received another, which is precisely the
 * "approved summary and executed fields must be the same data" guarantee V3
 * was built to make.
 *
 * So the client is given ONE opaque thing: a proposal id. Everything else is
 * looked up here, server-side, by an owner that must match the session.
 *
 * KNOWN LIMIT, stated rather than hidden: this is process memory. It does not
 * survive a restart and is not shared across instances, so a proposal issued by
 * one server process cannot be approved through another. On a single instance
 * that is invisible; on horizontally scaled hosting a proposal would sometimes
 * come back "expired or already handled", which is a safe failure — it refuses,
 * it never executes the wrong thing. Moving this to a table is a schema change
 * and was not in scope.
 */

interface StoredProposal {
  proposal: Proposal;
  /** The session that created it. Both must match to retrieve it. */
  userId: string;
  organizationId: string;
}

const pending = new Map<string, StoredProposal>();

/** Test seam. Never called by application code. */
export function clearProposalStore(): void {
  pending.clear();
}

/**
 * Drops everything past its TTL. Called on every access, so the map cannot grow
 * without bound from proposals nobody ever answered.
 */
function evictExpired(now: Date): void {
  for (const [id, entry] of pending) {
    if (isExpired(entry.proposal, now)) pending.delete(id);
  }
}

export function rememberProposal(
  proposal: Proposal,
  owner: { userId: string; organizationId: string },
  now: Date,
): void {
  evictExpired(now);
  pending.set(proposal.proposalId, {
    proposal,
    userId: owner.userId,
    organizationId: owner.organizationId,
  });
}

/**
 * Retrieves a proposal for the session that created it.
 *
 * Returns null for absent, expired, and *someone else's* alike. The caller
 * cannot tell those apart, which is deliberate: distinguishing "no such
 * proposal" from "not yours" tells an attacker which ids are real.
 */
export function takeProposal(
  proposalId: string,
  owner: { userId: string; organizationId: string },
  now: Date,
): Proposal | null {
  evictExpired(now);
  const entry = pending.get(proposalId);
  if (!entry) return null;
  if (entry.userId !== owner.userId) return null;
  if (entry.organizationId !== owner.organizationId) return null;

  // Removed on read. A proposal is answerable exactly once, so a double-tap
  // cannot present the same pending action twice — the executor's own
  // already-executed claim is the second line of defence, not the first.
  pending.delete(proposalId);
  return entry.proposal;
}
