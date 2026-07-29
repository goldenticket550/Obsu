import { LinkButton, TopBar } from "@/components/form";
import { EmptyState, Panel } from "@/components/dashboard";
import { UpcomingTripRow } from "@/components/upcoming-trip-row";
import { listTrips, type TripListRow } from "@/lib/db/trips";
import { bookedSummary, groupUpcomingTrips } from "@/lib/business/schedule";
import { centsToDollars } from "@/lib/money";
import { cancelTrip, markTripCompleted } from "../trips/actions";

/**
 * S2 — Upcoming: what's still coming, soonest first.
 *
 * Only scheduled rides appear here; completed work lives in /trips. Rides whose
 * pickup has already passed are lifted to the top as "Needs closing out",
 * because a ride that was driven but never closed out is silently missing from
 * every total until it is fixed.
 *
 * Data is org-scoped by RLS through the existing listTrips() path.
 */
export const dynamic = "force-dynamic";

function Section({
  id,
  title,
  count,
  tone = "normal",
  children,
}: {
  id: string;
  title: string;
  count: number;
  tone?: "normal" | "alert";
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-6 first:mt-0">
      <h2
        id={id}
        className={`mb-2 text-xs font-medium uppercase tracking-[0.18em] ${
          tone === "alert" ? "text-obsidian-negative" : "text-obsidian-silver"
        }`}
      >
        {title} · {count}
      </h2>
      <Panel
        className={`p-0 ${tone === "alert" ? "border-obsidian-negative/40" : ""}`}
      >
        <ul className="divide-y divide-obsidian-line">{children}</ul>
      </Panel>
    </section>
  );
}

export default async function UpcomingPage() {
  const trips = await listTrips();
  const now = new Date();
  const groups = groupUpcomingTrips(trips, now);
  const summary = bookedSummary(trips);

  const total =
    groups.needsClosingOut.length +
    groups.today.length +
    groups.tomorrow.length +
    groups.later.length;

  const row = (trip: TripListRow, overdue = false) => (
    <UpcomingTripRow
      key={trip.id}
      trip={trip}
      customerName={trip.customer?.name ?? null}
      markCompletedAction={markTripCompleted}
      cancelAction={cancelTrip}
      returnTo="/upcoming"
      overdue={overdue}
    />
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-16 pt-6">
      <TopBar
        title="Upcoming"
        action={
          <LinkButton href="/trips/new?status=scheduled">Schedule</LinkButton>
        }
      />

      {total === 0 ? (
        <div className="mt-8">
          <Panel>
            <EmptyState>
              Nothing scheduled yet. Book a ride and it&apos;ll show up here —
              it starts counting toward your numbers once you mark it completed.
            </EmptyState>
          </Panel>
        </div>
      ) : (
        <>
          {/* Forward-looking book. An unpriced ride is reported as a count, not
              summed as $0 — its value is unknown, not zero. */}
          <p className="mt-6 text-xs text-obsidian-muted">
            {summary.tripCount} {summary.tripCount === 1 ? "ride" : "rides"} booked
            {summary.quotedTotalCents > 0
              ? ` · $${centsToDollars(summary.quotedTotalCents)} quoted`
              : ""}
            {summary.unpricedCount > 0
              ? ` · ${summary.unpricedCount} with no price set`
              : ""}
          </p>

          <div className="mt-4">
            {groups.needsClosingOut.length > 0 ? (
              <Section
                id="needs-closing-out"
                title="Needs closing out"
                count={groups.needsClosingOut.length}
                tone="alert"
              >
                {groups.needsClosingOut.map((t) => row(t, true))}
              </Section>
            ) : null}

            {groups.today.length > 0 ? (
              <Section id="today" title="Today" count={groups.today.length}>
                {groups.today.map((t) => row(t))}
              </Section>
            ) : null}

            {groups.tomorrow.length > 0 ? (
              <Section id="tomorrow" title="Tomorrow" count={groups.tomorrow.length}>
                {groups.tomorrow.map((t) => row(t))}
              </Section>
            ) : null}

            {groups.later.length > 0 ? (
              <Section id="later" title="Later" count={groups.later.length}>
                {groups.later.map((t) => row(t))}
              </Section>
            ) : null}
          </div>
        </>
      )}
    </main>
  );
}
