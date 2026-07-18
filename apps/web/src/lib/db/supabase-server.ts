import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

/**
 * Server-side Supabase client bound to the request's cookies.
 * Uses the anon key so PostgreSQL Row-Level Security still applies — the
 * server never bypasses tenant isolation with the service-role key here.
 * Not used yet in M1 — wired up for auth/session handling in M2.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component where cookies are read-only.
          // Session refresh is handled in middleware/route handlers (M2).
        }
      },
    },
  });
}
