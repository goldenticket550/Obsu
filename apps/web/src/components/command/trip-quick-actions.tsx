"use client";

import { useState } from "react";
import { SubmitButton, TextInput } from "@/components/form";
import { hasQuotedPrice } from "@/lib/business/trip-status";
import { centsToDollars } from "@/lib/money";
import type { Trip } from "@/lib/types";

/**
 * U2 — "Mark completed" and "Cancel ride" for the Next Ride card.
 *
 * These reuse the EXACT S1/S2 server actions (markTripCompleted, cancelTrip)
 * and their rules: completing always asks for the final revenue, cancelling
 * always confirms first, and neither invents a new status transition. The
 * shared SubmitButton keeps the duplicate-submission guard in place.
 */
export function TripQuickActions({
  trip,
  markCompletedAction,
  cancelAction,
  returnTo,
}: {
  trip: Trip;
  markCompletedAction: (formData: FormData) => void | Promise<void>;
  cancelAction: (formData: FormData) => void | Promise<void>;
  returnTo: string;
}) {
  const [mode, setMode] = useState<"idle" | "complete" | "cancel">("idle");
  const priced = hasQuotedPrice(trip);

  const secondary =
    "inline-flex min-h-[44px] items-center rounded-lg border border-obsidian-line px-4 text-sm text-obsidian-silver transition-colors hover:border-obsidian-cyan hover:text-obsidian-platinum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-black";

  if (mode === "idle") {
    return (
      <>
        <button type="button" onClick={() => setMode("complete")} className={secondary}>
          Mark completed
        </button>
        <button type="button" onClick={() => setMode("cancel")} className={secondary}>
          Cancel ride
        </button>
      </>
    );
  }

  if (mode === "complete") {
    return (
      <form action={markCompletedAction} className="w-full">
        <input type="hidden" name="id" value={trip.id} />
        <input type="hidden" name="return_to" value={returnTo} />
        <label
          htmlFor={`next-ride-revenue-${trip.id}`}
          className="block text-[10px] uppercase tracking-[0.14em] text-obsidian-muted"
        >
          Final revenue ($)
        </label>
        <div className="mt-1 max-w-[220px]">
          <TextInput
            id={`next-ride-revenue-${trip.id}`}
            name="revenue"
            inputMode="decimal"
            required
            autoFocus
            defaultValue={priced ? centsToDollars(trip.revenue_cents) : ""}
            placeholder="240"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <SubmitButton pendingLabel="Completing…">Complete ride</SubmitButton>
          <button type="button" onClick={() => setMode("idle")} className={secondary}>
            Back
          </button>
        </div>
      </form>
    );
  }

  return (
    <form action={cancelAction} className="w-full">
      <input type="hidden" name="id" value={trip.id} />
      <input type="hidden" name="return_to" value={returnTo} />
      <p className="text-[11px] text-obsidian-muted">
        Cancel this ride? It stays on record as canceled and counts toward nothing.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <SubmitButton pendingLabel="Canceling…">Yes, cancel ride</SubmitButton>
        <button type="button" onClick={() => setMode("idle")} className={secondary}>
          Keep it
        </button>
      </div>
    </form>
  );
}
