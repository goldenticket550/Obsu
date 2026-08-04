"use client";

import { useEffect, useRef, useState } from "react";
import { EclipseIrisCanvas } from "./eclipse-iris-canvas";
import styles from "./eclipse-iris.module.css";
import { irisStatusText, type IrisVisualState } from "@/lib/business/iris";

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
  const rootRef = useRef<HTMLDivElement>(null);
  const level = Number.isFinite(amplitude) ? Math.max(0, Math.min(1, amplitude)) : 0;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const finePointer = window.matchMedia("(pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reset = () => {
      root.style.setProperty("--iris-x", "0");
      root.style.setProperty("--iris-y", "0");
    };
    const move = (event: PointerEvent) => {
      if (!finePointer.matches || reduce.matches || document.visibilityState !== "visible") return;
      const bounds = root.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      root.style.setProperty("--iris-x", Math.max(-1, Math.min(1, x)).toFixed(3));
      root.style.setProperty("--iris-y", Math.max(-1, Math.min(1, y)).toFixed(3));
    };
    root.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerleave", reset, { passive: true });
    finePointer.addEventListener("change", reset);
    reduce.addEventListener("change", reset);
    return () => {
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", reset);
      finePointer.removeEventListener("change", reset);
      reduce.removeEventListener("change", reset);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={styles.root}
      style={{
        ["--iris-size" as string]: `${size}px`,
        ["--iris-level" as string]: String(level),
      }}
      data-visual={visual}
      data-focused={focused ? "true" : "false"}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-has-signal={level > 0.015 ? "true" : "false"}
    >
      <div className={styles.fallback} aria-hidden="true" />
      <EclipseIrisCanvas
        visual={visual}
        amplitude={level}
        reducedMotion={reducedMotion}
      />
      <div className={styles.core} aria-hidden="true" />
      <div className={styles.rim} aria-hidden="true" />
      <span className="sr-only" role="status">
        Eclipse Iris: {irisStatusText(visual)}
      </span>
    </div>
  );
}
