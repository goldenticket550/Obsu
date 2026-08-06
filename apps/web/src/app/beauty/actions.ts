"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appendActivityEvent } from "@/lib/db/activity-events";
import { cancelAppointment, getBeautyProfile, guardedWrite, saveAppointment, saveBeautyClient } from "@/lib/db/beauty";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { getCurrentOrgId } from "@/lib/db/org";
import { errorMessage, optStr, str } from "@/lib/form";
import { zonedDateTimeToUtc } from "@/lib/business/beauty/timezone";
import { APPOINTMENT_STATUSES, dollarsToCents, PAYMENT_METHODS, positiveInteger, requireEnum, requireUuid, optionalUuid, SERVICE_CATEGORIES, uniqueIds, wallTime, weekday } from "@/lib/business/beauty/validation";

const fail = (path: string, error: unknown): never => redirect(`${path}?error=${encodeURIComponent(errorMessage(error))}`);
function optionalDate(value: string | null): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Enter a valid patch-test date.");
  const date = new Date(`${value}T00:00:00Z`);
  if (date.toISOString().slice(0, 10) !== value) throw new Error("Enter a valid patch-test date.");
  return value;
}

export async function saveService(formData: FormData) {
  const id = str(formData, "id");
  const path = id ? `/beauty/services/${id}/edit` : "/beauty/services/new";
  try {
    const name = str(formData, "name");
    if (!name) throw new Error("Service name is required.");
    await guardedWrite("services", id ? "update" : "insert", {
      name,
      category: requireEnum(str(formData, "category"), SERVICE_CATEGORIES, "service category"),
      duration_minutes: positiveInteger(formData.get("duration_minutes"), "Duration"),
      price_cents: dollarsToCents(formData.get("price")) ?? 0,
      deposit_cents: dollarsToCents(formData.get("deposit")),
      description: optStr(formData, "description"),
      active: formData.get("active") === "on",
    }, id || undefined);
  } catch (error) {
    fail(path, error);
  }
  revalidatePath("/beauty/services");
  redirect("/beauty/services");
}

export async function deleteService(formData: FormData) {
  try {
    await guardedWrite("services", "update", { active: false }, str(formData, "id"));
  } catch (error) {
    fail("/beauty/services", error);
  }
  revalidatePath("/beauty/services");
  redirect("/beauty/services");
}

export async function saveBeautyAppointment(formData: FormData) {
  const id = str(formData, "id");
  const path = id ? `/beauty/appointments/${id}/edit` : "/beauty/appointments/new";
  try {
    const primaryServiceId = str(formData, "service_id");
    if (!primaryServiceId) throw new Error("Select a service.");
    const addOns = formData.getAll("add_on_ids").map(String).filter((value) => value !== primaryServiceId).map((value) => requireUuid(value, "add-on"));
    const lineServiceIds = uniqueIds([primaryServiceId, ...addOns]);
    const profile = await getBeautyProfile();
    const startsAt = zonedDateTimeToUtc(str(formData, "starts_at"), profile.timezone);
    await saveAppointment({
      id: id || undefined,
      client_id: optionalUuid(optStr(formData, "client_id"), "client"),
      service_id: primaryServiceId,
      starts_at: startsAt.toISOString(),
      status: requireEnum(str(formData, "status") || "booked", APPOINTMENT_STATUSES, "appointment status"),
      deposit_cents: dollarsToCents(formData.get("deposit")),
      deposit_paid: formData.get("deposit_paid") === "on",
      amount_paid_cents: dollarsToCents(formData.get("amount_paid")),
      payment_method: requireEnum(str(formData, "payment_method") || "cash", PAYMENT_METHODS, "payment method"),
      late_fee_cents: dollarsToCents(formData.get("late_fee")),
      notes: optStr(formData, "notes"),
      lineServiceIds,
    });
  } catch (error) {
    fail(path, error);
  }
  revalidatePath("/beauty");
  revalidatePath("/beauty/appointments");
  redirect("/beauty/appointments");
}

export async function saveBeautyClientAction(formData: FormData) {
  const id = str(formData, "id");
  const path = id ? `/beauty/clients/${id}` : "/beauty/clients/new";
  let savedId: string;
  try {
    const name = str(formData, "name");
    if (!name) throw new Error("Name is required.");
    savedId = await saveBeautyClient({
      id: id || undefined,
      name,
      phone: optStr(formData, "phone"),
      email: optStr(formData, "email"),
      notes: optStr(formData, "notes"),
      allergy_notes: optStr(formData, "allergy_notes"),
      patch_test_date: optionalDate(optStr(formData, "patch_test_date")),
      patch_test_result: optStr(formData, "patch_test_result"),
      natural_lash_notes: optStr(formData, "natural_lash_notes"),
    });
  } catch (error) {
    fail(path, error);
  }
  revalidatePath("/beauty/clients");
  redirect(`/beauty/clients/${savedId!}`);
}

export async function addWorkingHours(formData: FormData) {
  try {
    const startTime = wallTime(str(formData, "start_time"));
    const endTime = wallTime(str(formData, "end_time"));
    if (endTime <= startTime) throw new Error("Working hours must end after they start.");
    await guardedWrite("working_hours", "insert", { weekday: weekday(formData.get("weekday")), start_time: startTime, end_time: endTime });
  } catch (error) {
    fail("/beauty/schedule", error);
  }
  revalidatePath("/beauty/schedule");
  redirect("/beauty/schedule");
}

export async function addTimeOff(formData: FormData) {
  try {
    const profile = await getBeautyProfile();
    const startsAt = zonedDateTimeToUtc(str(formData, "starts_at"), profile.timezone);
    const endsAt = zonedDateTimeToUtc(str(formData, "ends_at"), profile.timezone);
    if (!(startsAt < endsAt)) throw new Error("Time off must end after it starts.");
    await guardedWrite("time_off", "insert", { starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), reason: optStr(formData, "reason") });
  } catch (error) {
    fail("/beauty/schedule", error);
  }
  revalidatePath("/beauty/schedule");
  redirect("/beauty/schedule");
}

export async function removeScheduleRow(formData: FormData) {
  const table = str(formData, "table");
  try {
    if (table !== "working_hours" && table !== "time_off") throw new Error("Invalid schedule record.");
    await guardedWrite(table, "delete", {}, str(formData, "id"));
  } catch (error) {
    fail("/beauty/schedule", error);
  }
  revalidatePath("/beauty/schedule");
  redirect("/beauty/schedule");
}

export async function logReminderDraftCopy(input: { clientId: string; appointmentId?: string; kind: "fill" | "addon" }) {
  const supabase = createSupabaseServerClient();
  const organizationId = await getCurrentOrgId();
  const { data: { user } } = await supabase.auth.getUser();
  await appendActivityEvent({
    organizationId,
    userId: user?.id ?? null,
    eventName: "feature_opened",
    feature: "beauty_reminder_draft_copied",
    metadata: { client_id: input.clientId, appointment_id: input.appointmentId ?? null, reminder_kind: input.kind },
  });
}


export async function cancelBeautyAppointment(formData: FormData) {
  try {
    await cancelAppointment(requireUuid(str(formData, "id"), "appointment"));
  } catch (error) {
    fail("/beauty/appointments", error);
  }
  revalidatePath("/beauty");
  revalidatePath("/beauty/appointments");
  redirect("/beauty/appointments");
}
