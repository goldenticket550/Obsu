import Link from "next/link";
import { listTrips } from "@/lib/db/trips";
import { centsToDollars } from "@/lib/money";
import { labelize } from "@/lib/enums";
import { LinkButton, TopBar } from "@/components/form";
import { EmptyState, Panel } from "@/components/dashboard";
import { hasQuotedPrice } from "@/lib/business/trip-status";
import { formatPickupTime } from "@/lib/business/pickup-time";
import type { TripStatus } from "@/lib/types";

/**
 * The completed-trip log. It reads as "what I've earned", so it shows COMPLETED
 * trips by default — mixing booked or canceled rides into it would overstate
 * that record. Scheduled rides live in /upcoming; the filter below still lets
 * you look at scheduled or canceled ones from here on purpose (S2).
 */
export const dynamic = "force-dynamic";

const FILTERS: { key: TripStatus | "all"; label: string }[] = [
  { key: "completed", label: "Completed" },
  { key: "scheduled", label: "Scheduled" },
  { key: "canceled", label: "Canceled" },
  { key: "all", label: "All" },
];

function isFilterKey(value: string | undefined): value is TripStatus | "all" {
  return FILTERS.some((f) => f.key === value);
}

const EMPTY_COPY: Record<TripStatus | "all", string> = {
  completed: "No completed trips yet. Log one after your next ride.",
  scheduled: "No scheduled rides. Booked rides appear in Upcoming.",
  canceled: "No canceled rides.",
  all: "No trips yet.",
};

export default async function TripsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const active = isFilterKey(searchParams.status)
    ? searchParams.status
    : "completed";
  const all = await listTrips();
  const trips = active === "all" ? all : all.filter((t) => t.status === active);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-16 pt-6">
      <TopBar
        title="Trips"
        action={<LinkButton href="/trips/new">Log trip</LinkButton>}
      />

      {/* Plain links: no client JS, keyboard-reachable, shareable URLs. */}
      <nav
        aria-label="Filter trips by status"
        className="mt-6 flex flex-wrap gap-2"
      >
        {FILTERS.map((f) => {
          const selected = f.key === active;
          return (
            <Link
              key={f.key}
              href={f.key === "completed" ? "/trips" : `/trips?status=${f.key}`}
              aria-current={selected ? "page" : undefined}
              className={`inline-flex min-h-[44px] items-center rounded-lg border px-3 py-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-black ${
                selected
                  ? "border-obsidian-cyan bg-obsidian-cyan/10 text-obsidian-platinum"
                  : "border-obsidian-line text-obsidian-silver hover:border-obsidian-cyan hover:text-obsidian-platinum"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4">
        {trips.length === 0 ? (
          <Panel>
            <EmptyState>{EMPTY_COPY[active]}</EmptyState>
          </Panel>
        ) : (
          <Panel className="p-0">
            <ul className="divide-y divide-obsidian-line">
              {trips.map((t) => {
                const pickup = formatPickupTime(t.start_time);
                const priced = hasQuotedPrice(t);
                return (
                  <li key={t.id}>
                    <Link
                      href={`/trips/${t.id}/edit`}
                      className="block px-5 py-3 transition-colors hover:bg-obsidian-slate/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-obsidian-cyan"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-obsidian-platinum">
                          {t.customer?.name ?? "No customer"}
                        </p>
                        {/* An unpriced booked ride says so — never "$0.00". */}
                        {t.status !== "completed" && !priced ? (
                          <p className="shrink-0 text-[11px] text-obsidian-muted">
                            No price set
                          </p>
                        ) : (
                          <p className="shrink-0 text-sm font-semibold tabular-nums text-obsidian-platinum">
                            ${centsToDollars(t.revenue_cents)}
                          </p>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-obsidian-muted">
                        {t.trip_date}
                        {pickup ? ` · ${pickup}` : ""} ·{" "}
                        {t.pickup_location ?? "?"} → {t.dropoff_location ?? "?"}
                        {t.trip_type ? ` · ${labelize(t.trip_type)}` : ""}
                        {t.payment_method ? ` · ${labelize(t.payment_method)}` : ""}{" "}
                        · {labelize(t.status)}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}
      </div>
    </main>
  );
}
