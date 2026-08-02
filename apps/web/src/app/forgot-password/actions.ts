"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import {
  RECOVERY_EMAIL_SENT_MESSAGE,
  recoveryCallbackUrl,
  siteOrigin,
} from "@/lib/auth/recovery";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect("/forgot-password?error=" + encodeURIComponent("Enter your email."));
  }

  let redirectTo: string;
  try {
    const origin = siteOrigin({
      configuredUrl: process.env.NEXT_PUBLIC_SITE_URL,
      requestOrigin: headers().get("origin"),
      production: process.env.NODE_ENV === "production",
    });
    redirectTo = recoveryCallbackUrl(origin);
  } catch {
    redirect(
      "/forgot-password?error=" +
        encodeURIComponent("Password recovery is temporarily unavailable."),
    );
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    console.error("Password recovery request failed", {
      code: error.code,
      status: error.status,
    });
    redirect(
      "/forgot-password?error=" +
        encodeURIComponent("We couldn't send a reset link. Please try again shortly."),
    );
  }

  redirect(
    "/forgot-password?message=" + encodeURIComponent(RECOVERY_EMAIL_SENT_MESSAGE),
  );
}
