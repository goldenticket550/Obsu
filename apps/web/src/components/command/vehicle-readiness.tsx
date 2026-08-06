import styles from "./vehicle-readiness.module.css";
import { readinessScore, type ReadinessChecks } from "./mobile-dashboard-model";

export function VehicleReadiness({ vehicleDescription, checks }: { vehicleDescription: string | null; checks: ReadinessChecks | null }) {
  const score = readinessScore(checks);
  const items = checks ? [
    ["Fuel", checks.fuel],
    ["Clean", checks.clean],
    ["Route", checks.route],
    ["Client notified", checks.clientNotified],
  ] as const : [];

  return (
    <section className={styles.readiness} aria-labelledby="vehicle-readiness-heading">
      <span className={styles.shield} aria-hidden="true">✓</span>
      <div className={styles.summary}>
        <h2 id="vehicle-readiness-heading">{vehicleDescription || "Vehicle"}</h2>
        <p>{score.available > 0 ? `${score.completed}/${score.available} readiness checks complete` : "Readiness checks not tracked"}</p>
      </div>
      {score.available > 0 ? (
        <ul>
          {items.map(([label, ready]) => typeof ready === "boolean" ? (
              <li key={label} data-ready={ready ? "true" : "false"}>
                <span aria-hidden="true">{ready ? "✓" : "○"}</span>{label}
              </li>
            ) : null,
          )}
        </ul>
      ) : <span className={styles.unavailable}>Unavailable</span>}
    </section>
  );
}
