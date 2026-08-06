"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { announceSignOut } from "@/lib/conversation";
import { isActiveDestination } from "@/lib/nav";
import { MOBILE_MORE_DESTINATIONS, MOBILE_NAV_DESTINATIONS } from "@/lib/mobile-nav";

function NavIcon({ label }: { label: string }) {
  const glyph = label === "Home" ? "⌂" : label === "Trips" ? "▱" : label === "Clients" ? "♙" : label === "Feedback" ? "▤" : "•••";
  return <span className="text-xl leading-none" aria-hidden="true">{glyph}</span>;
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

export function MobileNavigation() {
  const pathname = usePathname();
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
