import styles from "./performance-trend.module.css";
import { performanceTrend } from "./mobile-dashboard-model";

export function PerformanceTrend({ currentRevenueCents, previousRevenueCents }: { currentRevenueCents: number; previousRevenueCents: number }) {
  const trend = performanceTrend(currentRevenueCents, previousRevenueCents);
  return (
    <section className={styles.panel} aria-labelledby="performance-heading">
      <span className={styles.icon} aria-hidden="true">{trend.direction === "up" ? "↗" : trend.direction === "down" ? "↘" : "→"}</span>
      <div>
        <h2 id="performance-heading">Performance {trend.label}</h2>
        <p>Month-to-date revenue compared with the same span last month</p>
      </div>
    </section>
  );
}
