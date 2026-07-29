import Link from "next/link";
import { listCustomers } from "@/lib/db/customers";
import { listTrips } from "@/lib/db/trips";
import { topCustomers } from "@/lib/business";
import { formatUsd } from "@/lib/money";
import { LinkButton, TopBar } from "@/components/form";
import { EmptyState, Panel } from "@/components/dashboard";

/**
 * The customer record. U3 rehomes the top-customer ranking here from the
 * dashboard — the dashboard is "now", this page is the record. The ranking
 * reuses the existing `topCustomers` calculation exactly (completed rides
 * only); no new ranking logic exists.
 */
export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const [customers, trips] = await Promise.all([listCustomers(), listTrips()]);

  // Only customers who have actually generated revenue are worth ranking.
  const ranked = topCustomers(trips, customers, 3).filter(
    (r) => r.revenueCents > 0,
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-16 pt-6">
      <TopBar
        title="Customers"
        action={<LinkButton href="/customers/new">Add customer</LinkButton>}
      />

      {ranked.length > 0 ? (
        <section
          aria-labelledby="top-customers"
          className="mt-6 rounded-xl border border-obsidian-line bg-obsidian-graphite p-5 shadow-panel"
        >
          <h2
            id="top-customers"
            className="text-[11px] font-medium uppercase tracking-[0.18em] text-obsidian-silver"
          >
            Top customers by revenue
          </h2>
          <ol className="mt-3 space-y-1">
            {ranked.map((r, index) => (
              <li key={r.customer.id}>
                <Link
                  href={`/customers/${r.customer.id}/edit`}
                  className="flex items-baseline justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-obsidian-slate/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan"
                >
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="font-mono text-[11px] tabular-nums text-obsidian-muted">
                      {index + 1}
                    </span>
                    <span className="truncate text-sm text-obsidian-platinum">
                      {r.customer.name}
                    </span>
                    <span className="shrink-0 text-[11px] text-obsidian-muted">
                      {r.tripCount} {r.tripCount === 1 ? "ride" : "rides"}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-obsidian-platinum">
                    {formatUsd(r.revenueCents)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[10px] text-obsidian-muted">
            Lifetime revenue from completed rides.
          </p>
        </section>
      ) : null}

      <div className="mt-4">
        {customers.length === 0 ? (
          <Panel>
            <EmptyState>No customers yet. Add your first customer.</EmptyState>
          </Panel>
        ) : (
          <Panel className="p-0">
            <ul className="divide-y divide-obsidian-line">
              {customers.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/customers/${c.id}/edit`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-obsidian-slate/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-obsidian-cyan"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-obsidian-platinum">
                        {c.name}
                      </p>
                      <p className="truncate text-xs text-obsidian-muted">
                        {[c.phone, c.email].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-obsidian-silver">
                      Open →
                    </span>
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
