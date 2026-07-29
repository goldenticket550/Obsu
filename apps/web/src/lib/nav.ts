/**
 * U1 — navigation model for the app shell. PURE: no data access, no React, so
 * the shell's routing decisions are unit-testable and the component stays
 * presentational.
 */

export interface NavDestination {
  href: string;
  label: string;
}

/**
 * Exactly the destinations that exist and work today. Every entry must be a
 * real, reachable route — no placeholders, no "coming soon", nothing that
 * leads to a dead page.
 */
export const NAV_DESTINATIONS: NavDestination[] = [
  { href: "/", label: "Dashboard" },
  { href: "/upcoming", label: "Upcoming" },
  { href: "/trips", label: "Trips" },
  { href: "/customers", label: "Customers" },
  { href: "/expenses", label: "Expenses" },
];

/**
 * Routes that must render completely standalone. `/login` is pre-auth and
 * `/onboarding` is pre-organization: wrapping either in navigation would offer
 * links the visitor cannot use yet and clutter the sign-in flow.
 */
export const CHROMELESS_ROUTES = ["/login", "/onboarding"];

/** Exact-or-subpath match, never a bare substring test. */
function matches(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

/** Whether this route renders without the shell. */
export function isChromeless(pathname: string): boolean {
  return CHROMELESS_ROUTES.some((route) => matches(pathname, route));
}

/**
 * Whether a nav destination is the current one. "/" must match exactly or it
 * would light up on every page.
 */
export function isActiveDestination(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return matches(pathname, href);
}
