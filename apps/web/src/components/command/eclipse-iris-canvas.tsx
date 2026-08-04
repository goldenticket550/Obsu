"use client";

import { useEffect, useRef } from "react";
import type { IrisVisualState } from "@/lib/business/iris";

type Particle = {
  longitude: number;
  latitude: number;
  radius: number;
  size: number;
  speed: number;
  blue: boolean;
};

type Orbit = { radiusX: number; radiusY: number; rotation: number; phase: number; start: number; length: number; opacity: number };

const TAU = Math.PI * 2;

function seeded(index: number, salt: number): number {
  const value = Math.sin(index * 91.731 + salt * 37.113) * 43758.5453;
  return value - Math.floor(value);
}

function buildParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, index) => ({
    longitude: seeded(index, 1) * TAU,
    latitude: Math.acos(2 * seeded(index, 2) - 1) - Math.PI / 2,
    radius: 0.52 + seeded(index, 3) * 0.48 + (seeded(index, 13) - 0.5) * 0.09,
    size: 0.38 + seeded(index, 4) * 1.9,
    speed: 0.45 + seeded(index, 5) * 0.9,
    blue: index % 61 === 0,
  }));
}

const ORBITS: Orbit[] = Array.from({ length: 7 }, (_, index) => ({
  radiusX: 0.61 + seeded(index, 6) * 0.31,
  radiusY: 0.22 + seeded(index, 7) * 0.28,
  rotation: seeded(index, 8) * Math.PI,
  phase: seeded(index, 9) * TAU,
  start: seeded(index, 10) * TAU,
  length: Math.PI * (1.08 + seeded(index, 11) * 0.72),
  opacity: 0.16 + seeded(index, 12) * 0.16,
}));

function stateSpeed(visual: IrisVisualState): number {
  if (visual === "working") return 1.75;
  if (visual === "attention") return 1.4;
  if (visual === "unavailable") return 0;
  return 0.55;
}

export function EclipseIrisCanvas({
  visual,
  amplitude,
  reducedMotion,
}: {
  visual: IrisVisualState;
  amplitude: number;
  reducedMotion: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const amplitudeRef = useRef(amplitude);
  amplitudeRef.current = amplitude;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext?.("2d");
    if (!canvas || !context) return;

    const narrow = window.matchMedia("(max-width: 767px)").matches;
    const particles = buildParticles(narrow ? 260 : 430);
    let frame = 0;
    let visible = document.visibilityState === "visible";
    let intersecting = true;
    let startedAt = performance.now();

    let cssWidth = 1;
    let cssHeight = 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      cssWidth = Math.max(1, rect.width);
      cssHeight = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      const width = cssWidth;
      const height = cssHeight;
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.445;
      const signal = Math.max(0, Math.min(1, amplitudeRef.current));
      const speed = reducedMotion ? 0 : stateSpeed(visual);
      const time = ((now - startedAt) / 1000) * speed;

      context.clearRect(0, 0, width, height);

      const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius);
      glow.addColorStop(0, `rgba(255, 247, 214, ${0.98 + signal * 0.02})`);
      glow.addColorStop(0.08, "rgba(255, 213, 106, 0.96)");
      glow.addColorStop(0.2, "rgba(255, 181, 47, 0.58)");
      glow.addColorStop(0.42, "rgba(255, 181, 47, 0.16)");
      glow.addColorStop(0.72, "rgba(255, 181, 47, 0.045)");
      glow.addColorStop(1, "rgba(255, 181, 47, 0)");
      context.fillStyle = glow;
      context.beginPath();
      context.arc(centerX, centerY, baseRadius * (0.9 + signal * 0.08), 0, TAU);
      context.fill();

      context.save();
      context.translate(centerX, centerY);
      context.globalCompositeOperation = "screen";
      for (const orbit of ORBITS) {
        context.save();
        context.rotate(orbit.rotation + time * 0.018);
        context.beginPath();
        context.ellipse(0, 0, baseRadius * orbit.radiusX, baseRadius * orbit.radiusY, orbit.phase, orbit.start, orbit.start + orbit.length);
        context.strokeStyle = `rgba(255, 181, 47, ${orbit.opacity})`;
        context.lineWidth = 0.45 + orbit.opacity;
        context.stroke();
        context.restore();
      }

      const projected = particles.map((particle, index) => {
        const longitude = particle.longitude + time * 0.16 * particle.speed;
        const cosLat = Math.cos(particle.latitude);
        const x = Math.cos(longitude) * cosLat * particle.radius;
        const y = Math.sin(particle.latitude) * particle.radius;
        const z = Math.sin(longitude) * cosLat;
        return { particle, index, x, y, z };
      }).sort((a, b) => a.z - b.z);

      for (const point of projected) {
        const perspective = 0.76 + (point.z + 1) * 0.2;
        const x = point.x * baseRadius * perspective;
        const y = point.y * baseRadius * perspective;
        const alpha = (0.16 + (point.z + 1) * 0.31) * (0.72 + seeded(point.index, 14) * 0.5);
        const pulse = 1 + signal * (point.index % 9 === 0 ? 1.4 : 0.35);
        context.fillStyle = point.particle.blue
          ? `rgba(53, 194, 255, ${Math.min(1, alpha + signal * 0.35)})`
          : `rgba(255, ${181 + Math.round((point.z + 1) * 23)}, 47, ${alpha})`;
        context.beginPath();
        context.arc(x, y, point.particle.size * perspective * pulse, 0, TAU);
        context.fill();

        if (point.z > 0.55 && point.index % 23 === 0) {
          context.shadowColor = point.particle.blue ? "rgba(53, 194, 255, 0.45)" : "rgba(255, 213, 106, 0.5)";
          context.shadowBlur = 5 * perspective;
          context.fill();
          context.shadowBlur = 0;
        }

        if (point.z > 0.4 && point.index % 71 === 0) {
          context.strokeStyle = `rgba(255, 225, 143, ${alpha * 0.72})`;
          context.lineWidth = 0.7;
          context.beginPath();
          context.moveTo(x - 2.8 * perspective, y);
          context.lineTo(x + 2.8 * perspective, y);
          context.moveTo(x, y - 2.8 * perspective);
          context.lineTo(x, y + 2.8 * perspective);
          context.stroke();
        }
      }
      context.restore();

      if (!reducedMotion && visible && intersecting && visual !== "unavailable") {
        frame = requestAnimationFrame(draw);
      }
    };

    const onVisibility = () => {
      visible = document.visibilityState === "visible";
      cancelAnimationFrame(frame);
      if (visible && intersecting && !reducedMotion && visual !== "unavailable") {
        startedAt = performance.now();
        frame = requestAnimationFrame(draw);
      } else {
        draw(performance.now());
      }
    };

    const observer = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(([entry]) => {
          intersecting = entry?.isIntersecting ?? false;
          cancelAnimationFrame(frame);
          if (intersecting && visible && !reducedMotion && visual !== "unavailable") {
            startedAt = performance.now();
            frame = requestAnimationFrame(draw);
          }
        }, { rootMargin: "80px" });

    observer?.observe(canvas);
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    resizeObserver?.observe(canvas);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    resize();
    draw(performance.now());

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reducedMotion, visual]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="eclipse-iris-canvas"
    />
  );
}
