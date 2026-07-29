"use client";

import { useState } from "react";
import { Field, SubmitButton, TextInput } from "@/components/form";
import { formatPickupTime } from "@/lib/business/pickup-time";
import { hasQuotedPrice } from "@/lib/business/trip-status";
import { centsToDollars } from "@/lib/money";
import type { Trip } from "@/lib/types";

/**
 * S1 — closing out a scheduled ride.
 *
 * Two actions on a booked trip:
 *  • Mark completed — requires the FINAL revenue, because this is the moment
 *    the ride starts counting toward revenue/profit/trip totals.
 *  • Cancel — sets status `canceled`. Never a hard delete, so the booking stays
 *    auditable. Two-step confirm, since it changes a real record.
 *
 * Both post to server actions and reuse the shared SubmitButton, so the
 * duplicate-submission guard applies here too.
 */
export function TripCloseOut({
  trip,
  markCompletedAction,
  cancelAction,
  returnTo = "/trips",
}: {
  trip: Trip;
  markCompletedAction: (formData: FormData) => void | Promise<void>;
  cancelAction: (formData: FormData) => void | Promise<void>;
  returnTo?: string;
}) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const pickup = formatPickupTime(trip.start_time);
  // 0 on a scheduled trip means "no price set" — don't prefill a fake 0.00.
  const quoted = hasQuotedPrice(trip) ? centsToDollars(trip.revenue_cents) : "";

  return (
    <section
      aria-labelledby="close-out-heading"
      className="mt-8 rounded-xl border border-obsidian-line bg-obsidian-graphite p-4 shadow-panel"
    >
      <h2
        id="close-out-heading"
        className="text-xs font-medium uppercase tracking-[0.18em] text-obsidian-silver"
      >
        Scheduled ride
      </h2>
      <p className="mt-1 text-[11px] text-obsidian-muted">
        {pickup ? `Pickup ${pickup}. ` : "No pickup time set. "}
        This ride counts toward your totals only once you mark it completed.
      </p>

      <form action={markCompletedAction} className="mt-3">
        <input type="hidden" name="id" value={trip.id} />
        <input type="hidden" name="return_to" value={returnTo} />
        <Field
          label="Final revenue ($)"
          hint="What you actually charged for this ride."
        >
          <TextInput
            name="revenue"
            inputMode="decimal"
            required
            defaultValue={quoted}
            placeholder="240"
          />
        </Field>
        <div className="mt-3">
          <SubmitButton pendingLabel="Completing…">Mark completed</SubmitButton>
        </div>
      </form>

      <div className="mt-4 border-t border-obsidian-line pt-3">
        {confirmingCancel ? (
          <form action={cancelAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={trip.id} />
            <input type="hidden" name="return_to" value={returnTo} />
            <p className="w-full text-[11px] text-obsidian-muted">
              Cancel this ride? It stays on record as canceled and counts toward
              nothing.
            </p>
            <SubmitButton pendingLabel="Canceling…">Yes, cancel ride</SubmitButton>
            <button
              type="button"
              onClick={() => setConfirmingCancel(false)}
              className="rounded-lg border border-obsidian-line px-4 py-2 text-sm text-obsidian-silver transition-colors hover:border-obsidian-cyan hover:text-obsidian-platinum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-black"
            >
              Keep it
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingCancel(true)}
            className="rounded-lg border border-obsidian-line px-4 py-2 text-sm text-obsidian-silver transition-colors hover:border-obsidian-negative hover:text-obsidian-negative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-black"
          >
            Cancel ride
          </button>
        )}
      </div>
    </section>
  );
}
