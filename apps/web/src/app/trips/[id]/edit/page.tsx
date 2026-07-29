import { notFound } from "next/navigation";
import { TripForm } from "@/components/trip-form";
import { TripCloseOut } from "@/components/trip-close-out";
import { TripConfirm } from "@/components/trip-confirm";
import { PaymentStateBadge } from "@/components/payment-state";
import { TopBar } from "@/components/form";
import { getTrip } from "@/lib/db/trips";
import { tripPaymentState } from "@/lib/business/payment";
import {
  cancelTrip,
  confirmTrip,
  markTripCompleted,
  unconfirmTrip,
  updateTrip,
} from "../../actions";

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

      {/* D1 — payment state, derived from amount_paid_cents against the fare.
          Rendered from the union; "Not tracked" reads as absence. */}
      <section
        aria-labelledby="payment-heading"
        className="mt-8 rounded-xl border border-obsidian-line bg-obsidian-graphite p-5 shadow-panel"
      >
        <h2
          id="payment-heading"
          className="text-[11px] font-medium uppercase tracking-[0.18em] text-obsidian-silver"
        >
          Payment
        </h2>
        <div className="mt-2">
          <PaymentStateBadge state={tripPaymentState(trip)} />
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-obsidian-muted">
          Derived from the amount paid against the fare — never stored, so it
          cannot drift. Amount paid is not revenue.
        </p>
      </section>

      {/* S1 — a booked ride can be closed out or canceled from here.
          D1 — and confirmed / unconfirmed. */}
      {trip.status === "scheduled" ? (
        <>
          <TripConfirm
            trip={trip}
            confirmAction={confirmTrip}
            unconfirmAction={unconfirmTrip}
            returnTo={`/trips/${trip.id}/edit`}
          />
          <TripCloseOut
            trip={trip}
            markCompletedAction={markTripCompleted}
            cancelAction={cancelTrip}
          />
        </>
      ) : null}
    </main>
  );
}
