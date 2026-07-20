import Link from "next/link";
import { listTrips } from "@/lib/db/trips";
import { centsToDollars } from "@/lib/money";
import { labelize } from "@/lib/enums";
import { LinkButton, TopBar } from "@/components/form";
import { EmptyState, Panel } from "@/components/dashboard";

export default async function TripsPage() {
  const trips = await listTrips();
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-16 pt-6">
      <TopBar
        title="Trips"
        action={<LinkButton href="/trips/new">Log trip</LinkButton>}
      />
      <div className="mt-8">
        {trips.length === 0 ? (
          <Panel>
            <EmptyState>No trips logged yet. Log your first trip.</EmptyState>
          </Panel>
        ) : (
          <Panel className="p-0">
            <ul className="divide-y divide-obsidian-line">
              {trips.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/trips/${t.id}/edit`}
                    className="block px-5 py-3 transition-colors hover:bg-obsidian-slate/50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-obsidian-platinum">
                        {t.customer?.name ?? "No customer"}
                      </p>
                      <p className="text-sm font-semibold tabular-nums text-obsidian-platinum">
                        ${centsToDollars(t.revenue_cents)}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-obsidian-muted">
                      {t.trip_date} · {t.pickup_location ?? "?"} →{" "}
                      {t.dropoff_location ?? "?"}
                      {t.trip_type ? ` · ${labelize(t.trip_type)}` : ""}
                      {t.payment_method ? ` · ${labelize(t.payment_method)}` : ""}{" "}
                      · {labelize(t.status)}
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
