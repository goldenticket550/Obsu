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
