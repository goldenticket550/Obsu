"use client";

import type { ReactNode, SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { announceSignOut } from "@/lib/conversation";
import { CreateMenu } from "@/components/create-menu";
import { MobileNavigation } from "@/components/mobile-navigation";
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
      <header className="fixed inset-x-0 top-0 z-40 flex min-h-[64px] items-center justify-between border-b border-obsidian-line bg-obsidian-black/90 px-5 backdrop-blur lg:hidden">
        <Link
          href="/"
          className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan"
        >
          <span className="block text-base font-semibold tracking-[0.2em] text-obsidian-platinum">
            OBSIDIAN
          </span>
          <span className="block text-center text-[9px] uppercase tracking-[0.28em] text-obsidian-cyan">
            Rides
          </span>
        </Link>
        <details className="relative">
          <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border border-obsidian-line text-obsidian-platinum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan">
            <span className="sr-only">Open profile menu</span>
            <IconCustomers width={22} height={22} />
          </summary>
          <div className="absolute right-0 mt-2 w-36 rounded-xl border border-obsidian-line bg-obsidian-graphite p-2 shadow-panel">
            <form action={signOut} onSubmit={announceSignOut}>
              <button type="submit" className="min-h-[44px] w-full rounded-lg px-3 text-left text-sm text-obsidian-silver hover:bg-obsidian-slate/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan">
                Sign out
              </button>
            </form>
          </div>
        </details>
      </header>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden border-r border-obsidian-line bg-obsidian-graphite/70 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-56 lg:flex-col">
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

        {/* Primary create control (desktop). Menu opens upward from here. */}
        <div className="px-3 pb-3">
          <CreateMenu variant="sidebar" />
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
          {/* Clears any on-screen conversation BEFORE the server action
              navigates — transcripts name real customers, so they must not
              outlive the session even briefly. */}
          <form action={signOut} onSubmit={announceSignOut}>
            <button
              type="submit"
              className="flex min-h-[44px] w-full items-center rounded-lg px-3 text-sm text-obsidian-silver transition-colors hover:bg-obsidian-slate/50 hover:text-obsidian-platinum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-black"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* CONTENT — bottom padding on mobile clears the fixed bar AND the
          floating create button (plus the device's own safe area, e.g. the
          iPhone home indicator), so neither ever covers content at 320px. */}
      <div className="min-w-0 flex-1 pb-[calc(10rem+env(safe-area-inset-bottom))] pt-16 lg:pb-0 lg:pl-56 lg:pt-0">
        {children}
      </div>

      {/* MOBILE CREATE (FAB) — sits above the bottom bar, right-aligned, so it
          never overlaps navigation or the safe area. */}
      <div className={`fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 lg:hidden ${pathname === "/" ? "hidden" : ""}`}>
        <CreateMenu variant="fab" />
      </div>

      <MobileNavigation />
    </div>
  );
}
