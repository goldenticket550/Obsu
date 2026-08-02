import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import {
  RECOVERY_LINK_ERROR,
  safeAuthDestination,
} from "@/lib/auth/recovery";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeAuthDestination(request.nextUrl.searchParams.get("next"));

  if (code) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  const destination = new URL("/forgot-password", request.url);
  destination.searchParams.set("error", RECOVERY_LINK_ERROR);
  return NextResponse.redirect(destination);
}
