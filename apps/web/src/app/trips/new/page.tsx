import { NewTripByText } from "@/components/new-trip-by-text";
import { TopBar } from "@/components/form";

export default function NewTripPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="mx-auto w-full max-w-lg px-5 pb-16 pt-6">
      <TopBar title="Log trip" backHref="/trips" />
      <NewTripByText initialError={searchParams.error} />
    </main>
  );
}
