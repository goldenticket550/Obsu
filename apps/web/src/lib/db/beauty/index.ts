import { checkAppointmentConflict } from "@/lib/business/beauty/conflicts";
import { createSupabaseServerClient } from "../supabase-server";
import { getCurrentOrgId } from "../org";
import { assertOrgWriteAllowed } from "../org-access";
import type { Customer, PaymentMethod } from "@/lib/types";
import type { Appointment, AppointmentStatus, BeautyClientDetails, Service, TimeOff, WorkingHours } from "@/lib/types/beauty";

const db = () => createSupabaseServerClient();

export interface BeautyProfile {
  display_name?: string | null;
  timezone: string;
  primary_color?: string | null;
  secondary_color?: string | null;
  settings?: Record<string, unknown> | null;
}

async function rows<T>(table: string, order = "created_at", ascending = false): Promise<T[]> {
  const { data, error } = await db().from(table).select("*").order(order, { ascending });
  if (error) throw error;
  return (data ?? []) as T[];
}

export const listServices = () => rows<Service>("services", "sort_order", true);
export async function getService(id: string): Promise<Service | null> {
  const { data, error } = await db().from("services").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Service | null;
}
export async function listAppointments(): Promise<Appointment[]> {
  const { data, error } = await db().from("appointments").select("*, client:customers(name,phone), appointment_services(*)").order("starts_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Appointment[];
}
export async function getAppointment(id: string): Promise<Appointment | null> {
  const { data, error } = await db().from("appointments").select("*, client:customers(name,phone), appointment_services(*)").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as Appointment | null;
}
export const listWorkingHours = () => rows<WorkingHours>("working_hours", "weekday", true);
export const listTimeOff = () => rows<TimeOff>("time_off", "starts_at", true);

export async function getBeautyProfile(): Promise<BeautyProfile> {
  const organizationId = await getCurrentOrgId();
  const { data, error } = await db().from("business_profile").select("display_name,timezone,primary_color,secondary_color,settings").eq("organization_id", organizationId).maybeSingle();
  if (error) throw error;
  return { ...(data as BeautyProfile | null), timezone: (data as BeautyProfile | null)?.timezone || "America/New_York" };
}

export async function listBeautyClients(): Promise<(Customer & { beauty_client_details: BeautyClientDetails | null })[]> {
  const { data, error } = await db().from("customers").select("*, beauty_client_details(*)").order("name");
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => {
    const relation = row.beauty_client_details;
    return { ...row, beauty_client_details: Array.isArray(relation) ? relation[0] ?? null : relation ?? null } as Customer & { beauty_client_details: BeautyClientDetails | null };
  });
}

export async function getBeautyClient(id: string): Promise<(Customer & { beauty_client_details: BeautyClientDetails[]; appointments: Appointment[] }) | null> {
  const { data, error } = await db().from("customers").select("*, beauty_client_details(*), appointments(*, appointment_services(*))").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as (Customer & { beauty_client_details: BeautyClientDetails[]; appointments: Appointment[] }) | null;
}

type DirectBeautyTable = "services" | "working_hours" | "time_off";
export async function guardedWrite(table: DirectBeautyTable, operation: "insert" | "update" | "delete", payload: Record<string, unknown>, id?: string) {
  const supabase = db();
  const organizationId = await getCurrentOrgId();
  await assertOrgWriteAllowed(supabase, organizationId);
  if (operation === "insert") {
    const { data, error } = await supabase.from(table).insert({ ...payload, organization_id: organizationId }).select("id").single();
    if (error) throw error;
    return data as { id: string };
  }
  if (!id) throw new Error("A record id is required.");
  const query = operation === "update" ? supabase.from(table).update(payload).eq("id", id) : supabase.from(table).delete().eq("id", id);
  const { error } = await query;
  if (error) throw error;
  return null;
}

function migrationError(error: { code?: string; message: string }): Error {
  if (error.code === "42883" || /save_beauty_(appointment|client)/i.test(error.message) && /not find|does not exist/i.test(error.message)) {
    return new Error("Beauty migration 0009 must be applied before using this form.");
  }
  return new Error(error.message);
}

