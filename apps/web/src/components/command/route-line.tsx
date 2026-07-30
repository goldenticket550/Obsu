/**
 * U2 — a schematic connection between pickup and destination.
 *
 * This is a STYLIZED DIAGRAM, not a map. There is no geography, no routing, no
 * GPS, and no moving vehicle — the app has no location data and must not imply
 * that it does. It is decorative structure around two text labels, so it is
 * marked aria-hidden and the accessible description lives in the text itself.
 */
import { absenceLabel, isAbsent } from "@/lib/business/missing";

export function RouteLine({
  pickup,
  dropoff,
}: {
  pickup?: string | null;
  dropoff?: string | null;
}) {
  // One vocabulary for absence — "Not set" means "should exist, doesn't yet",
  // which is actionable, and is never rendered as if it were data.
  const from = isAbsent(pickup) ? `Pickup ${absenceLabel("not_set").toLowerCase()}` : pickup!.trim();
  const to = isAbsent(dropoff)
    ? `Destination ${absenceLabel("not_set").toLowerCase()}`
    : dropoff!.trim();

  return (
    <div className="mt-4">
      {/* One accessible sentence describing the two ends. */}
      <p className="sr-only">{`Route: from ${from} to ${to}. Schematic only, not a map.`}</p>

      <div aria-hidden="true" className="flex items-stretch gap-3">
        {/* The schematic rail */}
        <div className="flex w-4 shrink-0 flex-col items-center pt-1">
          <span className="h-2 w-2 rounded-full ring-2 ring-accent/30 bg-accent" />
          <span className="my-1 w-px flex-1 bg-gradient-to-b from-accent/60 to-accent-soft/30" />
          <span className="h-2 w-2 rounded-full border border-accent-soft bg-transparent" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-content-primary" title={from}>
            {from}
          </p>
          <p
            className={`mt-6 truncate text-sm ${
              dropoff ? "text-content-primary" : "text-content-muted"
            }`}
            title={to}
          >
            {to}
          </p>
        </div>
      </div>
    </div>
  );
}
