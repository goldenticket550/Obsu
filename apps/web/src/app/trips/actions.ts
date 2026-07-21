"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { getCurrentOrgId } from "@/lib/db/org";
import { findOrCreateCustomerByName } from "@/lib/db/customers";
import { dollarsToCents, optionalDollarsToCents } from "@/lib/money";
import { PAYMENT_METHODS, TRIP_STATUSES, TRIP_TYPES } from "@/lib/enums";
import {
  enumOrNull,
  errorMessage,
  optStr,
  optionalNonNegativeNumber,
  str,
} from "@/lib/form";
import { parseTripFromText } from "@/lib/ai/parse-trip";
import type { TripFormDefaults } from "@/components/trip-form";

/** Fields shared by create + update. Throws on invalid money/number input. */
function readTripFields(formData: FormData) {
  const tripDate = str(formData, "trip_date");
  const fields: Record<string, unknown> = {
    pickup_location: optStr(formData, "pickup_location"),
    dropoff_location: optStr(formData, "dropoff_location"),
    trip_type: enumOrNull(str(formData, "trip_type"), TRIP_TYPES),
    payment_method: enumOrNull(str(formData, "payment_method"), PAYMENT_METHODS),
    status: enumOrNull(str(formData, "status"), TRIP_STATUSES) ?? "completed",
    revenue_cents: dollarsToCents(str(formData, "revenue")), // required
    hours: optionalNonNegativeNumber(str(formData, "hours")),
    hourly_rate_cents: optionalDollarsToCents(str(formData, "hourly_rate")),
    mileage: optionalNonNegativeNumber(str(formData, "mileage")),
    notes: optStr(formData, "notes"),
  };
  // Only set trip_date when provided so the DB default (today) applies otherwise.
  if (tripDate) fields.trip_date = tripDate;
  return { fields, tripDate };
}

export async function createTrip(formData: FormData) {
  let failure: string | null = null;
  try {
    const supabase = createSupabaseServerClient();
    const organization_id = await getCurrentOrgId();
    const customer_id = await findOrCreateCustomerByName(
      str(formData, "customer_name"),
    );

    const { fields, tripDate } = readTripFields(formData);
    const { data: trip, error } = await supabase
      .from("trips")
      .insert({ organization_id, customer_id, ...fields })
      .select("id")
      .single();
    if (error) throw error;
    const trip_id = (trip as { id: string }).id;

    // Inline costs -> linked expense rows (only amounts > $0).
    const inline: { key: string; category: string }[] = [
      { key: "cost_gas", category: "gas" },
      { key: "cost_tolls", category: "tolls" },
      { key: "cost_other", category: "other" },
    ];
    const rows: Record<string, unknown>[] = [];
    for (const item of inline) {
      const amount_cents = optionalDollarsToCents(str(formData, item.key));
      if (amount_cents && amount_cents > 0) {
        const row: Record<string, unknown> = {
          organization_id,
          trip_id,
          category: item.category,
          amount_cents,
          description:
            item.category === "other"
              ? optStr(formData, "cost_other_label") ?? "Other"
              : null,
        };
        if (tripDate) row.expense_date = tripDate;
        rows.push(row);
      }
    }
    if (rows.length) {
      const { error: expErr } = await supabase.from("expenses").insert(rows);
      if (expErr) throw expErr;
    }
  } catch (e) {
    failure = errorMessage(e);
  }
  if (failure) {
    redirect("/trips/new?error=" + encodeURIComponent(failure));
  }

  revalidatePath("/trips");
  revalidatePath("/expenses");
  revalidatePath("/");
  redirect("/trips");
}

export async function updateTrip(formData: FormData) {
  const id = str(formData, "id");
  if (!id) redirect("/trips");

  let failure: string | null = null;
  try {
    const supabase = createSupabaseServerClient();
    const customer_id = await findOrCreateCustomerByName(
      str(formData, "customer_name"),
    );
    const { fields } = readTripFields(formData);
    const { error } = await supabase
      .from("trips")
      .update({ customer_id, ...fields })
      .eq("id", id);
    if (error) throw error;
  } catch (e) {
    failure = errorMessage(e);
  }
  if (failure) {
    redirect(`/trips/${id}/edit?error=` + encodeURIComponent(failure));
  }

  revalidatePath("/trips");
  revalidatePath("/");
  redirect("/trips");
}

/**
 * M8 — parse a free-text note into prefill values for the trip form. This is a
 * Level-2 "prepare" step: it reads the text and returns proposed values only.
 * It writes NOTHING — the sole write is the owner submitting the form
 * (createTrip). Unstated fields are left blank; nothing is invented.
 */
export async function parseTripText(
  text: string,
): Promise<{ defaults?: TripFormDefaults; error?: string }> {
  const note = String(text ?? "").trim();
  if (!note) return { error: "Type what happened first." };

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  try {
    const p = await parseTripFromText(note);
    const d: TripFormDefaults = {};
    if (p.customerName) d.customer_name = p.customerName;
    if (p.tripDate) d.trip_date = p.tripDate;
    if (p.pickup) d.pickup_location = p.pickup;
    if (p.dropoff) d.dropoff_location = p.dropoff;
    if (p.tripType) d.trip_type = p.tripType;
    if (p.paymentMethod) d.payment_method = p.paymentMethod;
    if (p.revenueDollars != null) d.revenue = String(p.revenueDollars);
    if (p.hours != null) d.hours = String(p.hours);
    if (p.hourlyRateDollars != null) d.hourly_rate = String(p.hourlyRateDollars);
    if (p.mileage != null) d.mileage = String(p.mileage);
    if (p.notes) d.notes = p.notes;
    if (p.gasDollars != null) d.cost_gas = String(p.gasDollars);
    if (p.tollsDollars != null) d.cost_tolls = String(p.tollsDollars);
    if (p.otherDollars != null) d.cost_other = String(p.otherDollars);
    if (p.otherLabel) d.cost_other_label = p.otherLabel;
    return { defaults: d };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
