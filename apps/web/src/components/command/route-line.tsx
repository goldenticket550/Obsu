import Link from "next/link";
import {
  deriveRouteVisualState,
  type RouteVisualState,
} from "./route-visual-state";
import styles from "./route-line.module.css";

export type { RouteVisualState };
export { deriveRouteVisualState };

export function RouteLine({ pickup, dropoff, editHref }: {
  pickup?: string | null;
  dropoff?: string | null;
  editHref: string;
}) {
  const state = deriveRouteVisualState(pickup, dropoff);
  if (state === "empty") {
    return (
      <div className={styles.empty} data-route-state="empty">
        <div>
          <p className={styles.emptyTitle}>Route details are not set</p>
          <p className={styles.emptyCopy}>Add pickup and destination before a route appears here.</p>
        </div>
        <Link href={editHref} className={styles.routeAction}>Add route details</Link>
      </div>
    );
  }

  const from = pickup?.trim() || "Pickup not set";
  const to = dropoff?.trim() || "Destination not set";
  const missingLabel = state === "pickup-only" ? "Add destination" : "Add pickup";
  return (
    <div className={styles.route} data-route-state={state}>
      <p className="sr-only">{`Route: from ${from} to ${to}. Schematic only, not a map.`}</p>
      <svg className={`${styles.ribbon} ${styles[state]}`} viewBox="0 0 520 72" preserveAspectRatio="none" aria-hidden="true" focusable="false" role="presentation">
        <path className={styles.ribbonBloom} d="M8 38 C105 4 158 66 264 35 S414 12 512 34" />
        <path className={styles.ribbonLine} d="M8 38 C105 4 158 66 264 35 S414 12 512 34" />
        <circle className={styles.endpoint} cx="8" cy="38" r="4" />
        <circle className={styles.endpoint} cx="512" cy="34" r="4" />
      </svg>
      <div className={styles.endpoints}>
        <div className={styles.endpointCopy}><span>Pickup</span><strong title={from}>{from}</strong></div>
        <div className={`${styles.endpointCopy} ${styles.endpointCopyRight}`}><span>Destination</span><strong title={to}>{to}</strong></div>
      </div>
      {state !== "complete" ? <Link href={editHref} className={styles.routeAction}>{missingLabel}</Link> : null}
    </div>
  );
}
