import { createSupabaseServerClient } from "./supabase-server";

/**
 * Returns the signed-in user's organization_id (their business), read from
 * memberships via RLS. Every insert/update stamps this so the RLS
 * WITH CHECK (is_member_of(organization_id)) passes. Never trust an org id
 * that came from the client.
 */
/**
 * The signed-in user's business name, read through the same RLS-scoped
 * membership path as getCurrentOrgId(). Returns null when there is no org or
 * no name yet, so callers supply their own neutral fallback.
 *
 * C1: this is the ONLY way the AI layer learns the business name. It is never
 * accepted from the client, a query param, or user-supplied message text.
 */
export async function getCurrentOrgName(): Promise<string | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships } = await supabase
    .from("memberships")
    .select("organization_id")
    .limit(1);
  const orgId = memberships?.[0]?.organization_id;
  if (!orgId) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .maybeSingle();

  const name = (org as { name?: string } | null)?.name;
  return typeof name === "string" && name.trim() ? name : null;
}

export async function getCurrentOrgId(): Promise<string> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const { data, error } = await supabase
    .from("memberships")
    .select("organization_id")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("No organization found for this user.");
  return (data as { organization_id: string }).organization_id;
}