export async function saveAppointment(input: {
  id?: string;
  client_id: string | null;
  service_id: string;
  starts_at: string;
  status: AppointmentStatus;
  deposit_cents: number | null;
  deposit_paid: boolean;
  amount_paid_cents: number | null;
  payment_method: PaymentMethod;
  late_fee_cents: number | null;
  notes: string | null;
  lineServiceIds: string[];
}): Promise<string> {
  const supabase = db();
  const organizationId = await getCurrentOrgId();
  await assertOrgWriteAllowed(supabase, organizationId);
  const { data: menu, error: menuError } = await supabase.from("services").select("id,price_cents,duration_minutes,active").in("id", input.lineServiceIds);
  if (menuError) throw menuError;
  const services = (menu ?? []) as Pick<Service, "id" | "price_cents" | "duration_minutes" | "active">[];
  if (services.length !== input.lineServiceIds.length || services.some((service) => !service.active)) throw new Error("One or more selected services are inactive or unavailable.");
  const minutes = services.reduce((sum, service) => sum + service.duration_minutes, 0);
  const startsAt = new Date(input.starts_at);
  const endsAt = new Date(startsAt.getTime() + minutes * 60_000);
  if (input.status !== "canceled") {
    const [{ data: existing, error: appointmentError }, { data: hours, error: hoursError }, { data: blocks, error: blockError }, profile] = await Promise.all([
      supabase.from("appointments").select("*").neq("status", "canceled").lt("starts_at", endsAt.toISOString()).gt("ends_at", startsAt.toISOString()),
      supabase.from("working_hours").select("*"),
      supabase.from("time_off").select("*").lt("starts_at", endsAt.toISOString()).gt("ends_at", startsAt.toISOString()),
      getBeautyProfile(),
    ]);
    if (appointmentError || hoursError || blockError) throw appointmentError ?? hoursError ?? blockError;
    const conflict = checkAppointmentConflict({ startsAt, endsAt, timezone: profile.timezone, appointments: (existing ?? []) as Appointment[], workingHours: (hours ?? []) as WorkingHours[], timeOff: (blocks ?? []) as TimeOff[], excludeAppointmentId: input.id });
    if (!conflict.valid) throw new Error(`This time is unavailable (${conflict.reason?.replace("_", " ")}).`);
  }
  const { data, error } = await supabase.rpc("save_beauty_appointment", {
    p_appointment_id: input.id ?? null,
    p_client_id: input.client_id,
    p_primary_service_id: input.service_id,
    p_service_ids: input.lineServiceIds,
    p_starts_at: startsAt.toISOString(),
    p_status: input.status,
    p_deposit_cents: input.deposit_cents,
    p_deposit_paid: input.deposit_paid,
    p_amount_paid_cents: input.amount_paid_cents,
    p_payment_method: input.payment_method,
    p_late_fee_cents: input.late_fee_cents,
    p_notes: input.notes,
  });
  if (error) throw migrationError(error);
  if (typeof data !== "string") throw new Error("The appointment could not be saved.");
  return data;
}

export async function saveBeautyClient(input: {
  id?: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  allergy_notes: string | null;
  patch_test_date: string | null;
  patch_test_result: string | null;
  natural_lash_notes: string | null;
}): Promise<string> {
  const supabase = db();
  const organizationId = await getCurrentOrgId();
  await assertOrgWriteAllowed(supabase, organizationId);
  const { data, error } = await supabase.rpc("save_beauty_client", {
    p_customer_id: input.id ?? null,
    p_name: input.name,
    p_phone: input.phone,
    p_email: input.email,
    p_notes: input.notes,
    p_allergy_notes: input.allergy_notes,
    p_patch_test_date: input.patch_test_date,
    p_patch_test_result: input.patch_test_result,
    p_natural_lash_notes: input.natural_lash_notes,
  });
  if (error) throw migrationError(error);
  if (typeof data !== "string") throw new Error("The client could not be saved.");
  return data;
}


export async function cancelAppointment(id: string): Promise<void> {
  const supabase = db();
  const organizationId = await getCurrentOrgId();
  await assertOrgWriteAllowed(supabase, organizationId);
  const { data, error } = await supabase.from("appointments").update({ status: "canceled" }).eq("id", id).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Appointment not found.");
}
