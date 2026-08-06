"use client";

import { useEffect, useState } from "react";
import { pickupCountdownText } from "./mobile-dashboard-model";

export function PickupCountdown({ startTime, initialNow }: { startTime: string | null | undefined; initialNow: string }) {
  const initialMs = new Date(initialNow).getTime();
  const [nowMs, setNowMs] = useState(initialMs);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const text = pickupCountdownText(startTime, nowMs);
  return text ? <p className="mt-1 text-sm font-medium text-[color:var(--workspace-secondary)]" aria-live="polite">{text}</p> : null;
}
