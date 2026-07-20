import { createSupabaseServerClient } from "./supabase-server";

/**
 * Returns the signed-in user's organization_id (their business), read from
 * memberships via RLS. Every insert/update stamps this so the RLS
 * WITH CHECK (is_member_of(organization_id)) passes. Never trust an org id
 * that came from the client.
 */
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
