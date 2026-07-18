/**
 * OBSIDIAN RIDES — core domain types (MVP subset).
 *
 * These mirror the lean data model (ADR-011): Users, Organizations, Customers,
 * Trips, Expenses, Vehicles. They document the shape of the data now and give
 * later phases strong typing to build against. The actual database tables +
 * migrations land in M3; generated Supabase types will complement these then.
 *
 * Money is represented in whole cents (integers) to avoid floating-point drift.
 * Timestamps are ISO-8601 UTC strings.
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

export interface Customer {
  id: UUID;
  organization_id: UUID;
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  created_at: ISODate;
  // Derived by the business engine (M5), not trusted as raw stored truth:
  last_booking_date?: ISODate | null;
  lifetime_revenue?: Cents | null;
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
  hourly_rate?: Cents | null;
  revenue: Cents;
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
  amount: Cents;
  description?: string | null;
  created_at: ISODate;
}
