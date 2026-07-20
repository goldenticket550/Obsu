import { notFound } from "next/navigation";
import { TripForm } from "@/components/trip-form";
import { TopBar } from "@/components/form";
import { getTrip } from "@/lib/db/trips";
import { updateTrip } from "../../actions";

export default async function EditTripPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const trip = await getTrip(params.id);
  if (!trip) notFound();
  return (
    <main className="mx-auto w-full max-w-lg px-5 pb-16 pt-6">
      <TopBar title="Edit trip" backHref="/trips" />
      <TripForm
        action={updateTrip}
        trip={trip}
        customerName={trip.customer?.name ?? ""}
        error={searchParams.error}
        submitLabel="Save changes"
        showInlineCosts={false}
      />
    </main>
  );
}
