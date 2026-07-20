/**
 * Small server-side helpers for parsing/validating FormData in server actions.
 * Keeps parsing logic out of components (build rule #6).
 */

/** Trimmed string for a form field ("" if missing). */
export function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

/** Trimmed string, or null when blank (for optional/nullable columns). */
export function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v === "" ? null : v;
}

/** A value only if it is a member of `allowed`, else null. */
export function enumOrNull<T extends string>(
  value: string,
  allowed: readonly T[],
): T | null {
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

/** Parse an optional non-negative number ("" -> null). Throws on invalid/negative. */
export function optionalNonNegativeNumber(value: string): number | null {
  const s = value.trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Enter a valid non-negative number.");
  }
  return n;
}

/** Extract a user-safe message from a thrown error / Supabase error. */
export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return "Something went wrong. Please try again.";
}
