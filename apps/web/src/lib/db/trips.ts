import { createSupabaseServerClient } from "./supabase-server";
import type { Trip } from "@/lib/types";

/** A trip row with its customer's name embedded (for list/detail display). */
export interface TripListRow extends Trip {
  customer: { name: string } | null;
}

const SELECT = "*, customer:customers(name)";

export async function listTrips(): Promise<TripListRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trips")
    .select(SELECT)
    .order("trip_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TripListRow[];
}

export async function getTrip(id: string): Promise<TripListRow | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trips")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as TripListRow | null) ?? null;
}

/** Inline costs captured at the moment a ride is logged. Cents, or null. */
export interface TripCostsInput {
  gasCents?: number | null;
  tollsCents?: number | null;
  otherCents?: number | null;
  otherLabel?: string | null;
}

export interface CreateTripResult {
  tripId: string;
  /** How many linked expense rows the input asked for. */
  costsRequested: number;
  /** False when the trip was written but its linked costs were not. */
  costsWritten: boolean;
  /** Present only when the cost insert failed after the trip succeeded. */
  costsError?: string;
}

/**
 * V3.1 — the ONE definition of "create a trip".
 *
 * A ride and the costs captured with it are written together, because per-trip
 * profit depends on the link: estimatedTripProfitCents filters expenses by
 * trip_id, so a ride created without its gas and tolls OVERSTATES profit by
 * exactly those amounts. Logging time is also the only moment the operator
 * reliably remembers them.
 *
 * Both the ride form and the proposal executor call this, so neither can drift
 * into creating a different shape of "trip" than the other.
 *
 * Not atomic: Supabase's client cannot open a multi-statement transaction, so
 * the trip can land while the expenses do not. That is reported honestly
 * through `costsWritten` rather than hidden — callers surface it as a partial
 * result instead of claiming a clean success.
 */
export async function createTripWithCosts(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  params: {
    organizationId: string;
    customerId: string | null;
    /** The trips row, already validated and money-converted by the caller. */
    tripRow: Record<string, unknown>;
    /** Dates the linked expenses to the ride; omitted uses the DB default. */
    tripDate: string | null;
    costs: TripCostsInput;
  },
): Promise<CreateTripResult> {
  const { data, error } = await supabase
    .from("trips")
    .insert({
      organization_id: params.organizationId,
      customer_id: params.customerId,
      ...params.tripRow,
    })
    .select("id")
    .single();
  if (error) throw error;
  const tripId = (data as { id: string }).id;

  const inline: { cents: number | null | undefined; category: string; description: string | null }[] = [
    { cents: params.costs.gasCents, category: "gas", description: null },
    { cents: params.costs.tollsCents, category: "tolls", description: null },
    {
      cents: params.costs.otherCents,
      category: "other",
      description: params.costs.otherLabel ?? "Other",
    },
  ];

  const rows = inline
    .filter((item) => typeof item.cents === "number" && item.cents > 0)
    .map((item) => {
      const row: Record<string, unknown> = {
        organization_id: params.organizationId,
        trip_id: tripId,
        category: item.category,
        amount_cents: item.cents,
        description: item.description,
      };
      if (params.tripDate) row.expense_date = params.tripDate;
      return row;
    });

  if (rows.length === 0) {
    return { tripId, costsRequested: 0, costsWritten: true };
  }

  const { error: costError } = await supabase.from("expenses").insert(rows);
  if (costError) {
    // The ride exists; the costs do not. Report it — do not throw away the
    // trip id, and do not pretend the whole thing failed.
    return {
      tripId,
      costsRequested: rows.length,
      costsWritten: false,
      costsError: costError.message,
    };
  }
  return { tripId, costsRequested: rows.length, costsWritten: true };
}

export async function listRecentTrips(limit = 5): Promise<TripListRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trips")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as TripListRow[];
}
