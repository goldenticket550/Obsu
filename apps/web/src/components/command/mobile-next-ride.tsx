import Link from "next/link";
import { confirmTrip } from "@/app/trips/actions";
import { formatPickupTime } from "@/lib/business/pickup-time";
import { tripTypeHeading } from "@/lib/business/trip-type";
import type { NextRideView } from "@/lib/business/command-center";
import type { TripListRow } from "@/lib/db/trips";
import { PickupCountdown } from "./pickup-countdown";
import surfaces from "./mobile-next-ride.module.css";
import { customerContactHref, ridePrimaryLabel } from "./mobile-dashboard-model";

type RideView = Exclude<NextRideView<TripListRow>, { kind: "none" }>;


function ContactAction({ href, label, icon }: { href: string | null; label: string; icon: string }) {
  const className = surfaces.contactAction;
  return href ? (
    <a href={href} className={className} aria-label={`${label} customer`}>
      <span aria-hidden="true">{icon}</span><span>{label}</span>
    </a>
  ) : (
    <span className={`${className} ${surfaces.contactDisabled}`} aria-disabled="true">
      <span aria-hidden="true">{icon}</span><span>{label}</span>
      <span className="sr-only"> unavailable</span>
    </span>
  );
}

export function MobileNextRide({ view, now }: { view: RideView; now: Date }) {
  const trip = view.trip;
  const name = trip.customer?.name?.trim() || "Scheduled ride";
  const pickup = formatPickupTime(trip.start_time) ?? "Time not set";
  const tel = customerContactHref(trip.customer?.phone, "tel");
  const sms = customerContactHref(trip.customer?.phone, "sms");
  const route = trip.pickup_location || trip.dropoff_location
    ? `${trip.pickup_location ?? "Pickup not set"} → ${trip.dropoff_location ?? "Destination not set"}`
    : "Route not set";
  const primaryLabel = ridePrimaryLabel(view);
  const canConfirm = view.kind === "upcoming" && !trip.confirmed_at;

  return (
    <section aria-labelledby="next-ride-heading" className={surfaces.mobileRideShell}>
      <div className={surfaces.vehicleMonogram} aria-hidden="true">
        <svg viewBox="0 0 64 36" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 25h48M13 25l4-12h28l7 12M20 13l5-6h16l4 6" />
          <circle cx="19" cy="27" r="4" /><circle cx="47" cy="27" r="4" />
        </svg>
      </div>

      <div className={surfaces.mobileRideBody}>
        <div className={surfaces.rideHeadlineRow}>
          <h2 id="next-ride-heading">{name}</h2>
          <span aria-hidden="true">•</span>
          <strong>{pickup}</strong>
        </div>
        {view.kind === "upcoming" ? <PickupCountdown startTime={trip.start_time} initialNow={now.toISOString()} /> : (
          <p className="mt-1 text-sm text-state-danger">Pickup time has passed</p>
        )}

        <div className={surfaces.rideChips}>
          {trip.trip_type ? <span>{tripTypeHeading(trip.trip_type)}</span> : null}
          {trip.passenger_count ? <span>{trip.passenger_count} {trip.passenger_count === 1 ? "guest" : "guests"}</span> : null}
        </div>
        <p className={surfaces.mobileRoute}>{route}</p>
      </div>

      <div className={surfaces.mobileRideActions}>
        <ContactAction href={sms} label="Text" icon="▱" />
        <ContactAction href={tel} label="Call" icon="⌁" />
        {canConfirm ? (
          <form action={confirmTrip}>
            <input type="hidden" name="id" value={trip.id} />
            <input type="hidden" name="return_to" value="/" />
            <button type="submit" className={surfaces.ridePrimary}>{primaryLabel} <span aria-hidden="true">›</span></button>
          </form>
        ) : (
          <Link href={`/trips/${trip.id}/edit`} className={surfaces.ridePrimary}>{primaryLabel} <span aria-hidden="true">›</span></Link>
        )}
      </div>
    </section>
  );
}
