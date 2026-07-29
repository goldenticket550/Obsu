"use client";

import { useEffect, useRef, useState } from "react";
import {
  orbCopy,
  orbLevel,
  type OrbState as OrbMachineState,
} from "@/lib/business/orb";
import { ProposalCard } from "@/components/proposal-card";

/** The four motion phases the canvas animates. Derived from the state machine. */
type OrbPhase = "idle" | "listening" | "thinking" | "speaking";

/** Placeholder for an absent handler; never reached (see showsProposalCard). */
const noop = (): void => {};

/**
 * @deprecated Legacy phase strings. Retained ONLY so the paused voice
 * component (obsidian-voice.tsx, uncommitted) keeps compiling; V2 replaces
 * that call site with the state machine and this alias goes away. New code
 * passes an OrbState from lib/business/orb.
 */
export type OrbState = OrbPhase;

/** Which motion phase a machine state animates as. One source, no booleans. */
function phaseFor(state: OrbMachineState): OrbPhase {
  switch (state.kind) {
    case "listening":
      return "listening";
    case "speaking":
      return "speaking";
    case "transcribing":
    case "thinking":
    case "executing":
    case "requesting_permission":
      return "thinking";
    default:
      // idle, success, warning, error, offline, action_proposed all rest.
      return "idle";
  }
}

/**
 * Whether the viewer has asked for reduced motion. Read from the media query
 * and kept in sync, so toggling the OS setting takes effect without a reload.
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

/** Maps a legacy phase string onto the machine state it stands for. */
function legacyToState(phase: OrbPhase, level: number): OrbMachineState {
  switch (phase) {
    case "listening":
      return { kind: "listening", level };
    case "speaking":
      return { kind: "speaking", level };
    case "thinking":
      return { kind: "thinking", transcript: "" };
    default:
      return { kind: "idle" };
  }
}

const TONE_CLASS: Record<ReturnType<typeof orbCopy>["tone"], string> = {
  neutral: "text-obsidian-silver",
  active: "text-obsidian-cyan",
  positive: "text-obsidian-positive",
  warning: "text-obsidian-amber",
  danger: "text-obsidian-negative",
};

/**
 * M11 — the OBSIDIAN orb. A canvas cluster of glowing points around a soft
 * core. V1: its ENTIRE appearance derives from one OrbState — the phase it
 * animates, the amplitude it moves to, and the words beneath it all come from
 * that single value. There is no local `isListening`/`hasError` to disagree
 * with it.
 *
 * Accepts a legacy phase string as well, purely for the paused voice
 * component. In that mode the caller supplies its own label, so no caption is
 * rendered here and nothing is duplicated on screen.
 */
export function ObsidianOrb({
  state,
  level = 0,
  onApproveProposal,
  onRejectProposal,
}: {
  state: OrbMachineState | OrbState;
  /** Only used with the legacy string form; union states carry their own. */
  level?: number;
  /** V3: supplied together, or the approval controls are not rendered. */
  onApproveProposal?: (proposalId: string) => void;
  onRejectProposal?: (proposalId: string) => void;
}) {
  const legacy = typeof state === "string";
  const machineState: OrbMachineState = legacy
    ? legacyToState(state, level)
    : state;

  const reducedMotion = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<((now: number) => void) | null>(null);
  const stateRef = useRef<OrbPhase>(phaseFor(machineState));
  const levelRef = useRef<number>(orbLevel(machineState));
  stateRef.current = phaseFor(machineState);
  levelRef.current = orbLevel(machineState);

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
        // Pulse to the real voice amplitude (ElevenLabs onLevel); if there's no
        // amplitude stream (browser-fallback voice, level ~0) breathe a floor.
        const floor = 0.28 + 0.14 * Math.abs(Math.sin(t * 6.5));
        target = Math.max(levelRef.current, floor);
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

      if (!reducedMotion) raf = requestAnimationFrame(frame);
    };

    // V1 spec: respect prefers-reduced-motion. In reduced mode the orb draws a
    // single static frame and communicates state through form, colour and the
    // label instead of a continuous loop. `drawRef` lets the state-change
    // effect below repaint it without ever starting an animation.
    drawRef.current = frame;
    if (reducedMotion) {
      frame(performance.now());
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      drawRef.current = null;
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  // Reduced motion only: repaint once whenever the state actually changes.
  const currentKind = machineState.kind;
  const currentLevel = orbLevel(machineState);
  useEffect(() => {
    if (!reducedMotion) return;
    drawRef.current?.(performance.now());
  }, [reducedMotion, currentKind, currentLevel]);

  const copy = orbCopy(machineState);

  const proposalForCard =
    machineState.kind === "action_proposed" || machineState.kind === "executing"
      ? machineState.proposal
      : null;
  // While executing there is nothing to decide, so the card renders without
  // controls and no handlers are needed.
  const showsProposalCard =
    proposalForCard !== null &&
    (machineState.kind === "executing" ||
      Boolean(onApproveProposal && onRejectProposal));

  return (
    <div className="flex flex-col items-center">
      <canvas ref={canvasRef} className="h-64 w-64 sm:h-72 sm:w-72" aria-hidden />

      {/* Legacy callers render their own label; showing ours too would put two
          status lines on the same screen. */}
      {legacy ? null : (
        <div role="status" className="mt-2 max-w-xs text-center">
          <p className={`text-sm ${TONE_CLASS[copy.tone]}`}>{copy.label}</p>
          {/* A proposal renders its own card below, which already carries the
              summary — repeating it here would say the same thing twice. */}
          {copy.detail && !showsProposalCard ? (
            <p className="mt-0.5 text-xs text-obsidian-muted">{copy.detail}</p>
          ) : null}
        </div>
      )}

      {/* V3 — the real approval interface. `action_proposed` offers the
          decision; `executing` shows the same summary in progress. Controls
          render only when handlers exist, so there is never a dead button. */}
      {showsProposalCard && proposalForCard ? (
        <div className="mt-3 w-full">
          <ProposalCard
            proposal={proposalForCard}
            busy={machineState.kind === "executing"}
            onApprove={onApproveProposal ?? noop}
            onReject={onRejectProposal ?? noop}
          />
        </div>
      ) : null}
    </div>
  );
}
