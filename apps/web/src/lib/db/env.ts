/**
 * Central place to read Supabase environment variables with clear errors.
 * M1 only validates presence — no live connection is made until auth (M2).
 * Never hard-code keys here; they come from .env.local (git-ignored).
 */

export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase env vars. Copy apps/web/.env.local.example to " +
        "apps/web/.env.local and set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return { url, anonKey };
}
