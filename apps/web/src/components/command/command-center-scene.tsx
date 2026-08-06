"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import type { RouteVisualState } from "./route-line";
import styles from "./command-center-scene.module.css";

const FAR_WINDOWS = [
  [116, 88, 3, 2],
  [157, 72, 2, 2],
  [233, 96, 3, 2],
  [302, 66, 2, 2],
  [368, 84, 3, 2],
  [449, 61, 2, 2],
  [516, 91, 3, 2],
  [612, 70, 2, 2],
  [704, 88, 3, 2],
  [786, 64, 2, 2],
  [872, 82, 3, 2],
] as const;

const NEAR_WINDOWS = [
  [74, 102, 4, 2],
  [130, 83, 3, 2],
  [194, 112, 4, 2],
  [267, 73, 3, 2],
  [341, 102, 4, 2],
  [407, 82, 3, 2],
  [482, 111, 4, 2],
  [558, 76, 3, 2],
  [641, 105, 4, 2],
  [728, 85, 3, 2],
  [812, 108, 4, 2],
  [913, 79, 3, 2],
] as const;

function CitySilhouette({ reflection = false }: { reflection?: boolean }) {
  return (
    <svg
      className={reflection ? styles.reflectionArt : styles.skylineArt}
      viewBox="0 0 1000 180"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
      role="presentation"
    >
      <g className={styles.farCity}>
        <path d="M0 180V125h45v-18h42v11h50V91h46v27h54V105h41V78h50v40h47V99h54V70h42v48h62V94h41v24h55V82h48v36h54V101h45V73h48v45h61V96h47v22h55v62Z" />
        {FAR_WINDOWS.map(([x, y, width, height]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={width} height={height} />
        ))}
      </g>
      <g className={styles.nearCity}>
        <path d="M0 180V146h34v-27h52v27h45V102h38v44h63V126h45V92h53v54h42V111h57v35h50V86h47v60h59v-34h38v34h68V99h48v47h48v-29h57v29h49V91h52v55h55V117h42v29h53v34Z" />
        {NEAR_WINDOWS.map(([x, y, width, height]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={width} height={height} />
        ))}
      </g>
    </svg>
  );
}

function AtmosphericBackdrop() {
  return (
    <div className={styles.atmosphere} aria-hidden="true">
      <div className={styles.sky} />
      <div className={styles.horizonGlow} />
      <CitySilhouette />
      <div className={styles.rainFar} />
      <div className={styles.rainNear} />
      <div className={styles.reflectionZone}>
        <CitySilhouette reflection />
      </div>
      <div className={styles.routeGlow} />
      <div className={styles.attentionGlow} />
      <div className={styles.focusGlow} />
      <div className={styles.contentVeil} />
      <div className={styles.grain} />
      <div className={styles.vignette} />
    </div>
  );
}

export function CommandCenterScene({
  children,
  hasAttention,
  routeState,
  primaryColor,
  secondaryColor,
}: {
  children: ReactNode;
  hasAttention: boolean;
  routeState: RouteVisualState;
  primaryColor: string;
  secondaryColor: string;
}) {
  const theme = {
    "--workspace-primary": primaryColor,
    "--workspace-secondary": secondaryColor,
  } as CSSProperties;
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let bounds = scene.getBoundingClientRect();

    const reset = () => {
      scene.style.setProperty("--scene-x", "0");
      scene.style.setProperty("--scene-y", "0");
    };

    const updateBounds = () => {
      bounds = scene.getBoundingClientRect();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (document.visibilityState !== "visible") return;
      if (!finePointer.matches) return;
      if (reducedMotion.matches) return;
      if (bounds.width <= 0 || bounds.height <= 0) return;

      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      scene.style.setProperty("--scene-x", Math.max(-1, Math.min(1, x)).toFixed(3));
      scene.style.setProperty("--scene-y", Math.max(-1, Math.min(1, y)).toFixed(3));
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") reset();
    };

    scene.addEventListener("pointerenter", updateBounds, { passive: true });
    scene.addEventListener("pointermove", onPointerMove, { passive: true });
    scene.addEventListener("pointerleave", reset, { passive: true });
    window.addEventListener("resize", updateBounds);
    document.addEventListener("visibilitychange", onVisibilityChange);
    finePointer.addEventListener("change", reset);
    reducedMotion.addEventListener("change", reset);

    return () => {
      scene.removeEventListener("pointerenter", updateBounds);
      scene.removeEventListener("pointermove", onPointerMove);
      scene.removeEventListener("pointerleave", reset);
      window.removeEventListener("resize", updateBounds);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      finePointer.removeEventListener("change", reset);
      reducedMotion.removeEventListener("change", reset);
    };
  }, []);

  return (
    <div
      ref={sceneRef}
      className={styles.scene}
      data-has-attention={hasAttention ? "true" : "false"}
      data-route-state={routeState}
      style={theme}
    >
      <AtmosphericBackdrop />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
