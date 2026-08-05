import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { listTrips } from "@/lib/db/trips";
import { listExpenses } from "@/lib/db/expenses";
import { listCustomers } from "@/lib/db/customers";
import {
  averageTripValueCents,
  buildActionRequired,
  businessDayKey,
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
import { CommandCenterScene } from "@/components/command/command-center-scene";
import { ObsidianIntelligence } from "@/components/command/obsidian-intelligence";
import {
  SkylineAttentionArea,
  SkylineCommandLayout,
  SkylineFlowArea,
  SkylineHeaderArea,
  SkylineIntelligenceArea,
  SkylineIntelligenceFrame,
  SkylineMain,
  SkylinePulseArea,
  SkylineRideArea,
  SkylineRouteArea,
  SkylineTopBar,
} from "@/components/command/skyline-shell";
import { NextRide } from "@/components/command/next-ride";
import { deriveRouteVisualState, RouteLine } from "@/components/command/route-line";
import { TonightsFlow } from "@/components/command/tonights-flow";
import { BusinessPulse } from "@/components/command/business-pulse";
import { ActionRequired } from "@/components/command/action-required";
import { formatUsdForSpeech } from "@/lib/money";
import { resolveBusinessBranding } from "@/lib/business/business-profile";
import { PilotEndedNotice } from "@/components/command/pilot-ended";

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
    .select("name, status, pilot_ends_at")
    .eq("id", membership.organization_id)
    .single();
  const { data: profile } = await supabase
    .from("business_profile")
    .select("display_name, workspace_label, vehicle_description, primary_color, secondary_color")
    .eq("organization_id", membership.organization_id)
    .maybeSingle();
  const branding = resolveBusinessBranding(org?.name, profile);


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
  const businessName = branding.displayName || "Command Center";
  const pilotEnded =
    org?.status === "pilot" &&
    typeof org.pilot_ends_at === "string" &&
    new Date(org.pilot_ends_at).getTime() <= now.getTime();
  const activitySummary = operationalSummary(allTrips, now) || "Nothing scheduled";
  const attentionSummary = actionItems.length === 0
    ? "Nothing needs your attention"
    : `${actionItems.length} ${actionItems.length === 1 ? "item needs" : "items need"} your attention`;
  const dailyBriefing = `${greetingFor(now)}, ${businessName}. ${activitySummary}. ${attentionSummary}. Month-to-date revenue is ${formatUsdForSpeech(revenueCents)}, with estimated operating profit of ${formatUsdForSpeech(profitCents)}.`;

  return (
    <CommandCenterScene
      hasAttention={actionItems.length > 0}
      routeState={routeState}
    >
      <SkylineMain>
        <main className="mx-auto w-full max-w-[96rem] px-6 pb-10 pt-5">
          <SkylineCommandLayout>
            <SkylineHeaderArea>
              <SkylineTopBar
                businessName={branding.displayName}
                workspaceLabel={branding.workspaceLabel}
                now={now}
                actionItems={actionItems}
              />
              <p className="mt-2 text-sm text-content-secondary">
                {operationalSummary(allTrips, now)}
              </p>
              {branding.vehicleDescription ? (
                <p className="mt-1 text-xs text-content-muted">
                  Vehicle status | {branding.vehicleDescription}
                </p>
              ) : null}
              <Link
                href="/feedback"
                className="mt-2 inline-flex min-h-[44px] items-center text-xs font-medium text-accent-soft underline-offset-4 hover:underline"
              >
                Send feedback
              </Link>
            </SkylineHeaderArea>

            <SkylineAttentionArea>
              {pilotEnded ? (
                <PilotEndedNotice />
              ) : (
                <ActionRequired items={actionItems} variant="command" />
              )}
            </SkylineAttentionArea>

            <SkylineRideArea>
              <NextRide view={nextRide} now={now} variant="command" />
            </SkylineRideArea>

            <SkylineIntelligenceArea>
              <SkylineIntelligenceFrame>
                <ObsidianIntelligence
                  needsAttention={actionItems.length > 0}
                  actionCount={actionItems.length}
                  briefingDayKey={businessDayKey(now)}
                  dailyBriefing={dailyBriefing}
                  shortGreeting={`Hey, ${businessName}. How can I help today?`}
                />
              </SkylineIntelligenceFrame>
            </SkylineIntelligenceArea>

            {routeState === "empty" ? null : (
              <SkylineRouteArea>
                <RouteLine
                  pickup={nextRide.kind === "none" ? null : nextRide.trip.pickup_location}
                  dropoff={nextRide.kind === "none" ? null : nextRide.trip.dropoff_location}
                  editHref={nextRide.kind === "none" ? "/trips/new?status=scheduled" : `/trips/${nextRide.trip.id}/edit`}
                  variant="scene"
                />
              </SkylineRouteArea>
            )}

            <SkylineFlowArea>
              <TonightsFlow entries={flow} variant="command" />
            </SkylineFlowArea>

            <SkylinePulseArea>
              <BusinessPulse
                revenueCents={revenueCents}
                expensesCents={expensesCents}
                profitCents={profitCents}
                marginPercent={marginPercent}
                completedRides={completedRides}
                averageRideCents={averageRideCents}
                variant="command"
              />
            </SkylinePulseArea>
          </SkylineCommandLayout>
        </main>
      </SkylineMain>
    </CommandCenterScene>
  );
}
