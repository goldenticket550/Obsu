"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { newPasswordError } from "@/lib/auth/recovery";

export async function updateRecoveredPassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  const validationError = newPasswordError(password, confirmation);
  if (validationError) {
    redirect("/reset-password?error=" + encodeURIComponent(validationError));
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      "/forgot-password?error=" +
        encodeURIComponent("That recovery session expired. Request a new link."),
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(
      "/reset-password?error=" +
        encodeURIComponent("We couldn't update the password. Request a new link."),
    );
  }

  await supabase.auth.signOut();
  redirect(
    "/login?message=" +
      encodeURIComponent("Password updated. Sign in with your new password."),
  );
}
