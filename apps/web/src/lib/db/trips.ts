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
