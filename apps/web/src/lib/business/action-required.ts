import type { Customer, Trip } from "@/lib/types";
import { inactiveCustomers, INACTIVE_THRESHOLD_DAYS } from "./customer-intel";
import { hasQuotedPrice } from "./trip-status";
import { isPastDue } from "./schedule";

/**
 * U2 — Action Required. PURE, deterministic, `now` injected.
 *
 * Every item is derived from data this app already holds. Nothing here makes a
 * subjective judgement about a customer, and nothing invents urgency: if there
 * is nothing wrong, the list is empty and the UI says so in one plain line.
 *
 * Each item states what happened, why it matters, which record it concerns,
 * and exactly one safe next action that links straight to the fix.
 */

/** Lower number = more urgent. Drives both sort order and severity styling. */
export const ACTION_PRIORITY = {
  needs_closing_out: 1,
  missing_revenue: 2,
  missing_customer: 3,
  missing_route: 4,
  quiet_customer: 5,
} as const;

export type ActionKind = keyof typeof ACTION_PRIORITY;

/** Severity maps to the fixed colour semantics: red urgent, amber warning. */
export type ActionSeverity = "urgent" | "warning" | "info";

export interface ActionItem {
  id: string;
  kind: ActionKind;
  priority: number;
  severity: ActionSeverity;
  /** What happened. */
  title: string;
  /** Why it matters, in the owner's terms. */
  detail: string;
  /** The record this concerns. */
  recordLabel: string;
  /** One safe next action. */
  actionLabel: string;
  href: string;
}

const SEVERITY: Record<ActionKind, ActionSeverity> = {
  needs_closing_out: "urgent",
  missing_revenue: "warning",
  missing_customer: "warning",
  missing_route: "info",
  quiet_customer: "info",
};

function tripLabel(trip: Trip, customerName: string | null): string {
  const who = customerName ?? "No customer";
  return `${who} · ${trip.trip_date}`;
}

/**
 * Builds the prioritized list.
 *
 * `customerNameFor` is passed in rather than looked up here so this stays pure
 * and free of any data access.
 */
export function buildActionRequired(
  trips: Trip[],
  customers: Customer[],
  now: Date,
  todayKey: string,
  thresholdDays: number = INACTIVE_THRESHOLD_DAYS,
): ActionItem[] {
  const nameById = new Map(customers.map((c) => [c.id, c.name]));
  const nameFor = (trip: Trip): string | null =>
    trip.customer_id ? nameById.get(trip.customer_id) ?? null : null;

  const items: ActionItem[] = [];

  for (const trip of trips) {
    // 1. Booked, its pickup has passed, still open. It is missing from every
    //    total until it is closed out — the most consequential thing here.
    if (trip.status === "scheduled" && isPastDue(trip, now)) {
      items.push({
        id: `closing-${trip.id}`,
        kind: "needs_closing_out",
        priority: ACTION_PRIORITY.needs_closing_out,
        severity: SEVERITY.needs_closing_out,
        title: "Ride needs closing out",
        detail:
          "The pickup time has passed and this ride is still scheduled, so it is not counted in your revenue yet.",
        recordLabel: tripLabel(trip, nameFor(trip)),
        actionLabel: "Close it out",
        href: `/trips/${trip.id}/edit`,
      });
    }

    // 2. Completed but no money recorded — the total is understated.
    if (trip.status === "completed" && !hasQuotedPrice(trip)) {
      items.push({
        id: `revenue-${trip.id}`,
        kind: "missing_revenue",
        priority: ACTION_PRIORITY.missing_revenue,
        severity: SEVERITY.missing_revenue,
        title: "Completed ride has no revenue",
        detail:
          "This ride is marked completed but has no amount recorded, so your revenue for the month is understated.",
        recordLabel: tripLabel(trip, nameFor(trip)),
        actionLabel: "Add the amount",
        href: `/trips/${trip.id}/edit`,
      });
    }

    // 3. Completed with no customer — it cannot inform repeat-customer insight.
    if (trip.status === "completed" && !trip.customer_id) {
      items.push({
        id: `customer-${trip.id}`,
        kind: "missing_customer",
        priority: ACTION_PRIORITY.missing_customer,
        severity: SEVERITY.missing_customer,
        title: "Completed ride has no customer",
        detail:
          "Without a customer this ride cannot count toward repeat-customer or lifetime-value insight.",
        recordLabel: tripLabel(trip, null),
        actionLabel: "Add the customer",
        href: `/trips/${trip.id}/edit`,
      });
    }

    // 4. Booked but you do not know where it starts or ends.
    if (
      trip.status === "scheduled" &&
      (!trip.pickup_location || !trip.dropoff_location)
    ) {
      items.push({
        id: `route-${trip.id}`,
        kind: "missing_route",
        priority: ACTION_PRIORITY.missing_route,
        severity: SEVERITY.missing_route,
        title: "Scheduled ride is missing pickup or destination",
        detail:
          "This ride is booked without a full route, which makes it harder to plan the day around it.",
        recordLabel: tripLabel(trip, nameFor(trip)),
        actionLabel: "Add the details",
        href: `/trips/${trip.id}/edit`,
      });
    }
  }

  // 5. Repeat customers who have gone quiet — reuses the existing M9 rule
  //    verbatim rather than inventing a second definition of "inactive".
  for (const row of inactiveCustomers(trips, customers, thresholdDays, todayKey)) {
    items.push({
      id: `quiet-${row.customer.id}`,
      kind: "quiet_customer",
      priority: ACTION_PRIORITY.quiet_customer,
      severity: SEVERITY.quiet_customer,
      title: "Repeat customer has gone quiet",
      detail: `${row.name} has ridden with you before but not in ${row.daysSinceLastTrip} days.`,
      recordLabel: row.name,
      actionLabel: "Open customer",
      href: `/customers/${row.customer.id}/edit`,
    });
  }

  // Stable order: priority first, then id, so the list never reshuffles
  // between renders for equally urgent items.
  return items.sort((a, b) =>
    a.priority !== b.priority ? a.priority - b.priority : a.id < b.id ? -1 : 1,
  );
}
