"use client";

import { useEffect, useRef } from "react";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

/**
 * M11 — the OBSIDIAN orb. A canvas cluster of glowing cyan points around a soft
 * core on the graphite background. State drives the motion: idle breathes,
 * listening reacts to live mic amplitude (`level`), thinking shimmers, speaking
 * pulses. State/level are read through refs so the animation loop never
 * restarts on re-render.
 */
export function ObsidianOrb({
  state,
  level,
}: {
  state: OrbState;
  level: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<OrbState>(state);
  const levelRef = useRef<number>(level);
  stateRef.current = state;
  levelRef.current = level;

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const ctx = canvasEl.getContext("2d");
    if (!ctx) return;

    const N = 56;
    const points = Array.from({ length: N }, (_, i) => ({
      angle: (i / N) * Math.PI * 2,
      radius: 0.82 + Math.random() * 0.18,
      speed: 0.2 + Math.random() * 0.35,
      phase: Math.random() * Math.PI * 2,
    }));

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = canvasEl.clientWidth || 256;
      canvasEl.width = size * dpr;
      canvasEl.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let energy = 0;
    const start = performance.now();

    const frame = (now: number) => {
      const t = (now - start) / 1000;
      const size = canvasEl.clientWidth || 256;
      const cx = size / 2;
      const cy = size / 2;
      const st = stateRef.current;

      let target: number;
      if (st === "listening") {
        target = Math.min(1, levelRef.current);
      } else if (st === "speaking") {
        target =
          0.35 +
          0.4 * Math.abs(Math.sin(t * 7)) +
          0.15 * Math.abs(Math.sin(t * 13.3));
      } else if (st === "thinking") {
        target = 0.16 + 0.09 * (0.5 + 0.5 * Math.sin(t * 3));
      } else {
        target = 0.08 + 0.05 * (0.5 + 0.5 * Math.sin(t * 1.1)); // idle breathe
      }
      energy += (target - energy) * 0.12;

      const base = size * 0.2;
      const R = base * (1 + energy * 0.6);

      ctx.clearRect(0, 0, size, size);

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 2.2);
      glow.addColorStop(0, `rgba(56,189,248,${0.26 + energy * 0.4})`);
      glow.addColorStop(0.5, `rgba(56,189,248,${0.07 + energy * 0.15})`);
      glow.addColorStop(1, "rgba(56,189,248,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(231,233,238,${0.45 + energy * 0.45})`;
      ctx.beginPath();
      ctx.arc(cx, cy, base * 0.26 * (1 + energy * 0.5), 0, Math.PI * 2);
      ctx.fill();

      const rot = t * 0.16;
      for (const p of points) {
        const wob = Math.sin(t * p.speed + p.phase) * 0.06;
        const rr = R * (p.radius + wob + energy * 0.16);
        const ang = p.angle + rot;
        const x = cx + Math.cos(ang) * rr;
        const y = cy + Math.sin(ang) * rr;
        const dot = size * 0.01 * (1 + energy * 0.8);
        ctx.fillStyle = `rgba(56,189,248,${0.45 + energy * 0.45})`;
        ctx.beginPath();
        ctx.arc(x, y, dot, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="h-64 w-64 sm:h-72 sm:w-72" aria-hidden />;
}
