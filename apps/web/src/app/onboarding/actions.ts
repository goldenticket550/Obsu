"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";

/**
 * Creates the user's business (Organization) plus their OWNER membership,
 * atomically, via the create_organization() database function. RLS + the
 * SECURITY DEFINER function keep this safe.
 */
export async function createOrg(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();

  if (!name) {
    redirect("/onboarding?error=" + encodeURIComponent("Enter a business name."));
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("create_organization", {
    org_name: name,
  });

  if (error) {
    redirect("/onboarding?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/", "layout");
  redirect("/");
}
