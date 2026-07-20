import { createSupabaseServerClient } from "./supabase-server";
import type { Expense } from "@/lib/types";

/** An expense row with a little of its linked trip embedded (if any). */
export interface ExpenseListRow extends Expense {
  trip: {
    id: string;
    trip_date: string;
    pickup_location: string | null;
    dropoff_location: string | null;
  } | null;
}

const SELECT =
  "*, trip:trips(id, trip_date, pickup_location, dropoff_location)";

export async function listExpenses(): Promise<ExpenseListRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("expenses")
    .select(SELECT)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ExpenseListRow[];
}

export async function getExpense(id: string): Promise<ExpenseListRow | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("expenses")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ExpenseListRow | null) ?? null;
}

export async function listRecentExpenses(limit = 5): Promise<ExpenseListRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("expenses")
    .select(SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as ExpenseListRow[];
}

export interface TripOption {
  id: string;
  label: string;
}

/** Trips as options for the "link to trip" select on the expense form. */
export async function listTripOptions(): Promise<TripOption[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trips")
    .select("id, trip_date, pickup_location, dropoff_location")
    .order("trip_date", { ascending: false })
    .limit(100);
  if (error) throw error;
  const rows = (data ?? []) as {
    id: string;
    trip_date: string;
    pickup_location: string | null;
    dropoff_location: string | null;
  }[];
  return rows.map((t) => ({
    id: t.id,
    label: `${t.trip_date} · ${t.pickup_location ?? "?"} → ${t.dropoff_location ?? "?"}`,
  }));
}
