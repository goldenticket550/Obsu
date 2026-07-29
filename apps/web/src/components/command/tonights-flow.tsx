import Link from "next/link";
import type { FlowEntry } from "@/lib/business/command-center";
import { formatPickupTime } from "@/lib/business/pickup-time";
import { hasQuotedPrice } from "@/lib/business/trip-status";
import { centsToDollars } from "@/lib/money";
import { labelize } from "@/lib/enums";
import type { TripListRow } from "@/lib/db/trips";

/**
 * U2 — the current business day as an ordered timeline. Ordering and day
 * bucketing come from the tested S2/U2 pure functions; this only renders.
 *
 * Status is never colour alone — completed and scheduled each carry a mark and
 * a word.
 */

function StatusMark({ kind }: { kind: FlowEntry["kind"] }) {
  if (kind === "completed") {
    return (
      <span
        className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-obsidian-positive/50 text-obsidian-positive"
        aria-hidden="true"
      >
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1.5 5.5L4 8l4.5-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className="mt-1 h-4 w-4 shrink-0 rounded-full border border-obsidian-cyan/60"
      aria-hidden="true"
    />
  );
}

export function TonightsFlow({ entries }: { entries: FlowEntry<TripListRow>[] }) {
  return (
    <section
      aria-labelledby="flow-heading"
      className="rounded-2xl border border-obsidian-line bg-obsidian-graphite/60 p-5 shadow-panel"
    >
      <h2
        id="flow-heading"
        className="text-[11px] font-medium uppercase tracking-[0.18em] text-obsidian-silver"
      >
        Tonight&apos;s flow
      </h2>

      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-obsidian-muted">
          Nothing on the books for today.
        </p>
      ) : (
        <ol className="mt-3 space-y-1">
          {entries.map(({ trip, kind, isNext }) => {
            const time = formatPickupTime(trip.start_time);
            const priced = hasQuotedPrice(trip);
            return (
              <li key={trip.id}>
                <Link
                  href={`/trips/${trip.id}/edit`}
                  className={`flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-obsidian-slate/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan ${
                    isNext ? "bg-obsidian-blue/10" : ""
                  }`}
                >
                  <StatusMark kind={kind} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-mono text-xs tabular-nums text-obsidian-platinum">
                        {time ?? "No time"}
                      </span>
                      <span className="truncate text-sm text-obsidian-platinum">
                        {trip.customer?.name ?? "No customer"}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-obsidian-muted">
                        {kind === "completed" ? "Completed" : "Scheduled"}
                        {isNext ? " · Next" : ""}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-obsidian-muted">
                      {trip.trip_type ? labelize(trip.trip_type) : "Ride"}
                      {trip.pickup_location || trip.dropoff_location
                        ? ` · ${trip.pickup_location ?? "?"} → ${trip.dropoff_location ?? "?"}`
                        : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs tabular-nums">
                    {priced ? (
                      <span className="text-obsidian-platinum">
                        ${centsToDollars(trip.revenue_cents)}
                      </span>
                    ) : (
                      <span className="text-obsidian-muted">No price</span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
