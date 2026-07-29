"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { getCurrentOrgId } from "@/lib/db/org";
import { findOrCreateCustomerByName } from "@/lib/db/customers";
import { createTripWithCosts } from "@/lib/db/trips";
import { optionalDollarsToCents } from "@/lib/money";
import {
  blockingFormErrors,
  validateTripSubmission,
} from "@/lib/business/trip-status";
import { PAYMENT_METHODS, TRIP_STATUSES, TRIP_TYPES } from "@/lib/enums";
import {
  enumOrNull,
  errorMessage,
  optStr,
  optionalNonNegativeNumber,
  optionalPositiveInt,
  str,
} from "@/lib/form";
import { parseTripFromText } from "@/lib/ai/parse-trip";
import type { TripFormDefaults } from "@/components/trip-form";

/**
 * Combines the trip date with an optional "HH:MM" pickup time into a timestamp
 * for `trips.start_time`. Returns null when no time was given — a scheduled
 * ride may be booked for a day before the hour is settled.
 *
 * The value is built in America/New_York (this business's operating timezone)
 * so an 11pm pickup never lands on the wrong calendar day.
 */
function pickupTimestamp(tripDate: string, time: string): string | null {
  if (!tripDate || !time) return null;
  const [hh, mm] = time.split(":");
  const hours = Number(hh);
  const minutes = Number(mm);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  // Resolve the New York UTC offset for that date, then encode it explicitly.
  const naive = new Date(`${tripDate}T${time}:00Z`);
  if (Number.isNaN(naive.getTime())) return null;
  const inNy = new Date(
    naive.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  const offsetMs = naive.getTime() - inNy.getTime();
  return new Date(naive.getTime() + offsetMs).toISOString();
}

/** Fields shared by create + update. Throws on invalid money/number input. */
function readTripFields(formData: FormData) {
  const tripDate = str(formData, "trip_date");
  const status =
    enumOrNull(str(formData, "status"), TRIP_STATUSES) ?? "completed";
  const revenue = str(formData, "revenue");

  // S1 + U5: revenue is required to COMPLETE a trip (optional while merely
  // scheduled), and trip type is required on the form. The form enforces this
  // same set before submitting, so a validation failure never reaches the
  // redirect below and never costs the operator their entry; this run is
  // defence in depth for a bypassed client.
  const rawTripType = str(formData, "trip_type");
  const [firstError] = blockingFormErrors({
    status,
    revenue,
    tripType: rawTripType,
  });
  if (firstError) throw new Error(firstError.message);

  const fields: Record<string, unknown> = {
    pickup_location: optStr(formData, "pickup_location"),
    dropoff_location: optStr(formData, "dropoff_location"),
    trip_type: enumOrNull(rawTripType, TRIP_TYPES),
    payment_method: enumOrNull(str(formData, "payment_method"), PAYMENT_METHODS),
    status,
    // Blank is only reachable for a non-completed trip (validated above); it is
    // stored as 0, which for a scheduled trip means "no price set".
    revenue_cents: optionalDollarsToCents(revenue) ?? 0,
    hours: optionalNonNegativeNumber(str(formData, "hours")),
    hourly_rate_cents: optionalDollarsToCents(str(formData, "hourly_rate")),
    mileage: optionalNonNegativeNumber(str(formData, "mileage")),
    notes: optStr(formData, "notes"),
    start_time: pickupTimestamp(tripDate, str(formData, "pickup_time")),

    // D1. Each of these persists NULL when the input is blank — "not tracked"
    // is a different claim from "zero", and the schema distinguishes them.
    // optionalDollarsToCents / optionalPositiveInt / optStr all return null on
    // blank, never 0 and never "".
    amount_paid_cents: optionalDollarsToCents(str(formData, "amount_paid")),
    passenger_count: optionalPositiveInt(str(formData, "passenger_count")),
    // confirmed_at is NOT set here: it is stamped by its own confirm action,
    // so editing a ride never silently confirms or unconfirms it.
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

    // V3.1: one definition of "create a trip", shared with the proposal
    // executor, so the two paths cannot drift into writing different shapes.
    const result = await createTripWithCosts(supabase, {
      organizationId: organization_id,
      customerId: customer_id,
      tripRow: fields,
      tripDate: tripDate || null,
      costs: {
        gasCents: optionalDollarsToCents(str(formData, "cost_gas")),
        tollsCents: optionalDollarsToCents(str(formData, "cost_tolls")),
        otherCents: optionalDollarsToCents(str(formData, "cost_other")),
        otherLabel: optStr(formData, "cost_other_label"),
      },
    });

    // The ride saved but its costs did not — say so rather than reporting a
    // clean save, because profit would be overstated until they are added.
    if (!result.costsWritten) {
      throw new Error(
        "The ride was saved, but its costs weren't. Add them on the Expenses screen.",
      );
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
 * S1 — close out a scheduled trip. This is the moment the ride starts counting
 * toward revenue/profit/trip totals, so a final revenue amount is mandatory
 * here (enforced by the same tested rule the form uses). Status is the only
 * other thing that changes; nothing else about the trip is rewritten.
 *
 * `returnTo` lets the Upcoming list (S2) send the owner back where they were.
 */
export async function markTripCompleted(formData: FormData) {
  const id = str(formData, "id");
  if (!id) redirect("/trips");
  const returnTo = str(formData, "return_to") || "/trips";
  const revenue = str(formData, "revenue");

  let failure: string | null = null;
  try {
    const [firstError] = validateTripSubmission({ status: "completed", revenue });
    if (firstError) throw new Error(firstError.message);

    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("trips")
      .update({
        status: "completed",
        revenue_cents: optionalDollarsToCents(revenue) ?? 0,
      })
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
  redirect(returnTo);
}

/**
 * D1 — record that the customer confirmed a booking, stamping confirmed_at
 * with the moment it happened.
 *
 * REVERSIBLE: `unconfirmTrip` below clears the stamp back to NULL, so a
 * mis-tap costs nothing. confirmed_at is a timestamp rather than a boolean
 * precisely so "when" survives; unconfirming discards that timestamp, which is
 * the intended meaning of "this was never actually confirmed".
 *
 * Touches only confirmed_at — no status transition, no money, nothing else.
 */
export async function confirmTrip(formData: FormData) {
  const id = str(formData, "id");
  if (!id) redirect("/upcoming");
  const returnTo = str(formData, "return_to") || "/upcoming";

  let failure: string | null = null;
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("trips")
      .update({ confirmed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  } catch (e) {
    failure = errorMessage(e);
  }
  if (failure) {
    redirect(`/trips/${id}/edit?error=` + encodeURIComponent(failure));
  }

  revalidatePath("/upcoming");
  revalidatePath("/");
  redirect(returnTo);
}

/** D1 — undo a confirmation, clearing confirmed_at back to NULL. */
export async function unconfirmTrip(formData: FormData) {
  const id = str(formData, "id");
  if (!id) redirect("/upcoming");
  const returnTo = str(formData, "return_to") || "/upcoming";

  let failure: string | null = null;
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("trips")
      .update({ confirmed_at: null })
      .eq("id", id);
    if (error) throw error;
  } catch (e) {
    failure = errorMessage(e);
  }
  if (failure) {
    redirect(`/trips/${id}/edit?error=` + encodeURIComponent(failure));
  }

  revalidatePath("/upcoming");
  revalidatePath("/");
  redirect(returnTo);
}

/**
 * S1 — cancel a trip. Sets status to `canceled`; never a hard delete, so the
 * record stays auditable. A canceled trip counts toward nothing.
 */
export async function cancelTrip(formData: FormData) {
  const id = str(formData, "id");
  if (!id) redirect("/trips");
  const returnTo = str(formData, "return_to") || "/trips";

  let failure: string | null = null;
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("trips")
      .update({ status: "canceled" })
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
  redirect(returnTo);
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
