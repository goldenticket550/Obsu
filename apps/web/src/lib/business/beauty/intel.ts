import type { Customer } from "@/lib/types";
import type { Appointment } from "@/lib/types/beauty";
import { localDateKey, localDateTimeParts } from "./timezone";

const completed = (appointment: Appointment) => appointment.status === "completed";

export function beautyMonthRevenueCents(appointments: Appointment[], asOfDate: Date, timeZone = "America/New_York"): number {
  const month = localDateTimeParts(asOfDate, timeZone);
  return appointments.filter((appointment) => {
    if (!completed(appointment)) return false;
    const local = localDateTimeParts(new Date(appointment.starts_at), timeZone);
    return local.year === month.year && local.month === month.month;
  }).reduce((sum, appointment) => sum + appointment.price_cents, 0);
}

export function upcomingAppointments(appointments: Appointment[], asOfDate: Date): Appointment[] {
  return appointments.filter((appointment) => appointment.status === "booked" && new Date(appointment.starts_at) >= asOfDate).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

export function balanceDueCents(appointment: Appointment): number {
  return Math.max(0, appointment.price_cents + (appointment.late_fee_cents ?? 0) - (appointment.amount_paid_cents ?? 0));
}

export function isMissingAddOn(appointment: Appointment): boolean {
  const lines = appointment.appointment_services ?? [];
  const primary = lines.find((line) => line.service_id === appointment.service_id);
  const isBestieDeal = primary?.name.trim().toLowerCase().startsWith("bestie deal") ?? false;
  return isBestieDeal && !lines.some((line) => line.category === "bottom_lash");
}

export interface FillDueClient { customer: Customer; lastServiceAt: string; daysSince: number; }
function calendarDaysBetween(later: string, earlier: string): number {
  return Math.floor((new Date(`${later}T00:00:00Z`).getTime() - new Date(`${earlier}T00:00:00Z`).getTime()) / 86_400_000);
}

export function fillsDueClients(customers: Customer[], appointments: Appointment[], asOfDate: Date, thresholdDays = 21, timeZone = "America/New_York"): FillDueClient[] {
  const visitsByClient = new Map<string, Appointment[]>();
  for (const appointment of appointments) {
    if (!appointment.client_id || !completed(appointment)) continue;
    const isLashVisit = (appointment.appointment_services ?? []).some((line) => line.category === "lash_set" || line.category === "lash_fill");
    if (!isLashVisit) continue;
    visitsByClient.set(appointment.client_id, [...(visitsByClient.get(appointment.client_id) ?? []), appointment]);
  }
  const asOfKey = localDateKey(asOfDate, timeZone);
  return customers.flatMap((customer) => {
    const visits = visitsByClient.get(customer.id) ?? [];
    if (visits.length < 2) return [];
    const last = visits.sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0]!;
    const daysSince = calendarDaysBetween(asOfKey, localDateKey(new Date(last.starts_at), timeZone));
    return daysSince > thresholdDays ? [{ customer, lastServiceAt: last.starts_at, daysSince }] : [];
  }).sort((a, b) => b.daysSince - a.daysSince);
}
