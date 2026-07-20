/**
 * OBSIDIAN RIDES — core domain types (MVP subset).
 *
 * These mirror the lean data model (ADR-011): Users, Organizations, Customers,
 * Trips, Expenses, Vehicles. As of M3 the Customers/Vehicles/Trips/Expenses
 * tables exist (supabase/migrations/0002_business_tables.sql); these row types
 * match those columns exactly.
 *
 * Money is represented in whole cents (integers) to avoid floating-point drift;
 * cents columns/fields are suffixed `_cents`. Timestamps are ISO-8601 UTC strings.
 */

export type UUID = string;
export type ISODate = string; // e.g. "2026-07-18" or full ISO timestamp
export type Cents = number; // integer minor units, e.g. $240.00 -> 24000

export type MembershipRole = "owner" | "admin" | "manager" | "employee" | "driver";

export type TripType =
  | "airport"
  | "hourly"
  | "event"
  | "prom"
  | "photoshoot"
  | "nightlife"
  | "special_occasion"
  | "other";

export type PaymentMethod =
  | "cash"
  | "zelle"
  | "cashapp"
  | "venmo"
  | "card"
  | "invoice"
  | "other";

export type TripStatus = "completed" | "scheduled" | "canceled";

export type ExpenseCategory =
  | "gas"
  | "tolls"
  | "parking"
  | "cleaning"
  | "maintenance"
  | "supplies"
  | "marketing"
  | "other";

export interface Organization {
  id: UUID;
  name: string;
  created_at: ISODate;
}

export interface User {
  id: UUID;
  email: string;
  created_at: ISODate;
}

export interface Membership {
  id: UUID;
  organization_id: UUID;
  user_id: UUID;
  role: MembershipRole;
  created_at: ISODate;
}

/**
 * A stored customer row (public.customers). Note: `last_booking_date` and
 * `lifetime_revenue` are intentionally NOT here — they are derived by the
 * business engine in M5 (ADR-011), never stored on the row.
 */
export interface Customer {
  id: UUID;
  organization_id: UUID;
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  created_at: ISODate;
}

export interface Vehicle {
  id: UUID;
  organization_id: UUID;
  nickname: string;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  created_at: ISODate;
}

export interface Trip {
  id: UUID;
  organization_id: UUID;
  customer_id?: UUID | null;
  vehicle_id?: UUID | null;
  trip_date: ISODate;
  pickup_location?: string | null;
  dropoff_location?: string | null;
  trip_type?: TripType | null;
  start_time?: ISODate | null;
  end_time?: ISODate | null;
  hours?: number | null;
  hourly_rate_cents?: Cents | null;
  revenue_cents: Cents; // source-of-truth total charged (required; defaults to 0)
  payment_method?: PaymentMethod | null;
  mileage?: number | null;
  notes?: string | null;
  status: TripStatus;
  created_at: ISODate;
}

export interface Expense {
  id: UUID;
  organization_id: UUID;
  trip_id?: UUID | null; // linked expenses count toward estimated trip profit
  expense_date: ISODate;
  category: ExpenseCategory;
  amount_cents: Cents;
  description?: string | null;
  created_at: ISODate;
}
