"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./eclipse-iris.module.css";
import motion from "./eclipse-iris-enhancements.module.css";
import {
  DIAL_LAYER_A,
  DIAL_LAYER_B,
  irisStatusText,
  type DialRing,
  type IrisVisualState,
} from "@/lib/business/iris";

const WING_MARKS = [
  { d: "M30 74h18", opacity: 0.36 },
  { d: "M34 62h14", opacity: 0.52 },
  { d: "M42 49h12", opacity: 0.68 },
  { d: "M56 37h10", opacity: 0.42 },
  { d: "M254 37h10", opacity: 0.42 },
  { d: "M266 49h12", opacity: 0.68 },
  { d: "M272 62h14", opacity: 0.52 },
  { d: "M272 74h18", opacity: 0.36 },
] as const;

const HALO_NODES = [0, 1, 2, 3, 4, 5, 6, 7] as const;

function cx(...parts: (string | undefined | false)[]): string {
  return parts.filter((part): part is string => Boolean(part)).join(" ");
}

function DialLayer({
  rings,
  className,
  motionClassName,
  titleId,
}: {
  rings: readonly DialRing[];
  className: string | undefined;
  motionClassName: string | undefined;
  titleId: string;
}) {
  return (
    <div className={cx(styles.dialLayer, className, motion.dialLayer, motionClassName)}>
      <svg
        className={styles.dialSvg}
        viewBox="0 0 100 100"
        aria-hidden="true"
        focusable="false"
        role="presentation"
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
            style={{ ["--iris-ring-opacity" as string]: String(ring.o) }}
          />
        ))}
      </svg>
    </div>
  );
}

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
  focused = false,
  amplitude = 0,
}: {
  visual: IrisVisualState;
  size?: number;
  focused?: boolean;
  amplitude?: number;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const instanceId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const status = irisStatusText(visual);
  const level = Number.isFinite(amplitude) ? Math.max(0, Math.min(1, amplitude)) : 0;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const finePointer = window.matchMedia("(pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const reset = () => {
      root.style.setProperty("--iris-x", "0");
      root.style.setProperty("--iris-y", "0");
    };
    const move = (event: PointerEvent) => {
      if (document.visibilityState !== "visible") return;
      if (!finePointer.matches) return;
      if (reduced.matches) return;
      const bounds = root.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      root.style.setProperty("--iris-x", Math.max(-1, Math.min(1, x)).toFixed(3));
      root.style.setProperty("--iris-y", Math.max(-1, Math.min(1, y)).toFixed(3));
    };
    const visibility = () => {
      if (document.visibilityState !== "visible") reset();
    };

    root.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerleave", reset, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    finePointer.addEventListener("change", reset);
    reduced.addEventListener("change", reset);
    return () => {
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", reset);
      document.removeEventListener("visibilitychange", visibility);
      finePointer.removeEventListener("change", reset);
      reduced.removeEventListener("change", reset);
    };
  }, []);

  const stateClass =
    visual === "working"
      ? styles.working
      : visual === "attention"
        ? styles.attention
        : visual === "unavailable"
          ? styles.unavailable
          : undefined;
  const motionStateClass =
    visual === "working"
      ? motion.working
      : visual === "attention"
        ? motion.attention
        : visual === "unavailable"
          ? motion.unavailable
          : motion.ready;
  const wingGradientId = `${instanceId}-wing-gradient`;

  return (
    <div
      ref={rootRef}
      className={cx(
        styles.root,
        motion.root,
        stateClass,
        motionStateClass,
        focused && motion.focused,
        reducedMotion && styles.stillness,
        reducedMotion && motion.stillness,
      )}
      style={{
        ["--iris-size" as string]: `${size}px`,
        ["--iris-level" as string]: String(level),
      }}
      data-visual={visual}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-focused={focused ? "true" : "false"}
      data-has-signal={level > 0.015 ? "true" : "false"}
    >
      <div className={motion.instrumentHalo} aria-hidden="true">
        <div className={motion.haloRingA} />
        <div className={motion.haloRingB} />
        <div className={motion.haloRingC} />
        <div className={motion.haloTicks} />
        <div className={motion.haloNodes}>
          {HALO_NODES.map((node) => (
            <span
              key={node}
              className={motion.haloNode}
              style={{ ["--halo-node" as string]: String(node) }}
            />
          ))}
        </div>
      </div>

      <svg
        className={motion.wings}
        viewBox="0 0 320 160"
        aria-hidden="true"
        focusable="false"
        role="presentation"
      >
        <defs>
          <linearGradient id={wingGradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="currentColor" stopOpacity="0" />
            <stop offset="0.28" stopColor="currentColor" stopOpacity="0.72" />
            <stop offset="0.5" stopColor="currentColor" stopOpacity="0.24" />
            <stop offset="0.72" stopColor="currentColor" stopOpacity="0.72" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className={motion.wingBloom} d="M18 91C32 29 84 9 126 34" />
        <path className={motion.wingBloom} d="M302 91C288 29 236 9 194 34" />
        <path className={motion.wingArc} d="M18 91C32 29 84 9 126 34" stroke={`url(#${wingGradientId})`} />
        <path className={motion.wingArc} d="M302 91C288 29 236 9 194 34" stroke={`url(#${wingGradientId})`} />
        {WING_MARKS.map((mark) => (
          <path
            key={mark.d}
            className={motion.wingMark}
            d={mark.d}
            opacity={mark.opacity}
          />
        ))}
      </svg>

      <div className={cx(styles.ambientGlow, motion.ambientGlow)} aria-hidden="true" />
      <div className={styles.sphere} aria-hidden="true">
        <DialLayer
          rings={DIAL_LAYER_A}
          className={styles.dialA}
          motionClassName={motion.dialA}
          titleId={`${instanceId}-dial-a`}
        />
        <DialLayer
          rings={DIAL_LAYER_B}
          className={styles.dialB}
          motionClassName={motion.dialB}
          titleId={`${instanceId}-dial-b`}
        />
        <div className={cx(styles.coreBloom, motion.coreBloom)} />
        <div className={cx(styles.core, motion.core)} />
        <div className={styles.gloss} />
        <div className={styles.terminator} />
        <div className={cx(styles.specular, motion.specular)} />
        <div className={styles.rim} />
      </div>
      <div className={styles.lanceBloom} aria-hidden="true" />
      <div className={styles.lance} aria-hidden="true" />
      <div className={cx(styles.floorBounce, motion.floorBounce)} aria-hidden="true" />
      <span className={cx("sr-only", styles.statusText)} role="status">{status}</span>
    </div>
  );
}
