import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

/**
 * Browser-side Supabase client (uses the public anon key + RLS).
 * Safe to call from Client Components. Not used yet in M1 — wired up
 * for auth in M2.
 */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
