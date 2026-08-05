import { createSupabaseServerClient } from "./supabase-server";
import { getCurrentOrgId } from "./org";
import { assertOrgWriteAllowed } from "./org-access";
import type { Customer } from "@/lib/types";

export async function listCustomers(): Promise<Customer[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Customer[];
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Customer | null) ?? null;
}

/**
 * Find a customer in the current org by case-insensitive exact name, or create
 * one. Returns the customer id, or null for a blank name (= no customer linked).
 * RLS scopes both the lookup and the insert to the caller's org.
 */
export async function findOrCreateCustomerByName(
  name: string,
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const supabase = createSupabaseServerClient();
  const { data: existing, error: findErr } = await supabase
    .from("customers")
    .select("id")
    .ilike("name", trimmed)
    .limit(1)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing) return (existing as { id: string }).id;

  const orgId = await getCurrentOrgId();
  await assertOrgWriteAllowed(supabase, orgId);
  const { data: created, error: insErr } = await supabase
    .from("customers")
    .insert({ organization_id: orgId, name: trimmed })
    .select("id")
    .single();
  if (insErr) throw insErr;
  return (created as { id: string }).id;
}
