"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { getCurrentOrgId } from "@/lib/db/org";
import { errorMessage, optStr, str } from "@/lib/form";

export async function createCustomer(formData: FormData) {
  const name = str(formData, "name");
  if (!name) {
    redirect("/customers/new?error=" + encodeURIComponent("Name is required."));
  }

  let failure: string | null = null;
  try {
    const supabase = createSupabaseServerClient();
    const organization_id = await getCurrentOrgId();
    const { error } = await supabase.from("customers").insert({
      organization_id,
      name,
      phone: optStr(formData, "phone"),
      email: optStr(formData, "email"),
      notes: optStr(formData, "notes"),
    });
    if (error) throw error;
  } catch (e) {
    failure = errorMessage(e);
  }
  if (failure) {
    redirect("/customers/new?error=" + encodeURIComponent(failure));
  }

  revalidatePath("/customers");
  redirect("/customers");
}

export async function updateCustomer(formData: FormData) {
  const id = str(formData, "id");
  const name = str(formData, "name");
  if (!id) redirect("/customers");
  if (!name) {
    redirect(
      `/customers/${id}/edit?error=` +
        encodeURIComponent("Name is required."),
    );
  }

  let failure: string | null = null;
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("customers")
      .update({
        name,
        phone: optStr(formData, "phone"),
        email: optStr(formData, "email"),
        notes: optStr(formData, "notes"),
      })
      .eq("id", id);
    if (error) throw error;
  } catch (e) {
    failure = errorMessage(e);
  }
  if (failure) {
    redirect(`/customers/${id}/edit?error=` + encodeURIComponent(failure));
  }

  revalidatePath("/customers");
  redirect("/customers");
}
