import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { listTrips } from "@/lib/db/trips";
import { listExpenses } from "@/lib/db/expenses";
import { listCustomers } from "@/lib/db/customers";
import {
  averageTripValueCents,
  buildActionRequired,
  businessDateLabel,
  currentMonthRange,
  estimatedOperatingProfitCents,
  filterByDateRange,
  greetingFor,
  operationalSummary,
  profitMarginPercent,
  selectNextRide,
  todayInNewYork,
  todaysFlow,
  totalExpensesCents,
  totalRevenueCents,
  tripCount,
} from "@/lib/business";
import { AskObsidian } from "@/components/ask-obsidian";
import { NextRide } from "@/components/command/next-ride";
import { TonightsFlow } from "@/components/command/tonights-flow";
import { BusinessPulse } from "@/components/command/business-pulse";
import { ActionRequired } from "@/components/command/action-required";

/**
 * OBSIDIAN RIDES — Command Center (U2).
 *
 * Server-rendered. Fetches the org's trips / expenses / customers (RLS-scoped),
 * then hands them to the PURE functions in src/lib/business. No math and no
 * date logic live here (build rule #6).
 *
 * Section order is the operational hierarchy: greeting → Next Ride → Obsidian
 * Intelligence → Tonight's Flow → Business Pulse → Action Required. DOM order
 * follows the MOBILE priority (Action Required sits third) because the phone is
 * the primary surface and screen readers follow DOM order; `lg:order-*`
 * restores the desktop order on wide screens.
 */
export const dynamic = "force-dynamic";

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

  const [allTrips, allExpenses, customers] = await Promise.all([
    listTrips(),
    listExpenses(),
    listCustomers(),
  ]);

  // One `now` for the whole render, so every section agrees on the moment.
  const now = new Date();

  // This-month window in America/New_York, then the existing pure calcs.
  const { start, end } = currentMonthRange();
  const monthTrips = filterByDateRange(allTrips, "trip_date", start, end);
  const monthExpenses = filterByDateRange(allExpenses, "expense_date", start, end);

  const revenueCents = totalRevenueCents(monthTrips);
  const expensesCents = totalExpensesCents(monthExpenses);
  const profitCents = estimatedOperatingProfitCents(monthTrips, monthExpenses);
  const completedRides = tripCount(monthTrips);
  const averageRideCents = averageTripValueCents(monthTrips);
  // Derived from the two figures above by the tested business function — no
  // new rule, and null rather than a divide-by-zero when revenue is 0.
  const marginPercent = profitMarginPercent(revenueCents, profitCents);

  const nextRide = selectNextRide(allTrips, now);
  const flow = todaysFlow(allTrips, now);
  const actionItems = buildActionRequired(
    allTrips,
    customers,
    now,
    todayInNewYork(),
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-16 pt-6">
      <div className="flex flex-col gap-5">
        {/* 2 — GREETING + operational status */}
        <header className="order-1">
          <p className="text-[11px] uppercase tracking-[0.18em] text-obsidian-muted">
            {businessDateLabel(now)}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-obsidian-platinum">
            {greetingFor(now)}.
          </h1>
          <p className="mt-1 text-sm text-obsidian-silver">
            {businessName} · {operationalSummary(allTrips, now)}
          </p>
        </header>

        {/* 3 — NEXT RIDE (centerpiece; its primary action lives inside) */}
        <div className="order-2">
          <NextRide view={nextRide} now={now} />
        </div>

        {/* 7 — ACTION REQUIRED (third on mobile, last on desktop) */}
        <div className="order-3 lg:order-6">
          <ActionRequired items={actionItems} />
        </div>

        {/* 4 — OBSIDIAN INTELLIGENCE. Holds the existing, working Ask
            OBSIDIAN. The orb arrives in V1 — nothing that does not work is
            shipped here, but the section is where it will live. */}
        <section
          aria-labelledby="intelligence-heading"
          className="order-4 rounded-2xl border border-obsidian-line bg-gradient-to-b from-obsidian-graphite to-obsidian-black p-5 shadow-panel lg:order-3"
        >
          <h2
            id="intelligence-heading"
            className="text-[11px] font-medium uppercase tracking-[0.18em] text-obsidian-silver"
          >
            Obsidian intelligence
          </h2>
          <div className="mt-3">
            <AskObsidian />
          </div>
        </section>

        {/* 5 — TONIGHT'S FLOW */}
        <div className="order-5 lg:order-4">
          <TonightsFlow entries={flow} />
        </div>

        {/* 6 — BUSINESS PULSE */}
        <div className="order-6 lg:order-5">
          <BusinessPulse
            revenueCents={revenueCents}
            expensesCents={expensesCents}
            profitCents={profitCents}
            marginPercent={marginPercent}
            completedRides={completedRides}
            averageRideCents={averageRideCents}
          />
        </div>
      </div>
    </main>
  );
}
