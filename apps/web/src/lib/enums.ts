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
/**
 * An enum value as plain words, lower case: `special_occasion` → "special
 * occasion". THE base normalization — every display form derives from this one,
 * so a chip and a sentence can never disagree about what a value is called.
 */
export function enumWords(value: string): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/_+/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Title Case, for chips, table cells and headings — anywhere the value stands
 * on its own rather than inside a sentence.
 *
 * Derived from `enumWords`, not implemented separately. For the mid-sentence
 * form (and the proper-noun constraint that comes with it) see
 * `lib/business/trip-type.ts`.
 */
export function labelize(value: string): string {
  return enumWords(value).replace(/\b\w/g, (c) => c.toUpperCase());
}
