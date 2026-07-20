import type { Customer, Expense, Trip } from "@/lib/types";

/**
 * Test-only factories: build full domain rows with sensible defaults so unit
 * tests can override just the fields under test. Not imported by app code.
 */

let seq = 0;
const nextId = (prefix: string): string => `${prefix}-${++seq}`;

export function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: nextId("trip"),
    organization_id: "org-1",
    customer_id: null,
    vehicle_id: null,
    trip_date: "2026-07-15",
    pickup_location: null,
    dropoff_location: null,
    trip_type: null,
    start_time: null,
    end_time: null,
    hours: null,
    hourly_rate_cents: null,
    revenue_cents: 0,
    payment_method: null,
    mileage: null,
    notes: null,
    status: "completed",
    created_at: "2026-07-15T00:00:00Z",
    ...overrides,
  };
}

export function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: nextId("exp"),
    organization_id: "org-1",
    trip_id: null,
    expense_date: "2026-07-15",
    category: "other",
    amount_cents: 0,
    description: null,
    created_at: "2026-07-15T00:00:00Z",
    ...overrides,
  };
}

export function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: nextId("cust"),
    organization_id: "org-1",
    name: "Customer",
    phone: null,
    email: null,
    notes: null,
    created_at: "2026-07-15T00:00:00Z",
    ...overrides,
  };
}
