import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { listTrips } from "@/lib/db/trips";
import { listExpenses } from "@/lib/db/expenses";
import { listCustomers } from "@/lib/db/customers";
import {
  averageTripValueCents,
  buildActionRequired,
  currentMonthRange,
  estimatedOperatingProfitCents,
  filterByDateRange,
  operationalSummary,
  profitMarginPercent,
  selectNextRide,
  todayInNewYork,
  todaysFlow,
  totalExpensesCents,
  totalRevenueCents,
  tripCount,
} from "@/lib/business";
import { ObsidianIntelligence } from "@/components/command/obsidian-intelligence";
import {
  SkylineAtmosphere,
  SkylineGrid,
  SkylineMain,
  SkylineMainColumn,
  SkylinePanel,
  SkylineSideColumn,
  SkylineTopBar,
} from "@/components/command/skyline-shell";
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

  // No fallback literal: an unnamed business renders an empty eyebrow rather
  // than a placeholder name its owner never chose.

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
    <>
      {/* Fixed behind everything. */}
      <SkylineAtmosphere />

      <SkylineMain>
        <main className="mx-auto w-full max-w-6xl px-5 pb-16 pt-6">
          {/* 1 — TOP BAR. The eyebrow is the org's own name; nothing here is
              hard-coded, so a second operator sees their own business. */}
          <SkylineTopBar
            businessName={org?.name ?? null}
            now={now}
            actionItems={actionItems}
          />

          <p className="mt-2 text-sm text-content-secondary">
            {operationalSummary(allTrips, now)}
          </p>

          {/* The two-column fold: dominant card left, intelligence right. */}
          <div className="mt-6">
            <SkylineGrid>
              <SkylineMainColumn>
                {/* 3 — NEXT RIDE (its primary action lives inside) */}
                <NextRide view={nextRide} now={now} />
              </SkylineMainColumn>

              <SkylineSideColumn>
                {/* 4 — OBSIDIAN INTELLIGENCE. The orb is the centerpiece,
                    driven by the real typed flow. */}
                <SkylinePanel className="h-full p-5" labelledBy="intelligence-heading">
                  <h2
                    id="intelligence-heading"
                    className="text-[11px] font-medium uppercase tracking-[0.18em] text-content-secondary"
                  >
                    Obsidian intelligence
                  </h2>
                  <div className="mt-3">
                    {/* Amber comes from the SAME list Action Required renders —
                        one calculation, two presentations. */}
                    <ObsidianIntelligence needsAttention={actionItems.length > 0} />
                  </div>
                </SkylinePanel>
              </SkylineSideColumn>
            </SkylineGrid>
          </div>

          {/* Below the fold, unchanged in this task. */}
          <div className="mt-5 flex flex-col gap-5">
            <ActionRequired items={actionItems} />
            <TonightsFlow entries={flow} />
            <BusinessPulse
              revenueCents={revenueCents}
              expensesCents={expensesCents}
              profitCents={profitCents}
              marginPercent={marginPercent}
              completedRides={completedRides}
              averageRideCents={averageRideCents}
            />
          </div>
        </main>
      </SkylineMain>
    </>
  );
}
