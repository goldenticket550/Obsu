import { NewTripByText } from "@/components/new-trip-by-text";
import { TopBar } from "@/components/form";

/**
 * `?status=scheduled` opens the form in scheduling mode (booking a ride you
 * haven't driven yet); anything else opens the normal log-a-completed-trip
 * flow. S1.
 */
export default function NewTripPage({
  searchParams,
}: {
  searchParams: { error?: string; status?: string };
}) {
  const scheduling = searchParams.status === "scheduled";
  return (
    <main className="mx-auto w-full max-w-lg px-5 pb-16 pt-6">
      <TopBar
        title={scheduling ? "Schedule a ride" : "Log trip"}
        backHref="/trips"
      />
      <NewTripByText
        initialError={searchParams.error}
        initialStatus={scheduling ? "scheduled" : undefined}
      />
    </main>
  );
}
