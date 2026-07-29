import type { Expense, Trip } from "@/lib/types";
import { totalRevenueCents } from "./revenue";
import { totalExpensesCents } from "./expenses";

/**
 * Profit calcs. PURE, integer cents. Always presented as ESTIMATES in the UI.
 */

/**
 * Estimated profit for a single trip = its revenue − the expenses linked to it.
 * Filters the passed expenses to those with trip_id === trip.id, so callers may
 * safely pass a broader list.
 */
export function estimatedTripProfitCents(
  trip: Trip,
  linkedExpenses: Expense[],
): number {
  const linkedTotal = linkedExpenses
    .filter((e) => e.trip_id === trip.id)
    .reduce((sum, e) => sum + e.amount_cents, 0);
  return trip.revenue_cents - linkedTotal;
}

/**
 * Estimated operating profit for a scope = completed-trip revenue − ALL
 * expenses in scope (linked and standalone/overhead, e.g. maintenance).
 */
export function estimatedOperatingProfitCents(
  trips: Trip[],
  expenses: Expense[],
): number {
  return totalRevenueCents(trips) - totalExpensesCents(expenses);
}

/**
 * Estimated operating profit as a percentage of recorded revenue.
 *
 * Derived from the two figures above — it introduces no new business rule.
 * Returns null when there is no revenue to divide by, so the UI can say "—"
 * instead of showing 0% (which would read as "we broke even", a different and
 * false claim) or NaN.
 */
export function profitMarginPercent(
  revenueCents: number,
  profitCents: number,
): number | null {
  if (!Number.isFinite(revenueCents) || revenueCents <= 0) return null;
  return (profitCents / revenueCents) * 100;
}
