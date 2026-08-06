import type { Appointment, TimeOff, WorkingHours } from "@/lib/types/beauty";
import { assertValidTimeZone, localDateKey, localDateTimeParts } from "./timezone";

export type ConflictReason = "invalid_range" | "appointment" | "outside_hours" | "time_off";
export interface ConflictResult { valid: boolean; reason?: ConflictReason; }
const overlaps = (a: Date, b: Date, c: Date, d: Date) => a < d && b > c;
function timeMinutes(value: string): number { const match = /^(\d{2}):(\d{2})/.exec(value); return match ? Number(match[1]) * 60 + Number(match[2]) : Number.NaN; }
function weekday(date: Date, timeZone: string): number { const value = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date); return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(value); }

export function checkAppointmentConflict(input: { startsAt: Date; endsAt: Date; timezone: string; appointments: Appointment[]; workingHours: WorkingHours[]; timeOff: TimeOff[]; excludeAppointmentId?: string; }): ConflictResult {
  const { startsAt, endsAt } = input;
  assertValidTimeZone(input.timezone);
  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || !(startsAt < endsAt)) return { valid: false, reason: "invalid_range" };
  if (input.appointments.some((appointment) => appointment.id !== input.excludeAppointmentId && appointment.status !== "canceled" && overlaps(startsAt, endsAt, new Date(appointment.starts_at), new Date(appointment.ends_at)))) return { valid: false, reason: "appointment" };
  if (input.timeOff.some((block) => overlaps(startsAt, endsAt, new Date(block.starts_at), new Date(block.ends_at)))) return { valid: false, reason: "time_off" };
  const start = localDateTimeParts(startsAt, input.timezone);
  const end = localDateTimeParts(endsAt, input.timezone);
  const sameLocalDay = localDateKey(startsAt, input.timezone) === localDateKey(endsAt, input.timezone);
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;
  const day = weekday(startsAt, input.timezone);
  const withinHours = sameLocalDay && input.workingHours.some((hours) => {
    const opens = timeMinutes(hours.start_time), closes = timeMinutes(hours.end_time);
    return hours.weekday === day && Number.isFinite(opens) && Number.isFinite(closes) && startMinutes >= opens && endMinutes <= closes;
  });
  return withinHours ? { valid: true } : { valid: false, reason: "outside_hours" };
}
