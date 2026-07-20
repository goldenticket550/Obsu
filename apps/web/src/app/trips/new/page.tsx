import { TripForm } from "@/components/trip-form";
import { TopBar } from "@/components/form";
import { createTrip } from "../actions";

export default function NewTripPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="mx-auto w-full max-w-lg px-5 pb-16 pt-6">
      <TopBar title="Log trip" backHref="/trips" />
      <TripForm
        action={createTrip}
        error={searchParams.error}
        submitLabel="Log trip"
        showInlineCosts
      />
    </main>
  );
}
