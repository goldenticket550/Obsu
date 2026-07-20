import type { Customer, Trip } from "@/lib/types";

/**
 * Customer-level calcs. PURE, integer cents. Consistent with the revenue
 * definition, these count only completed trips.
 */

const completedForCustomer = (trips: Trip[], customerId: string): Trip[] =>
  trips.filter((t) => t.customer_id === customerId && t.status === "completed");

export function customerLifetimeRevenueCents(
  trips: Trip[],
  customerId: string,
): number {
  return completedForCustomer(trips, customerId).reduce(
    (sum, t) => sum + t.revenue_cents,
    0,
  );
}

export function customerTripCount(trips: Trip[], customerId: string): number {
  return completedForCustomer(trips, customerId).length;
}

export interface CustomerRanking {
  customer: Customer;
  revenueCents: number;
  tripCount: number;
}

/** Customers ranked by lifetime (completed) revenue, highest first, top n. */
export function topCustomers(
  trips: Trip[],
  customers: Customer[],
  n: number,
): CustomerRanking[] {
  return customers
    .map((customer) => ({
      customer,
      revenueCents: customerLifetimeRevenueCents(trips, customer.id),
      tripCount: customerTripCount(trips, customer.id),
    }))
    .sort((a, b) => b.revenueCents - a.revenueCents)
    .slice(0, Math.max(0, n));
}
