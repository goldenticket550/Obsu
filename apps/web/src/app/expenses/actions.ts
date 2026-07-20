"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { getCurrentOrgId } from "@/lib/db/org";
import { dollarsToCents } from "@/lib/money";
import { EXPENSE_CATEGORIES } from "@/lib/enums";
import { enumOrNull, errorMessage, optStr, str } from "@/lib/form";

/** Shared fields for create + update. Throws on invalid money input. */
function readExpenseFields(formData: FormData) {
  const expenseDate = str(formData, "expense_date");
  const fields: Record<string, unknown> = {
    category: enumOrNull(str(formData, "category"), EXPENSE_CATEGORIES) ?? "other",
    amount_cents: dollarsToCents(str(formData, "amount")), // required
    trip_id: optStr(formData, "trip_id"),
    description: optStr(formData, "description"),
  };
  if (expenseDate) fields.expense_date = expenseDate;
  return fields;
}

export async function createExpense(formData: FormData) {
  let failure: string | null = null;
  try {
    const supabase = createSupabaseServerClient();
    const organization_id = await getCurrentOrgId();
    const { error } = await supabase
      .from("expenses")
      .insert({ organization_id, ...readExpenseFields(formData) });
    if (error) throw error;
  } catch (e) {
    failure = errorMessage(e);
  }
  if (failure) {
    redirect("/expenses/new?error=" + encodeURIComponent(failure));
  }

  revalidatePath("/expenses");
  revalidatePath("/");
  redirect("/expenses");
}

export async function updateExpense(formData: FormData) {
  const id = str(formData, "id");
  if (!id) redirect("/expenses");

  let failure: string | null = null;
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase
      .from("expenses")
      .update(readExpenseFields(formData))
      .eq("id", id);
    if (error) throw error;
  } catch (e) {
    failure = errorMessage(e);
  }
  if (failure) {
    redirect(`/expenses/${id}/edit?error=` + encodeURIComponent(failure));
  }

  revalidatePath("/expenses");
  revalidatePath("/");
  redirect("/expenses");
}
