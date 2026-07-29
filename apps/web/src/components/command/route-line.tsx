/**
 * U2 — a schematic connection between pickup and destination.
 *
 * This is a STYLIZED DIAGRAM, not a map. There is no geography, no routing, no
 * GPS, and no moving vehicle — the app has no location data and must not imply
 * that it does. It is decorative structure around two text labels, so it is
 * marked aria-hidden and the accessible description lives in the text itself.
 */
export function RouteLine({
  pickup,
  dropoff,
}: {
  pickup?: string | null;
  dropoff?: string | null;
}) {
  const from = pickup ?? "Pickup not set";
  const to = dropoff ?? "Destination not set";

  return (
    <div className="mt-4">
      {/* One accessible sentence describing the two ends. */}
      <p className="sr-only">{`Route: from ${from} to ${to}. Schematic only, not a map.`}</p>

      <div aria-hidden="true" className="flex items-stretch gap-3">
        {/* The schematic rail */}
        <div className="flex w-4 shrink-0 flex-col items-center pt-1">
          <span className="h-2 w-2 rounded-full ring-2 ring-obsidian-blue/30 bg-obsidian-blue" />
          <span className="my-1 w-px flex-1 bg-gradient-to-b from-obsidian-blue/60 to-obsidian-cyan/30" />
          <span className="h-2 w-2 rounded-full border border-obsidian-cyan bg-transparent" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-obsidian-platinum" title={from}>
            {from}
          </p>
          <p
            className={`mt-6 truncate text-sm ${
              dropoff ? "text-obsidian-platinum" : "text-obsidian-muted"
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
