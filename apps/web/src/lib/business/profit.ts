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
