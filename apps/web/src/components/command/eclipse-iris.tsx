"use client";

import { useEffect, useId, useState } from "react";
import styles from "./eclipse-iris.module.css";
import {
  DIAL_LAYER_A,
  DIAL_LAYER_B,
  irisStatusText,
  type DialRing,
  type IrisVisualState,
} from "@/lib/business/iris";

/**
 * Gate 1 — the Eclipse Iris orb.
 *
 * Pure CSS and inline SVG. No image, no canvas, no WebGL, no new dependency.
 *
 * The layer stack, outermost first. The sphere clips its contents, so the
 * lance and the floor bounce are its SIBLINGS, not its children — inside, the
 * border-radius would shear them off at the edge.
 *
 *   1 ambient glow · 2 sphere body · 3 dial layers A/B (counter-rotating)
 *   4 core bloom · 5 core · 6 gloss · 7 terminator · 8 specular · 9 rim
 *   10 lance bloom · 11 lance · 12 floor bounce
 *
 * The orb is DECORATIVE. It is `aria-hidden`; the status beside it is the
 * information, and it is text, so it survives colour-blindness, zero motion,
 * and a screen reader.
 */

/**
 * CSS-module keys are `string | undefined` under `noUncheckedIndexedAccess`.
 * Joining them raw would put the literal "undefined" into a class attribute, so
 * absent keys are dropped rather than stringified.
 */
function cx(...parts: (string | undefined | false)[]): string {
  return parts.filter((part): part is string => Boolean(part)).join(" ");
}

/** Renders one dial layer. Geometry comes from fixed literals — never random. */
function DialLayer({
  rings,
  className,
  titleId,
}: {
  rings: readonly DialRing[];
  className: string | undefined;
  titleId: string;
}) {
  return (
    <div className={cx(styles.dialLayer, className)}>
      <svg
        className={styles.dialSvg}
        viewBox="0 0 100 100"
        aria-hidden
        focusable="false"
        role="presentation"
        // The id is unique per instance via useId, so two orbs on one page
        // cannot collide — a generated string would break hydration.
        id={titleId}
      >
        {rings.map((ring) => (
          <circle
            key={`${ring.r}-${ring.w}`}
            cx={50}
            cy={50}
            r={ring.r}
            fill="none"
            stroke={`rgba(125, 211, 252, ${ring.o})`}
            strokeWidth={ring.w}
            {...(ring.dash ? { strokeDasharray: ring.dash } : {})}
            // Lets the amber treatment restyle the stroke without restating
            // each ring's opacity.
            style={{ ["--iris-ring-opacity" as string]: String(ring.o) }}
          />
        ))}
      </svg>
    </div>
  );
}

/**
 * Reads the viewer's reduced-motion preference and keeps it current, so
 * toggling the OS setting takes effect without a reload.
 *
 * Starts false and corrects after mount: the server cannot know the
 * preference, and guessing would produce a hydration mismatch. The CSS media
 * query stops the animations regardless — this class is belt and braces, and
 * is what the tests assert against.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export function EclipseIris({
  visual,
  size = 196,
}: {
  visual: IrisVisualState;
  /** Rendered size in px. The lance is 168% of this and stays contained. */
  size?: number;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const instanceId = useId();
  const status = irisStatusText(visual);

  const stateClass =
    visual === "working"
      ? styles.working
      : visual === "attention"
        ? styles.attention
        : visual === "unavailable"
          ? styles.unavailable
          : undefined;

  return (
    <div
      className={cx(styles.root, stateClass, reducedMotion && styles.stillness)}
      style={{ ["--iris-size" as string]: `${size}px` }}
      data-visual={visual}
      data-reduced-motion={reducedMotion ? "true" : "false"}
    >
      {/* 1 */}
      <div className={styles.ambientGlow} aria-hidden />

      {/* 2 — clips 3 through 9 */}
      <div className={styles.sphere} aria-hidden>
        {/* 3 */}
        <DialLayer
          rings={DIAL_LAYER_A}
          className={styles.dialA}
          titleId={`${instanceId}-dial-a`}
        />
        <DialLayer
          rings={DIAL_LAYER_B}
          className={styles.dialB}
          titleId={`${instanceId}-dial-b`}
        />
        {/* 4 */}
        <div className={styles.coreBloom} />
        {/* 5 */}
        <div className={styles.core} />
        {/* 6 */}
        <div className={styles.gloss} />
        {/* 7 */}
        <div className={styles.terminator} />
        {/* 8 */}
        <div className={styles.specular} />
        {/* 9 */}
        <div className={styles.rim} />
      </div>

      {/* 10, 11, 12 — outside the sphere, or the clip would cut them */}
      <div className={styles.lanceBloom} aria-hidden />
      <div className={styles.lance} aria-hidden />
      <div className={styles.floorBounce} aria-hidden />

      {/* The information. Announced politely; never colour or motion alone. */}
      <span className="sr-only" role="status">
        {status}
      </span>
    </div>
  );
}
