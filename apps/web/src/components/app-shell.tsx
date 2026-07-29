"use client";

import type { ReactNode, SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";
import {
  NAV_DESTINATIONS,
  isActiveDestination,
  isChromeless,
} from "@/lib/nav";

/**
 * U1 — the persistent app shell: a sidebar on desktop, a fixed bottom bar on
 * mobile.
 *
 * QUERY-FREE BY DESIGN. This component fetches nothing and receives no data,
 * so adding the shell costs zero database work per page render. Counts and
 * "needs attention" indicators belong on the dashboard (U2), not in the nav.
 *
 * It lives inside the root layout, so Next keeps it mounted across navigations
 * between these routes — the chrome does not remount or flash, only the page
 * content swaps.
 */

/**
 * Destinations and the chromeless/active rules come from lib/nav.ts, which is
 * pure and unit-tested — this component only renders them.
 */
const ICONS: Record<string, (p: SVGProps<SVGSVGElement>) => ReactNode> = {
  "/": IconDashboard,
  "/upcoming": IconUpcoming,
  "/trips": IconTrips,
  "/customers": IconCustomers,
  "/expenses": IconExpenses,
};

const iconProps: SVGProps<SVGSVGElement> = {
  width: 20,
  height: 20,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

function IconDashboard(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...p}>
      <rect x="2.5" y="2.5" width="6" height="6" rx="1" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="1" />
      <rect x="2.5" y="11.5" width="6" height="6" rx="1" />
      <rect x="11.5" y="11.5" width="6" height="6" rx="1" />
    </svg>
  );
}
function IconUpcoming(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...p}>
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 5.5V10l3 2" />
    </svg>
  );
}
function IconTrips(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...p}>
      <path d="M2.5 13.5h15" />
      <path d="M4.5 13.5V9l2-3.5h7L15.5 9v4.5" />
      <circle cx="6.5" cy="15.5" r="1.2" />
      <circle cx="13.5" cy="15.5" r="1.2" />
    </svg>
  );
}
function IconCustomers(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...p}>
      <circle cx="10" cy="7" r="3" />
      <path d="M4 16.5c0-3 2.7-4.5 6-4.5s6 1.5 6 4.5" />
    </svg>
  );
}
function IconExpenses(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...p}>
      <rect x="2.5" y="5" width="15" height="10" rx="1.5" />
      <path d="M2.5 8.5h15" />
    </svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Pre-auth / pre-org screens render exactly as they did before the shell
  // existed — no sidebar, no bottom bar, nothing that could interfere with the
  // sign-in redirect or the onboarding flow.
  if (isChromeless(pathname)) return <>{children}</>;

  return (
    <div className="min-h-screen lg:flex">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden border-r border-obsidian-line bg-obsidian-graphite/40 lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-56 lg:flex-col">
        <div className="px-5 py-5">
          <Link
            href="/"
            className="inline-flex items-baseline gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-black"
          >
            <span className="text-lg font-semibold tracking-[0.2em] text-obsidian-platinum">
              OBSIDIAN
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-obsidian-cyan">
              Rides
            </span>
          </Link>
        </div>

        <nav aria-label="Main" className="flex-1 px-3">
          <ul className="flex flex-col gap-1">
            {NAV_DESTINATIONS.map(({ href, label }) => {
              const active = isActiveDestination(pathname, href);
              const Icon = ICONS[href];
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-black ${
                      active
                        ? "bg-obsidian-cyan/10 text-obsidian-platinum"
                        : "text-obsidian-silver hover:bg-obsidian-slate/50 hover:text-obsidian-platinum"
                    }`}
                  >
                    {Icon ? <Icon /> : null}
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-obsidian-line px-3 py-3">
          <form action={signOut}>
            <button
              type="submit"
              className="flex min-h-[44px] w-full items-center rounded-lg px-3 text-sm text-obsidian-silver transition-colors hover:bg-obsidian-slate/50 hover:text-obsidian-platinum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-black"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* CONTENT — bottom padding on mobile clears the fixed bar (plus the
          device's own safe area, e.g. the iPhone home indicator). */}
      <div className="min-w-0 flex-1 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-56">
        {children}
      </div>

      {/* MOBILE BOTTOM BAR */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-obsidian-line bg-obsidian-black/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="flex items-stretch justify-around">
          {NAV_DESTINATIONS.map(({ href, label }) => {
            const active = isActiveDestination(pathname, href);
            const Icon = ICONS[href];
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-obsidian-cyan ${
                    active ? "text-obsidian-cyan" : "text-obsidian-muted"
                  }`}
                >
                  {Icon ? <Icon /> : null}
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
