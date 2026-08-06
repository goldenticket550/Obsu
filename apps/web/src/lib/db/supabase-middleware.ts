import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPublicAuthRoute } from "@/lib/auth/recovery";
import { verticalRedirectPath, type OrganizationVertical } from "@/lib/vertical-routing";
import { getSupabaseEnv } from "./env";

function copyCookies(source: NextResponse, target: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}
function redirectWithCookies(request: NextRequest, base: NextResponse, pathname: string): NextResponse {
  const target = request.nextUrl.clone();
  target.pathname = pathname;
  target.search = "";
  return copyCookies(base, NextResponse.redirect(target));
}
function nextWithVertical(request: NextRequest, base: NextResponse, vertical: OrganizationVertical): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-obsidian-vertical", vertical);
  return copyCookies(base, NextResponse.next({ request: { headers: requestHeaders } }));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !isPublicAuthRoute(request.nextUrl.pathname)) return redirectWithCookies(request, supabaseResponse, "/login");
  if (!user) return supabaseResponse;

  const { data: membership, error: membershipError } = await supabase.from("memberships").select("organization_id").limit(1).maybeSingle();
  if (membershipError) return copyCookies(supabaseResponse, new NextResponse("Unable to verify workspace access.", { status: 503 }));
  if (!membership) return nextWithVertical(request, supabaseResponse, "rides");
  const { data: organization, error: organizationError } = await supabase.from("organizations").select("vertical").eq("id", membership.organization_id).maybeSingle();
  if (organizationError || !organization) return copyCookies(supabaseResponse, new NextResponse("Unable to verify workspace access.", { status: 503 }));
  const vertical: OrganizationVertical = (organization as { vertical?: string } | null)?.vertical === "beauty" ? "beauty" : "rides";
  const redirectPath = verticalRedirectPath(request.nextUrl.pathname, vertical);
  return redirectPath ? redirectWithCookies(request, supabaseResponse, redirectPath) : nextWithVertical(request, supabaseResponse, vertical);
}
