import { isAbsent } from "@/lib/business/missing";

export type RouteVisualState =
  | "empty"
  | "pickup-only"
  | "destination-only"
  | "complete";

export function deriveRouteVisualState(
  pickup?: string | null,
  dropoff?: string | null,
): RouteVisualState {
  const hasPickup = !isAbsent(pickup);
  const hasDestination = !isAbsent(dropoff);
  if (hasPickup && hasDestination) return "complete";
  if (hasPickup) return "pickup-only";
  if (hasDestination) return "destination-only";
  return "empty";
}
