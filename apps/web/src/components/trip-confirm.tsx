import { SubmitButton } from "@/components/form";
import { formatBusinessDateTime } from "@/lib/business/pickup-time";
import type { Trip } from "@/lib/types";

/**
 * D1 — confirmation state for a booked ride.
 *
 * confirmed_at is a timestamp, so once confirmed we can say WHEN. Unconfirmed
 * is presented NEUTRALLY: most rides are simply not confirmed yet, and styling
 * that as a warning would make the list cry wolf.
 *
 * Confirming is reversible — "Undo" clears confirmed_at back to NULL.
 */
export function TripConfirm({
  trip,
  confirmAction,
  unconfirmAction,
  returnTo,
}: {
  trip: Trip;
  confirmAction: (formData: FormData) => void | Promise<void>;
  unconfirmAction: (formData: FormData) => void | Promise<void>;
  returnTo: string;
}) {
  const confirmed = !!trip.confirmed_at;

  return (
    <section
      aria-labelledby="confirm-heading"
      className="mt-4 rounded-xl border border-obsidian-line bg-obsidian-graphite p-5 shadow-panel"
    >
      <h2
        id="confirm-heading"
        className="text-[11px] font-medium uppercase tracking-[0.18em] text-obsidian-silver"
      >
        Confirmation
      </h2>

      <p className="mt-1 text-[11px] text-obsidian-muted">
        {confirmed && trip.confirmed_at
          ? `Confirmed ${formatBusinessDateTime(trip.confirmed_at)}.`
          : "Not confirmed yet. That's normal — confirm it once the customer has."}
      </p>

      <form
        action={confirmed ? unconfirmAction : confirmAction}
        className="mt-3"
      >
        <input type="hidden" name="id" value={trip.id} />
        <input type="hidden" name="return_to" value={returnTo} />
        <SubmitButton pendingLabel={confirmed ? "Undoing…" : "Confirming…"}>
          {confirmed ? "Undo confirmation" : "Mark confirmed"}
        </SubmitButton>
      </form>
    </section>
  );
}
