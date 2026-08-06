export interface NavDestination {
  href: string;
  label: string;
}

export const NAV_DESTINATIONS: NavDestination[] = [
  { href: "/", label: "Dashboard" },
  { href: "/upcoming", label: "Upcoming" },
  { href: "/trips", label: "Trips" },
  { href: "/customers", label: "Customers" },
  { href: "/expenses", label: "Expenses" },
];

export const BEAUTY_NAV_DESTINATIONS: NavDestination[] = [
  { href: "/beauty", label: "Command Center" },
  { href: "/beauty/appointments", label: "Appointments" },
  { href: "/beauty/services", label: "Services" },
  { href: "/beauty/clients", label: "Clients" },
  { href: "/beauty/schedule", label: "Schedule" },
];
/** Focused auth and pre-organization routes render without app navigation. */
export const CHROMELESS_ROUTES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
];

function matches(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isChromeless(pathname: string): boolean {
  return CHROMELESS_ROUTES.some((route) => matches(pathname, route));
}

export function isActiveDestination(pathname: string, href: string): boolean {
  if (href === "/" || href === "/beauty") return pathname === href;
  return matches(pathname, href);
}
