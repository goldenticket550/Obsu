import type {
  AppointmentStatus,
  ServiceCategory,
} from "@/lib/types/beauty";
import type { PaymentMethod } from "@/lib/types";

export const SERVICE_CATEGORIES = [
  "lash_set",
  "lash_fill",
  "bottom_lash",
  "cleansing",
  "removal",
  "brow",
  "lip_filler",
  "other",
] as const satisfies readonly ServiceCategory[];

export const APPOINTMENT_STATUSES = [
  "booked",
  "completed",
  "canceled",
  "no_show",
] as const satisfies readonly AppointmentStatus[];

export const PAYMENT_METHODS = [
  "cash",
  "zelle",
  "cashapp",
  "venmo",
  "card",
  "invoice",
  "other",
] as const satisfies readonly PaymentMethod[];

export function requireEnum<T extends string>(
  value: string,
  allowed: readonly T[],
  label: string,
): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`Select a valid ${label}.`);
  }
  return value as T;
}

export function dollarsToCents(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Enter a valid non-negative dollar amount.");
  }
  const cents = Math.round(amount * 100);
  if (!Number.isSafeInteger(cents)) throw new Error("The dollar amount is too large.");
  return cents;
}

export function positiveInteger(value: FormDataEntryValue | null, label: string): number {
  const parsed = Number(String(value ?? ""));
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive whole number.`);
  }
  return parsed;
}

export function weekday(value: FormDataEntryValue | null): number {
  const parsed = Number(String(value ?? ""));
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 6) {
    throw new Error("Select a valid weekday.");
  }
  return parsed;
}

export function wallTime(value: string): string {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new Error("Enter a valid time.");
  }
  return value;
}

export function uniqueIds(values: string[]): string[] {
  const ids = values.map((value) => value.trim()).filter(Boolean);
  if (new Set(ids).size !== ids.length) {
    throw new Error("A service can only be selected once.");
  }
  return ids;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function requireUuid(value: string, label: string): string {
  if (!UUID.test(value)) throw new Error(`Select a valid ${label}.`);
  return value;
}
export function optionalUuid(value: string | null, label: string): string | null {
  return value == null ? null : requireUuid(value, label);
}
