import type { PaymentState } from "@/lib/business/payment";
import { formatUsd } from "@/lib/money";

/**
 * D1 — payment state, rendered from the discriminated union with EXHAUSTIVE
 * handling. Never a bare comparison against a number: adding a future case
 * fails the type check here until its presentation exists.
 *
 * "Not tracked" reads as ABSENCE. It is not "unpaid" and it is not "$0.00" —
 * both would assert something about money that nobody recorded.
 *
 * Colour follows the project's fixed semantics and is never the only signal:
 * every state carries its own words.
 */
function describe(state: PaymentState): { label: string; detail: string | null; tone: string } {
  switch (state.kind) {
    case "not_tracked":
      return {
        label: "Not tracked",
        detail: "No payment recorded for this ride.",
        tone: "text-obsidian-muted",
      };
    case "unpaid":
      return {
        label: "Unpaid",
        detail: `${formatUsd(state.balanceCents)} outstanding`,
        tone: "text-obsidian-amber",
      };
    case "partial":
      return {
        label: "Part paid",
        detail: `${formatUsd(state.balanceCents)} outstanding`,
        tone: "text-obsidian-amber",
      };
    case "paid":
      return { label: "Paid", detail: null, tone: "text-obsidian-positive" };
    case "overpaid":
      return {
        label: "Overpaid",
        // Reported, never clamped to "paid" — this is money that may be owed back.
        detail: `${formatUsd(state.overageCents)} over`,
        tone: "text-obsidian-negative",
      };
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}

export function PaymentStateBadge({ state }: { state: PaymentState }) {
  const { label, detail, tone } = describe(state);
  return (
    <span className="min-w-0">
      <span className={`text-sm ${tone}`}>{label}</span>
      {detail ? (
        <span className="ml-2 text-xs tabular-nums text-obsidian-muted">{detail}</span>
      ) : null}
    </span>
  );
}

export { describe as describePaymentState };
