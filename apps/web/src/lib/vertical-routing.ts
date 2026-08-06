export type OrganizationVertical = "rides" | "beauty";

const RIDES_ONLY_ROUTES = ["/", "/upcoming", "/trips", "/customers", "/expenses"];

function matches(pathname: string, route: string): boolean {
  return pathname === route || (route !== "/" && pathname.startsWith(`${route}/`));
}

export function verticalHome(vertical: OrganizationVertical): string {
  return vertical === "beauty" ? "/beauty" : "/";
}

export function isRouteAllowedForVertical(
  pathname: string,
  vertical: OrganizationVertical,
): boolean {
  if (vertical === "beauty") {
    return !RIDES_ONLY_ROUTES.some((route) => matches(pathname, route));
  }
  return !matches(pathname, "/beauty");
}

export function verticalRedirectPath(
  pathname: string,
  vertical: OrganizationVertical,
): string | null {
  return isRouteAllowedForVertical(pathname, vertical)
    ? null
    : verticalHome(vertical);
}
