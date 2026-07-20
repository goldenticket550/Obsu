import Link from "next/link";
import { listExpenses } from "@/lib/db/expenses";
import { centsToDollars } from "@/lib/money";
import { labelize } from "@/lib/enums";
import { LinkButton, TopBar } from "@/components/form";
import { EmptyState, Panel } from "@/components/dashboard";

export default async function ExpensesPage() {
  const expenses = await listExpenses();
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-16 pt-6">
      <TopBar
        title="Expenses"
        action={<LinkButton href="/expenses/new">Add expense</LinkButton>}
      />
      <div className="mt-8">
        {expenses.length === 0 ? (
          <Panel>
            <EmptyState>No expenses yet. Add your first expense.</EmptyState>
          </Panel>
        ) : (
          <Panel className="p-0">
            <ul className="divide-y divide-obsidian-line">
              {expenses.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/expenses/${e.id}/edit`}
                    className="block px-5 py-3 transition-colors hover:bg-obsidian-slate/50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-obsidian-platinum">
                        {labelize(e.category)}
                      </p>
                      <p className="text-sm font-semibold tabular-nums text-obsidian-platinum">
                        ${centsToDollars(e.amount_cents)}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-obsidian-muted">
                      {e.expense_date}
                      {e.trip
                        ? ` · trip ${e.trip.pickup_location ?? "?"} → ${e.trip.dropoff_location ?? "?"}`
                        : ""}
                      {e.description ? ` · ${e.description}` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </main>
  );
}
