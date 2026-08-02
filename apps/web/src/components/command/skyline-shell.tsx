import type { ReactNode } from "react";
import styles from "./skyline-shell.module.css";
import type { ActionKind } from "@/lib/business/action-required";
import { attentionPillText, skylineSubline } from "@/lib/business/skyline";

/**
 * Skyline Command — the page chrome. Server components; no state, no clock.
 *
 * `now` is passed in so the 4:00 AM business day is decided in one place and
 * the server and client cannot disagree about which day it is.
 */

/**
 * The fixed background wash. Sits behind everything at z-index 0; `SkylineMain`
 * lifts the content above it.
 *
 * Rendered as two empty elements because both layers are pure decoration —
 * they carry no text, so they are invisible to assistive technology by having
 * nothing to announce.
 */
export function SkylineAtmosphere() {
  return (
    <>
      <div className={styles.atmos} aria-hidden />
      <div className={styles.horizon} aria-hidden />
    </>
  );
}

/** Lifts page content above the fixed atmosphere layers. */
export function SkylineMain({ children }: { children: ReactNode }) {
  return <div className={styles.content}>{children}</div>;
}

export function SkylineTopBar({
  businessName,
  now,
  actionItems,
}: {
  /**
   * From the organization record. Null renders an EMPTY eyebrow rather than a
   * literal — this app never hard-codes a business name, and a placeholder
   * would be a name the operator did not choose.
   */
  businessName: string | null;
  now: Date;
  /** The same array Action Required renders and the orb reads. */
  actionItems: readonly { kind: ActionKind }[];
}) {
  const pill = attentionPillText(actionItems);

  return (
    <header className={styles.topbar}>
      <div>
        <p className={`${styles.eyebrow} text-content-muted`}>
          <span className={styles.eyebrowDot} aria-hidden />
          {businessName ?? ""}
        </p>
        <h1 className={`${styles.title} text-content-primary`}>Command Center</h1>
        <p className={`${styles.subline} text-content-secondary`}>
          {skylineSubline(now)}
        </p>
      </div>

      {/* Zero renders NOTHING — an empty slot is not a status. */}
      {pill ? (
        <div className={styles.topbarRight}>
          <span className={`${styles.pill} text-state-warning-strong`}>
            <span className={styles.pillDot} aria-hidden />
            {pill}
          </span>
        </div>
      ) : null}
    </header>
  );
}

/** The 12-column grid. Collapses to one column at the reference's 1180px. */
export function SkylineGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

export function SkylineMainColumn({ children }: { children: ReactNode }) {
  return <div className={styles.spanMain}>{children}</div>;
}

export function SkylineSideColumn({ children }: { children: ReactNode }) {
  return <div className={styles.spanSide}>{children}</div>;
}

/** Mobile-first semantic order, rearranged into the cinematic desktop grid. */
export function SkylineCommandLayout({ children }: { children: ReactNode }) {
  return <div className={styles.commandLayout}>{children}</div>;
}

export function SkylineHeaderArea({ children }: { children: ReactNode }) {
  return <div className={styles.areaHeader}>{children}</div>;
}
export function SkylineAttentionArea({ children }: { children: ReactNode }) {
  return <div className={styles.areaAttention}>{children}</div>;
}
export function SkylineRideArea({ children }: { children: ReactNode }) {
  return <div className={styles.areaRide}>{children}</div>;
}
export function SkylineIntelligenceArea({ children }: { children: ReactNode }) {
  return <div className={styles.areaIntelligence}>{children}</div>;
}
export function SkylineFlowArea({ children }: { children: ReactNode }) {
  return <div className={styles.areaFlow}>{children}</div>;
}
export function SkylinePulseArea({ children }: { children: ReactNode }) {
  return <div className={styles.areaPulse}>{children}</div>;
}

/**
 * Panel chrome: the gradient, radius, border and the one-pixel top highlight.
 * Border colour comes from the `border-line` token, not from the module.
 */
export function SkylinePanel({
  children,
  className = "",
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  /**
   * Id of the heading that names this panel. Declared explicitly rather than
   * spreading rest props: an `aria-labelledby` passed to a component that does
   * not forward it is dropped silently, and the section loses its accessible
   * name with nothing failing to say so.
   */
  labelledBy?: string;
}) {
  return (
    <section
      className={`${styles.panel} border-line ${className}`}
      aria-labelledby={labelledBy}
    >
      {children}
    </section>
  );
}
