import Link from "next/link";
import { RouteLine } from "./route-line";
import { TripQuickActions } from "./trip-quick-actions";
import { cancelTrip, markTripCompleted } from "@/app/trips/actions";
import {
  closeOutCopy,
  nextRideHeadline,
  shortRideId,
  timeUntilLabel,
  type NextRideView,
} from "@/lib/business/command-center";
import {
  businessDayLabelParts,
  joinBusinessDayLabel,
  tripDayKey,
} from "@/lib/business/schedule";
import { formatPickupTime } from "@/lib/business/pickup-time";
import { hasQuotedPrice } from "@/lib/business/trip-status";
import { centsToDollars } from "@/lib/money";
import { labelize } from "@/lib/enums";
import type { TripListRow } from "@/lib/db/trips";

/**
 * U2 — Next Ride, the centerpiece.
 *
 * Shows ONLY fields that exist in the schema today. Payment status, balance,
 * passenger count, confirmation state, driver assignment and special
 * instructions are deliberately absent — they do not exist yet (phase D1) and
 * stubbing them would be fabrication.
 */

function Meta({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-[0.14em] text-obsidian-muted">
        {label}
      </dt>
      <dd
        className={`truncate text-sm ${
          muted ? "text-obsidian-muted" : "text-obsidian-platinum"
        }`}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function Shell({
  tone = "normal",
  children,
}: {
  tone?: "normal" | "alert";
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby="next-ride-heading"
      className={`rounded-2xl border bg-gradient-to-b from-obsidian-graphite to-obsidian-black p-5 shadow-panel ${
        tone === "alert" ? "border-obsidian-negative/50" : "border-obsidian-line"
      }`}
    >
      {children}
    </section>
  );
}

export function NextRide({
  view,
  now,
}: {
  view: NextRideView<TripListRow>;
  /** Injected so day labels are deterministic — no ambient clock read here. */
  now: Date;
}) {
  if (view.kind === "none") {
    return (
      <Shell>
        <h2
          id="next-ride-heading"
          className="text-[11px] font-medium uppercase tracking-[0.18em] text-obsidian-silver"
        >
          Next ride
        </h2>
        <p className="mt-3 text-sm text-obsidian-silver">
          Nothing scheduled. Book a ride and it appears here.
        </p>
        <div className="mt-4">
          <Link
            href="/trips/new?status=scheduled"
            className="inline-flex min-h-[44px] items-center rounded-lg bg-obsidian-blue px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-black"
          >
            Schedule a ride
          </Link>
        </div>
      </Shell>
    );
  }

  const trip = view.trip;
  const overdue = view.kind === "needs_closing_out";
  const pickupTime = formatPickupTime(trip.start_time);
  const priced = hasQuotedPrice(trip);

  // All business-day display text comes from the one formatter (F1).
  const dayLabel = businessDayLabelParts(tripDayKey(trip), now);
  const dayLabelText = joinBusinessDayLabel(dayLabel);

  // Headline + reason copy come from the tested business layer; this component
  // only renders them.
  const headline = nextRideHeadline(trip.customer?.name, dayLabel);

  // Status line: never colour alone — each state carries its own words.
  const statusLine = overdue
    ? closeOutCopy(view.reason)
    : view.sameDay
      ? view.msUntil !== null
        ? `Departs ${timeUntilLabel(view.msUntil)}`
        : "No pickup time set"
      : "No more rides today · next is later";

  return (
    <Shell tone={overdue ? "alert" : "normal"}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2
          id="next-ride-heading"
          className="text-[11px] font-medium uppercase tracking-[0.18em] text-obsidian-silver"
        >
          {overdue ? "Needs closing out" : "Next ride"}
        </h2>
        <span className="font-mono text-[11px] tabular-nums text-obsidian-muted">
          {shortRideId(trip.id)}
        </span>
      </div>

      <div className="mt-3">
        <p className="text-3xl font-semibold text-obsidian-platinum">{headline}</p>
        <p
          className={`mt-1 text-sm ${
            overdue ? "text-obsidian-negative" : "text-obsidian-cyan"
          }`}
        >
          {statusLine}
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* "No time set" belongs here, in the time field — never the headline. */}
        <Meta
          label="Pickup"
          value={pickupTime ?? "No time set"}
          muted={!pickupTime}
        />
        <Meta
          label="Type"
          value={trip.trip_type ? labelize(trip.trip_type) : "Not set"}
          muted={!trip.trip_type}
        />
        <Meta
          label="Fare"
          value={priced ? `$${centsToDollars(trip.revenue_cents)}` : "No price set"}
          muted={!priced}
        />
        {/* Formatted business-day label — never a raw YYYY-MM-DD. */}
        <Meta label="Day" value={dayLabelText} />
      </dl>

      <RouteLine pickup={trip.pickup_location} dropoff={trip.dropoff_location} />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link
          href={`/trips/${trip.id}/edit`}
          className="inline-flex min-h-[44px] items-center rounded-lg bg-obsidian-blue px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-black"
        >
          View ride
        </Link>
        <TripQuickActions
          trip={trip}
          markCompletedAction={markTripCompleted}
          cancelAction={cancelTrip}
          returnTo="/"
        />
      </div>
    </Shell>
  );
}
