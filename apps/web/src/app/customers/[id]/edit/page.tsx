import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/customer-form";
import { FollowUpDrafts } from "@/components/follow-up-drafts";
import { TopBar } from "@/components/form";
import { getCustomer } from "@/lib/db/customers";
import { listTrips } from "@/lib/db/trips";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { customerActivity, todayInNewYork } from "@/lib/business";
import { formatUsd } from "@/lib/money";
import { updateCustomer } from "../../actions";

/**
 * A customer's page: their details, their history with the business, and the
 * copy-only follow-up draft — rehomed here from the dashboard in U3 and scoped
 * to this one customer, so the Action Required flag and the fix are one tap
 * apart. Drafts remain PREPARE-ONLY: no send button, no messaging integration.
 */
export const dynamic = "force-dynamic";

export default async function EditCustomerPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const customer = await getCustomer(params.id);
  if (!customer) notFound();

  const trips = await listTrips();
  const activity = customerActivity(trips, customer.id, todayInNewYork());

  // Business name for the draft, so it is never hard-coded to one operator.
  const supabase = createSupabaseServerClient();
  const { data: memberships } = await supabase
    .from("memberships")
    .select("organization_id")
    .limit(1);
  const orgId = memberships?.[0]?.organization_id;
  const { data: org } = orgId
    ? await supabase.from("organizations").select("name").eq("id", orgId).single()
    : { data: null };
  const businessName: string = org?.name ?? "We";

  const stats: { label: string; value: string }[] = [
    { label: "Completed rides", value: String(activity.tripCount) },
    { label: "Lifetime value", value: formatUsd(activity.lifetimeRevenueCents) },
    {
      label: "Last ride",
      value:
        activity.lastTripDate === null
          ? "No rides yet"
          : `${activity.lastTripDate} · ${activity.daysSinceLastTrip}d ago`,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-lg px-5 pb-16 pt-6">
      <TopBar title="Customer" backHref="/customers" />

      <CustomerForm
        action={updateCustomer}
        customer={customer}
        error={searchParams.error}
        submitLabel="Save changes"
      />

      {/* History — completed rides only, matching every other total. */}
      <section
        aria-labelledby="customer-history"
        className="mt-8 rounded-xl border border-obsidian-line bg-obsidian-graphite p-5 shadow-panel"
      >
        <h2
          id="customer-history"
          className="text-[11px] font-medium uppercase tracking-[0.18em] text-obsidian-silver"
        >
          History
        </h2>
        <dl className="mt-3 grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="min-w-0">
              <dt className="text-[10px] uppercase tracking-[0.14em] text-obsidian-muted">
                {s.label}
              </dt>
              <dd
                className="mt-1 truncate text-sm tabular-nums text-obsidian-platinum"
                title={s.value}
              >
                {s.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Follow-up draft. Offered once there is a relationship to follow up on;
          called out when this customer has gone quiet. */}
      {activity.tripCount > 0 && activity.daysSinceLastTrip !== null ? (
        <section
          aria-labelledby="customer-follow-up"
          className={`mt-4 rounded-xl border bg-obsidian-graphite shadow-panel ${
            activity.isQuiet ? "border-obsidian-cyan/40" : "border-obsidian-line"
          }`}
        >
          <div className="px-5 pt-5">
            <h2
              id="customer-follow-up"
              className="text-[11px] font-medium uppercase tracking-[0.18em] text-obsidian-silver"
            >
              Follow up
            </h2>
            <p className="mt-1 text-[11px] text-obsidian-muted">
              {activity.isQuiet
                ? `${customer.name} has ridden with you before but not in ${activity.daysSinceLastTrip} days.`
                : "Draft a note to this customer. OBSIDIAN never sends messages — you copy it and send it yourself."}
            </p>
          </div>
          <FollowUpDrafts
            businessName={businessName}
            customers={[
              {
                id: customer.id,
                name: customer.name,
                daysSinceLastTrip: activity.daysSinceLastTrip,
                lifetimeUsd: formatUsd(activity.lifetimeRevenueCents),
              },
            ]}
          />
        </section>
      ) : null}
    </main>
  );
}
