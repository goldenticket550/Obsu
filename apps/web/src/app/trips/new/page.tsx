import { NewTripByText } from "@/components/new-trip-by-text";
import { TopBar } from "@/components/form";
import { listTrips } from "@/lib/db/trips";
import { listCustomers } from "@/lib/db/customers";
import {
  mostCommonPaymentMethod,
  mostCommonTripType,
  recentCustomers,
} from "@/lib/business/form-defaults";

/**
 * `?status=scheduled` opens the form in scheduling mode (booking a ride you
 * haven't driven yet); anything else opens the normal log-a-completed-trip
 * flow. S1.
 *
 * U5: the form's defaults are derived here, server-side, from THIS org's own
 * completed rides (RLS-scoped through the existing listTrips/listCustomers
 * path — no org id is ever taken from the client). Where the org has no
 * history the helpers return null and the fields simply open empty.
 */
export const dynamic = "force-dynamic";

export default async function NewTripPage({
  searchParams,
}: {
  searchParams: { error?: string; status?: string };
}) {
  const scheduling = searchParams.status === "scheduled";

  const [trips, customers] = await Promise.all([listTrips(), listCustomers()]);
  const quickPicks = recentCustomers(trips, customers).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <main className="mx-auto w-full max-w-lg px-5 pb-16 pt-6">
      <TopBar
        title={scheduling ? "Schedule a ride" : "Log trip"}
        backHref="/trips"
      />
      <NewTripByText
        initialError={searchParams.error}
        initialStatus={scheduling ? "scheduled" : undefined}
        defaultTripType={mostCommonTripType(trips)}
        defaultPaymentMethod={mostCommonPaymentMethod(trips)}
        recentCustomers={quickPicks}
      />
    </main>
  );
}
