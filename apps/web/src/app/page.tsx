import Link from "next/link";
import { redirect } from "next/navigation";
import {
  EmptyState,
  Panel,
  QuickAction,
  SectionLabel,
  StatCard,
} from "@/components/dashboard";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { listTrips } from "@/lib/db/trips";
import { listExpenses } from "@/lib/db/expenses";
import { listCustomers } from "@/lib/db/customers";
import {
  INACTIVE_THRESHOLD_DAYS,
  averageTripValueCents,
  currentMonthRange,
  estimatedOperatingProfitCents,
  filterByDateRange,
  inactiveCustomers,
  todayInNewYork,
  topCustomers,
  totalExpensesCents,
  totalRevenueCents,
  tripCount,
} from "@/lib/business";
import { formatUsd } from "@/lib/money";
import { labelize } from "@/lib/enums";
import { FollowUpDrafts } from "@/components/follow-up-drafts";
import { signOut } from "./login/actions";

/**
 * OBSIDIAN RIDES — dashboard (M6).
 *
 * Protected (middleware + this component). Fetches the org's trips / expenses /
 * customers (RLS-scoped), then calls the PURE calc functions in
 * src/lib/business to fill the This-Month numbers, the average-trip line, and
 * top-customer insights. This component only fetches and formats — no math
 * lives here (build rule #6).
 */
