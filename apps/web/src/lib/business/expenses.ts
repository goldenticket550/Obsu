import type { Expense, ExpenseCategory } from "@/lib/types";
import { EXPENSE_CATEGORIES } from "@/lib/enums";

/**
 * Expense calcs. PURE — take already-fetched expenses, return integer cents.
 * All expenses count (linked to a trip or standalone/overhead).
 */

export function totalExpensesCents(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount_cents, 0);
}

/** Cents totalled per category. Every category is present (0 when unused). */
export function expensesByCategoryCents(
  expenses: Expense[],
): Record<ExpenseCategory, number> {
  const totals = Object.fromEntries(
    EXPENSE_CATEGORIES.map((c) => [c, 0]),
  ) as Record<ExpenseCategory, number>;
  for (const e of expenses) {
    totals[e.category] = (totals[e.category] ?? 0) + e.amount_cents;
  }
  return totals;
}
