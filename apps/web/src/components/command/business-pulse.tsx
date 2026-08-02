import { formatUsd } from "@/lib/money";

/**
 * U2 — This-Month numbers. Every value is computed by the existing centralized
 * calculations and passed in already formatted or as cents; no math happens
 * here.
 *
 * Profit keeps its "estimate, not audited net income" framing. No trend or
 * comparison is shown, because no equivalent-period figure is computed today —
 * inventing one would be fabrication.
 */
export function BusinessPulse({
  revenueCents,
  expensesCents,
  profitCents,
  marginPercent,
  completedRides,
  averageRideCents,
}: {
  revenueCents: number;
  expensesCents: number;
  profitCents: number;
  /** Null when there is no revenue to divide by. */
  marginPercent: number | null;
  completedRides: number;
  averageRideCents: number;
}) {
  const stats: { label: string; value: string; hint?: string; tone?: "positive" | "negative" }[] = [
    { label: "Revenue", value: formatUsd(revenueCents) },
    { label: "Recorded expenses", value: formatUsd(expensesCents) },
    {
      label: "Est. operating profit",
      value: formatUsd(profitCents),
      hint: "Estimate, not audited net income",
      tone: profitCents < 0 ? "negative" : "positive",
    },
    {
      label: "Profit margin",
      value: marginPercent === null ? "—" : `${marginPercent.toFixed(1)}%`,
      hint: marginPercent === null ? "No revenue yet" : "Of recorded revenue",
    },
    { label: "Completed rides", value: String(completedRides) },
    { label: "Average ride", value: formatUsd(averageRideCents) },
  ];
  const emptyMonth = revenueCents === 0 && expensesCents === 0 && completedRides === 0;


  return (
    <section
      id="business-pulse"
      tabIndex={-1}
      data-scene-surface="pulse"
      aria-labelledby="pulse-heading"
      className="rounded-2xl border border-line bg-surface-raised/70 p-5 shadow-panel transition-colors duration-150 hover:border-accent-soft/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft"
    >
      <h2
        id="pulse-heading"
        className="text-[11px] font-medium uppercase tracking-[0.18em] text-content-secondary"
      >
        Business pulse · this month
      </h2>
      {emptyMonth ? (
        <p className="mt-3 text-sm text-content-secondary">
          Nothing has been recorded this month yet.
        </p>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="min-w-0">
            <dt className="text-[10px] uppercase tracking-[0.14em] text-content-muted">
              {s.label}
            </dt>
            <dd
              className={`mt-1 truncate text-xl font-semibold tabular-nums ${
                s.tone === "negative"
                  ? "text-state-danger"
                  : "text-content-primary"
              }`}
              title={s.value}
            >
              {s.value}
            </dd>
            {s.hint ? (
              <p className="mt-0.5 text-[10px] leading-tight text-content-muted">
                {s.hint}
              </p>
            ) : null}
          </div>
        ))}
      </dl>

      <p className="mt-4 text-[10px] leading-relaxed text-content-muted">
        Scheduled rides are not counted here — a ride starts counting when you
        mark it completed.
      </p>
    </section>
  );
}
