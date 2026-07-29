"use client";

import { useState } from "react";
import Link from "next/link";
import { SubmitButton, TextInput } from "@/components/form";
import { formatPickupTime } from "@/lib/business/pickup-time";
import { hasQuotedPrice } from "@/lib/business/trip-status";
import { centsToDollars } from "@/lib/money";
import { labelize } from "@/lib/enums";
import type { Trip } from "@/lib/types";

/**
 * S2 — one booked ride in the Upcoming list.
 *
 * Row actions are inline disclosures rather than navigations, because closing
 * out a ride is the thing the owner does most and it should not cost a page
 * load. "Mark completed" always asks for the final revenue (prefilled from the
 * quote when there is one) since that is the moment the money becomes real.
 *
 * A ride with no price set renders an explicit "No price set" — never $0.00.
 */
export function UpcomingTripRow({
  trip,
  customerName,
  markCompletedAction,
  cancelAction,
  returnTo,
  overdue = false,
}: {
  trip: Trip;
  customerName: string | null;
  markCompletedAction: (formData: FormData) => void | Promise<void>;
  cancelAction: (formData: FormData) => void | Promise<void>;
  returnTo: string;
  overdue?: boolean;
}) {
  const [mode, setMode] = useState<"idle" | "complete" | "cancel">("idle");

  const pickup = formatPickupTime(trip.start_time);
  const priced = hasQuotedPrice(trip);
  const route = [trip.pickup_location, trip.dropoff_location]
    .filter((part): part is string => !!part)
    .join(" → ");

  const actionClass =
    "min-h-[44px] rounded-lg border border-obsidian-line px-3 py-2 text-xs text-obsidian-silver transition-colors hover:border-obsidian-cyan hover:text-obsidian-platinum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-black";

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-medium text-obsidian-platinum">
              {pickup ?? "No time set"}
            </span>
            <span className="text-obsidian-silver">
              {customerName ?? "No customer"}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-obsidian-muted">
            {trip.trip_type ? labelize(trip.trip_type) : "Ride"}
            {route ? ` · ${route}` : ""}
          </p>
        </div>

        {/* Price, or an honest statement that none is set. */}
        <p className="shrink-0 text-right text-sm tabular-nums">
          {priced ? (
            <span className="font-semibold text-obsidian-platinum">
              ${centsToDollars(trip.revenue_cents)}
            </span>
          ) : (
            <span className="text-[11px] text-obsidian-muted">No price set</span>
          )}
        </p>
      </div>

      {mode === "idle" ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={() => setMode("complete")} className={actionClass}>
            Mark completed
          </button>
          <Link href={`/trips/${trip.id}/edit`} className={actionClass}>
            Edit
          </Link>
          <button type="button" onClick={() => setMode("cancel")} className={actionClass}>
            Cancel
          </button>
        </div>
      ) : null}

      {mode === "complete" ? (
        <form action={markCompletedAction} className="mt-3">
          <input type="hidden" name="id" value={trip.id} />
          <input type="hidden" name="return_to" value={returnTo} />
          <label
            htmlFor={`revenue-${trip.id}`}
            className="block text-xs font-medium uppercase tracking-wider text-obsidian-silver"
          >
            Final revenue ($)
          </label>
          <TextInput
            id={`revenue-${trip.id}`}
            name="revenue"
            inputMode="decimal"
            required
            autoFocus
            defaultValue={priced ? centsToDollars(trip.revenue_cents) : ""}
            placeholder="240"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <SubmitButton pendingLabel="Completing…">Complete ride</SubmitButton>
            <button type="button" onClick={() => setMode("idle")} className={actionClass}>
              Back
            </button>
          </div>
        </form>
      ) : null}

      {mode === "cancel" ? (
        <form action={cancelAction} className="mt-3">
          <input type="hidden" name="id" value={trip.id} />
          <input type="hidden" name="return_to" value={returnTo} />
          <p className="text-[11px] text-obsidian-muted">
            Cancel this ride? It stays on record as canceled and counts toward
            nothing.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <SubmitButton pendingLabel="Canceling…">Yes, cancel ride</SubmitButton>
            <button type="button" onClick={() => setMode("idle")} className={actionClass}>
              Keep it
            </button>
          </div>
        </form>
      ) : null}

      {overdue ? (
        <p className="mt-2 text-[11px] text-obsidian-negative">
          Pickup time has passed — close it out so it counts.
        </p>
      ) : null}
    </li>
  );
}
