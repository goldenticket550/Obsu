"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { announceSignOut } from "@/lib/conversation";
import { isActiveDestination } from "@/lib/nav";
import { MOBILE_MORE_DESTINATIONS, MOBILE_NAV_DESTINATIONS } from "@/lib/mobile-nav";

function NavIcon({ label }: { label: string }) {
  const paths: Record<string, string> = {
    Home: "M3 11.5 12 4l9 7.5M5.5 10v10h13V10M9 20v-6h6v6",
    Trips: "M5 16h14l-1.2-5.2A2 2 0 0 0 15.85 9H8.15a2 2 0 0 0-1.95 1.55L5 16Zm2 0v2m10-2v2M8 13h.01M16 13h.01",
    Clients: "M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3A4.5 4.5 0 0 0 4 18.5V20m6-10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 2a3 3 0 0 0 0-6m3 14v-1.5a4.5 4.5 0 0 0-2.5-4",
    Feedback: "M5 5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4.5 3v-3H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm3 4h8M8 13h5",
    Bookings: "M5 4v3m14-3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v13H4V7a1 1 0 0 1 1-1Zm3 7h3v3H8v-3Z",
    Services: "M4 7h10m4 0h2M4 12h3m4 0h9M4 17h8m4 0h4M14 5v4M7 10v4m5 1v4",
    Schedule: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 2",
    More: "M5 12h.01M12 12h.01M19 12h.01",
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[label] ?? paths.Home} />
    </svg>
  );
}

function Destination({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[64px] flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-obsidian-cyan ${active ? "text-obsidian-cyan" : "text-obsidian-muted hover:text-obsidian-silver"}`}
    >
      <NavIcon label={label} />
      <span>{label}</span>
    </Link>
  );
}

function BeautyNavIcon({ label }: { label: string }) {
  const paths: Record<string, string> = {
    Home: "M3 11.5 12 4l9 7.5M5.5 10v10h13V10M9 20v-6h6v6",
    Bookings: "M5 4v3m14-3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v13H4V7a1 1 0 0 1 1-1Zm3 7h3v3H8v-3Z",
    Services: "m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Zm6 11 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z",
    Clients: "M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-3A4.5 4.5 0 0 0 4 18.5V20m6-10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7 2a3 3 0 0 0 0-6m3 14v-1.5a4.5 4.5 0 0 0-2.5-4",
    Schedule: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 2",
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[label]} />
    </svg>
  );
}

function BeautyDestination({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-[64px] flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d6ad60] ${active ? "text-[#e2bd75]" : "text-[#c7b7a5] hover:text-[#f7efe3]"}`}
    >
      <BeautyNavIcon label={label} />
      <span>{label}</span>
    </Link>
  );
}

export function MobileNavigation({ beauty = false }: { beauty?: boolean }) {
  const pathname = usePathname();
  if (beauty) {
    const links = [{ href: "/beauty", label: "Home" }, { href: "/beauty/appointments", label: "Bookings" }, { href: "/beauty/services", label: "Services" }, { href: "/beauty/clients", label: "Clients" }, { href: "/beauty/schedule", label: "Schedule" }];
    return <nav aria-label="Beauty navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#d6ad60]/25 bg-[#1b120e]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_28px_rgba(0,0,0,0.24)] backdrop-blur lg:hidden"><ul className="grid grid-cols-5">{links.map((link) => <li key={link.href}><BeautyDestination {...link} active={isActiveDestination(pathname, link.href)} /></li>)}</ul></nav>;
  }
  const moreActive = MOBILE_MORE_DESTINATIONS.some(({ href }) => isActiveDestination(pathname, href));
  const primary = MOBILE_NAV_DESTINATIONS.slice(0, 3);
  const feedback = MOBILE_NAV_DESTINATIONS[3];

  return (
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-obsidian-line bg-obsidian-black/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="grid grid-cols-5">
        {primary.map(({ href, label }) => <li key={href}><Destination href={href} label={label} active={isActiveDestination(pathname, href)} /></li>)}
        <li>
          <details className="group relative">
            <summary aria-current={moreActive ? "page" : undefined} className={`flex min-h-[64px] cursor-pointer list-none flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-obsidian-cyan ${moreActive ? "text-obsidian-cyan" : "text-obsidian-muted"}`}>
              <NavIcon label="More" /><span>More</span>
            </summary>
            <div className="absolute bottom-[calc(100%+8px)] left-1/2 w-44 -translate-x-1/2 rounded-2xl border border-obsidian-line bg-obsidian-graphite p-2 shadow-panel">
              {MOBILE_MORE_DESTINATIONS.map(({ href, label }) => <Link key={href} href={href} className="flex min-h-[44px] items-center rounded-lg px-3 text-sm text-obsidian-silver hover:bg-obsidian-slate/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan">{label}</Link>)}
              <form action={signOut} onSubmit={announceSignOut} className="border-t border-obsidian-line pt-1">
                <button type="submit" className="min-h-[44px] w-full rounded-lg px-3 text-left text-sm text-obsidian-silver hover:bg-obsidian-slate/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan">Sign out</button>
              </form>
            </div>
          </details>
        </li>
        <li><Destination href={feedback.href} label={feedback.label} active={isActiveDestination(pathname, feedback.href)} /></li>
      </ul>
    </nav>
  );
}
