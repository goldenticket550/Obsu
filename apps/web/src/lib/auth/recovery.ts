export const RECOVERY_EMAIL_SENT_MESSAGE =
  "If an account exists for that email, a password-reset link is on its way.";

export const RECOVERY_LINK_ERROR =
  "That password-reset link is invalid or expired. Request a new one.";

const PUBLIC_AUTH_ROUTES = ["/login", "/forgot-password", "/auth"] as const;
const ALLOWED_AUTH_DESTINATIONS = new Set(["/", "/reset-password"]);

export function isPublicAuthRoute(pathname: string): boolean {
  return PUBLIC_AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function safeAuthDestination(value: string | null): string {
  return value && ALLOWED_AUTH_DESTINATIONS.has(value) ? value : "/";
}

export function siteOrigin({
  configuredUrl,
  requestOrigin,
  production,
}: {
  configuredUrl?: string;
  requestOrigin?: string | null;
  production: boolean;
}): string {
  const candidate = configuredUrl?.trim() || requestOrigin?.trim();
  if (!candidate) {
    if (production) throw new Error("NEXT_PUBLIC_SITE_URL is not configured.");
    return "http://localhost:3001";
  }

  const parsed = new URL(candidate);
  const localHttp =
    parsed.protocol === "http:" &&
    (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
  if (parsed.protocol !== "https:" && !(localHttp && !production)) {
    throw new Error("The recovery site URL must use HTTPS.");
  }

  return parsed.origin;
}

export function recoveryCallbackUrl(origin: string): string {
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", "/reset-password");
  return callback.toString();
}

export function newPasswordError(
  password: string,
  confirmation: string,
): string | null {
  if (password.length < 6) return "Use at least 6 characters.";
  if (password !== confirmation) return "The passwords do not match.";
  return null;
}
