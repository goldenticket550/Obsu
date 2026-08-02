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
import { CommandCenterScene } from "@/components/command/command-center-scene";
import { ObsidianIntelligence } from "@/components/command/obsidian-intelligence";
import {
  SkylineAttentionArea,
  SkylineCommandLayout,
  SkylineFlowArea,
  SkylineHeaderArea,
  SkylineIntelligenceArea,
  SkylineMain,
  SkylinePanel,
  SkylinePulseArea,
  SkylineRideArea,
  SkylineTopBar,
} from "@/components/command/skyline-shell";
import { NextRide } from "@/components/command/next-ride";
import { deriveRouteVisualState } from "@/components/command/route-line";
import { TonightsFlow } from "@/components/command/tonights-flow";
import { BusinessPulse } from "@/components/command/business-pulse";
import { ActionRequired } from "@/components/command/action-required";

/**
 * OBSIDIAN RIDES Command Center.
 *
 * Data remains server-rendered and RLS-scoped. The mobile-first DOM order puts
 * urgent work before the instrument; the desktop grid changes placement only.
 */
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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

  const [allTrips, allExpenses, customers] = await Promise.all([
    listTrips(),
    listExpenses(),
    listCustomers(),
  ]);
  const now = new Date();
  const { start, end } = currentMonthRange();
  const monthTrips = filterByDateRange(allTrips, "trip_date", start, end);
  const monthExpenses = filterByDateRange(allExpenses, "expense_date", start, end);

  const revenueCents = totalRevenueCents(monthTrips);
  const expensesCents = totalExpensesCents(monthExpenses);
  const profitCents = estimatedOperatingProfitCents(monthTrips, monthExpenses);
  const completedRides = tripCount(monthTrips);
  const averageRideCents = averageTripValueCents(monthTrips);
  const marginPercent = profitMarginPercent(revenueCents, profitCents);
  const nextRide = selectNextRide(allTrips, now);
  const flow = todaysFlow(allTrips, now);
  const actionItems = buildActionRequired(allTrips, customers, now, todayInNewYork());
  const routeState =
    nextRide.kind === "none"
      ? "empty"
      : deriveRouteVisualState(
          nextRide.trip.pickup_location,
          nextRide.trip.dropoff_location,
        );

  return (
    <CommandCenterScene
      hasAttention={actionItems.length > 0}
      routeState={routeState}
    >
      <SkylineMain>
        <main className="mx-auto w-full max-w-[90rem] px-5 pb-16 pt-6">
          <SkylineCommandLayout>
            <SkylineHeaderArea>
              <SkylineTopBar
                businessName={org?.name ?? null}
                now={now}
                actionItems={actionItems}
              />
              <p className="mt-2 text-sm text-content-secondary">
                {operationalSummary(allTrips, now)}
              </p>
            </SkylineHeaderArea>

            <SkylineAttentionArea>
              <ActionRequired items={actionItems} />
            </SkylineAttentionArea>

            <SkylineRideArea>
              <NextRide view={nextRide} now={now} />
            </SkylineRideArea>

            <SkylineIntelligenceArea>
              <SkylinePanel className="h-full p-5" labelledBy="intelligence-heading">
                <h2
                  id="intelligence-heading"
                  className="text-[11px] font-medium uppercase tracking-[0.18em] text-content-secondary"
                >
                  Obsidian intelligence
                </h2>
                <div className="mt-3">
                  <ObsidianIntelligence needsAttention={actionItems.length > 0} />
                </div>
              </SkylinePanel>
            </SkylineIntelligenceArea>

            <SkylineFlowArea>
              <TonightsFlow entries={flow} />
            </SkylineFlowArea>

            <SkylinePulseArea>
              <BusinessPulse
                revenueCents={revenueCents}
                expensesCents={expensesCents}
                profitCents={profitCents}
                marginPercent={marginPercent}
                completedRides={completedRides}
                averageRideCents={averageRideCents}
              />
            </SkylinePulseArea>
          </SkylineCommandLayout>
        </main>
      </SkylineMain>
    </CommandCenterScene>
  );
}
