"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";

/**
 * Auth server actions. These run on the server, set the session cookie, and
 * redirect. The AI/business layers are never involved in auth — this is CORE.
 */

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  // If email confirmation is OFF in Supabase, sign-up returns a session and the
  // user is logged in immediately. If it's ON, they must confirm via email first.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  redirect(
    "/login?message=" +
      encodeURIComponent("Account created. Check your email to confirm, then sign in."),
  );
}

export async function signOut() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
