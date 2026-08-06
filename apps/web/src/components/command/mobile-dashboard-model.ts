import type { NextRideView } from "@/lib/business/command-center";
import type { TripListRow } from "@/lib/db/trips";

type RideView = Exclude<NextRideView<TripListRow>, { kind: "none" }>;

export function requestResponseText(count: number): string | null {
  if (count <= 0) return null;
  return count === 1
    ? "1 request needs a response"
    : `${count} requests need a response`;
}

export function pickupCountdownText(startTime: string | null | undefined, nowMs: number): string | null {
  if (!startTime) return null;
  const pickupMs = new Date(startTime).getTime();
  if (!Number.isFinite(pickupMs)) return null;
  const minutes = Math.ceil((pickupMs - nowMs) / 60_000);
  if (minutes <= 0) return "Pickup due";
  return `Pickup in ${minutes} min`;
}

export function customerContactHref(phone: string | null | undefined, scheme: "tel" | "sms"): string | null {
  if (!phone) return null;
  const normalized = phone.trim().replace(/[^\d+]/g, "");
  const digits = normalized.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 ? `${scheme}:${normalized}` : null;
}

export function ridePrimaryLabel(view: RideView): string {
  if (view.kind === "needs_closing_out") return "Close out ride";
  return view.trip.confirmed_at ? "Complete ride" : "Confirm pickup";
}

export interface ReadinessChecks {
  fuel: boolean | null;
  clean: boolean | null;
  route: boolean | null;
  clientNotified: boolean | null;
}

export function readinessScore(checks: ReadinessChecks | null) {
  const values = checks
    ? Object.values(checks).filter((value): value is boolean => typeof value === "boolean")
    : [];
  return { completed: values.filter(Boolean).length, available: values.length };
}

export function performanceTrend(current: number, previous: number) {
  if (current > previous) return { direction: "up" as const, label: "trending up" };
  if (current < previous) return { direction: "down" as const, label: "trending down" };
  return {
    direction: "flat" as const,
    label: current === 0
      ? "has no comparable revenue yet"
      : "is holding steady",
  };
}
