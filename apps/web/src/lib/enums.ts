import type {
  TripType,
  PaymentMethod,
  TripStatus,
  ExpenseCategory,
} from "@/lib/types";

/**
 * Runtime option lists for the enum columns (M3 migration 0002). Typed as the
 * union so TypeScript keeps them in sync with the types in `./types`.
 */
export const TRIP_TYPES: TripType[] = [
  "airport",
  "hourly",
  "event",
  "prom",
  "photoshoot",
  "nightlife",
  "special_occasion",
  "other",
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  "cash",
  "zelle",
  "cashapp",
  "venmo",
  "card",
  "invoice",
  "other",
];

export const TRIP_STATUSES: TripStatus[] = ["completed", "scheduled", "canceled"];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "gas",
  "tolls",
  "parking",
  "cleaning",
  "maintenance",
  "supplies",
  "marketing",
  "other",
];

/** Human label for an enum value: "special_occasion" -> "Special Occasion". */
export function labelize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