export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Find the user's business. RLS ensures they only ever see their own.
  const { data: memberships } = await supabase
    .from("memberships")
    .select("organization_id, role")
    .limit(1);

  const membership = memberships?.[0];
  if (!membership) redirect("/onboarding");

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", membership.organization_id)
    .single();

  const businessName: string = org?.name ?? "Your business";

  // Fetch everything for this org (RLS-scoped). Small dataset — the M5 pure
  // functions filter/aggregate in memory, which is exactly what they're for.
  const [allTrips, allExpenses, customers] = await Promise.all([
    listTrips(),
    listExpenses(),
    listCustomers(),
  ]);

  // This-month window in America/New_York (M5), then the pure calcs.
  const { start, end } = currentMonthRange();
  const monthTrips = filterByDateRange(allTrips, "trip_date", start, end);
  const monthExpenses = filterByDateRange(
    allExpenses,
    "expense_date",
    start,
    end,
  );

  const revenueCents = totalRevenueCents(monthTrips);
  const expensesCents = totalExpensesCents(monthExpenses);
  const profitCents = estimatedOperatingProfitCents(monthTrips, monthExpenses);
  const completedTrips = tripCount(monthTrips);
  const avgTripCents = averageTripValueCents(monthTrips);

  const topRanked = topCustomers(allTrips, customers, 3).filter(
    (r) => r.revenueCents > 0,
  );

  // Follow-up intelligence (M9): repeat customers who've gone quiet.
  const inactive = inactiveCustomers(
    allTrips,
    customers,
    INACTIVE_THRESHOLD_DAYS,
    todayInNewYork(),
  );
  const followUpRows = inactive.map((c) => ({
    id: c.customer.id,
    name: c.name,
    daysSinceLastTrip: c.daysSinceLastTrip,
    lifetimeUsd: formatUsd(c.lifetimeRevenueCents),
  }));

  // Recent Activity (unchanged from M4) — latest raw trips/expenses, newest-first.
  type Activity = {
    id: string;
    created_at: string;
    kind: "Trip" | "Expense";
    primary: string;
    amount_cents: number;
    meta: string;
    href: string;
  };
  const activity: Activity[] = [
    ...allTrips.map(
      (t): Activity => ({
        id: `t-${t.id}`,
        created_at: t.created_at,
        kind: "Trip",
        primary: t.customer?.name ?? "Trip",
        amount_cents: t.revenue_cents,
        meta: `${t.trip_date} · ${t.pickup_location ?? "?"} → ${t.dropoff_location ?? "?"}`,
        href: `/trips/${t.id}/edit`,
      }),
    ),
    ...allExpenses.map(
      (e): Activity => ({
        id: `e-${e.id}`,
        created_at: e.created_at,
        kind: "Expense",
        primary: labelize(e.category),
        amount_cents: e.amount_cents,
        meta: `${e.expense_date}${e.description ? ` · ${e.description}` : ""}`,
        href: `/expenses/${e.id}/edit`,
      }),
    ),
  ]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 6);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-16 pt-6">
      {/* Top bar */}
      <header className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tracking-[0.2em] text-obsidian-platinum">
            OBSIDIAN
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-obsidian-cyan">
            Rides
          </span>
        </div>
        <form action={signOut} className="flex items-center gap-3">
          <span className="hidden text-xs text-obsidian-muted sm:inline">
            {user.email}
          </span>
          <button
            type="submit"
            className="rounded-lg border border-obsidian-line px-3 py-1.5 text-xs text-obsidian-silver transition-colors hover:border-obsidian-cyan hover:text-obsidian-platinum"
          >
            Sign out
          </button>
        </form>
      </header>

      {/* Greeting */}
      <section className="mt-8">
        <h1 className="text-2xl font-semibold text-obsidian-platinum">
          Good morning.
        </h1>
        <p className="mt-1 text-sm text-obsidian-silver">
          {businessName} at a glance.
        </p>
      </section>

      {/* This month */}
      <section className="mt-8">
        <SectionLabel>This Month</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Revenue" value={formatUsd(revenueCents)} />
          <StatCard
            label="Recorded Expenses"
            value={formatUsd(expensesCents)}
          />
          <StatCard
            label="Est. Operating Profit"
            value={formatUsd(profitCents)}
            hint="Estimated"
            accent
          />
          <StatCard label="Trips" value={String(completedTrips)} />
        </div>
        <p className="mt-2 text-xs text-obsidian-muted">
          Average trip value{" "}
          <span className="text-obsidian-silver">
            {formatUsd(avgTripCents)}
          </span>
          . Operating profit is an{" "}
          <span className="text-obsidian-silver">estimate</span> — this
          month&apos;s completed-trip revenue minus all recorded expenses, not
          audited net income.
        </p>
      </section>

      {/* Customer insights */}
      <section className="mt-8">
        <SectionLabel>Customer Insights</SectionLabel>

        {/* Follow-ups — repeat customers who've gone quiet */}
        {followUpRows.length > 0 ? (
          <Panel className="p-0">
            <div className="border-b border-obsidian-line px-5 py-3">
              <p className="text-sm font-medium text-obsidian-platinum">
                {followUpRows.length} repeat customer
                {followUpRows.length === 1 ? "" : "s"} due for follow-up
              </p>
              <p className="mt-0.5 text-xs text-obsidian-muted">
                Haven&apos;t ridden in {INACTIVE_THRESHOLD_DAYS}+ days. Draft a
                note to check in — you send it yourself.
              </p>
            </div>
            <FollowUpDrafts customers={followUpRows} />
          </Panel>
        ) : (
          <Panel>
            <EmptyState>
              No repeat customers are overdue — everyone has ridden within the
              last {INACTIVE_THRESHOLD_DAYS} days. Follow-up suggestions appear
              here when someone goes quiet.
            </EmptyState>
          </Panel>
        )}

        {/* Top customers by revenue */}
        {topRanked.length > 0 ? (
          <div className="mt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-obsidian-silver">
              Top customers
            </p>
            <Panel className="p-0">
              <ul className="divide-y divide-obsidian-line">
                {topRanked.map((r) => (
                  <li
                    key={r.customer.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-obsidian-platinum">
                        {r.customer.name}
                      </p>
                      <p className="text-xs text-obsidian-muted">
                        {r.tripCount} {r.tripCount === 1 ? "trip" : "trips"}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-obsidian-platinum">
                      {formatUsd(r.revenueCents)}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        ) : null}
      </section>

      {/* Recent activity */}
      <section className="mt-8">
        <SectionLabel>Recent Activity</SectionLabel>
        {activity.length === 0 ? (
          <Panel>
            <EmptyState>No trips or expenses recorded yet.</EmptyState>
          </Panel>
        ) : (
          <Panel className="p-0">
            <ul className="divide-y divide-obsidian-line">
              {activity.map((a) => (
                <li key={a.id}>
                  <Link
                    href={a.href}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-obsidian-slate/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-obsidian-platinum">
                        <span className="text-obsidian-muted">{a.kind}</span>{" "}
                        {a.primary}
                      </p>
                      <p className="truncate text-xs text-obsidian-muted">
                        {a.meta}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-obsidian-platinum">
                      {formatUsd(a.amount_cents)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </section>

      {/* Quick actions */}
      <section className="mt-8">
        <SectionLabel>Quick Actions</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction label="Schedule Ride" href="/trips/new?status=scheduled" />
          <QuickAction label="Log Trip" href="/trips/new" />
          <QuickAction label="Add Expense" href="/expenses/new" />
          <QuickAction label="Add Customer" href="/customers/new" />
          <QuickAction label="Ask OBSIDIAN" href="/ask" />
        </div>
      </section>

      {/* Ask OBSIDIAN */}
      <section className="mt-8">
        <SectionLabel>Ask OBSIDIAN</SectionLabel>
        <Link
          href="/ask"
          className="flex items-center justify-between gap-2 rounded-xl border border-obsidian-line bg-obsidian-graphite p-3 shadow-panel transition-colors hover:border-obsidian-cyan"
        >
          <span className="px-1 text-sm text-obsidian-muted">
            Ask anything about your business…
          </span>
          <span className="rounded-lg bg-obsidian-platinum px-3 py-1.5 text-xs font-semibold text-obsidian-black">
            Ask →
          </span>
        </Link>
        <p className="mt-2 text-xs text-obsidian-muted">
          The assistant answers from your verified business data — never
          guessed numbers.
        </p>
        <Link
          href="/obsidian"
          className="mt-2 inline-flex items-center gap-1 text-xs text-obsidian-cyan transition-colors hover:text-obsidian-platinum"
        >
          🎙 Talk to OBSIDIAN (voice) →
        </Link>
      </section>

      <footer className="mt-12 border-t border-obsidian-line pt-5 text-center text-xs text-obsidian-muted">
        OBSIDIAN · Your Business. Our A.I. · signed in as {user.email}
      </footer>
    </main>
  );
}
