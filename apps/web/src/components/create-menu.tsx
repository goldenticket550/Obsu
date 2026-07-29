"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * U3 — Universal Create.
 *
 * One primary create control, always reachable: a floating action button on
 * mobile and a button in the sidebar on desktop. Both render this component;
 * `variant` only changes where the trigger sits and how the menu is anchored.
 *
 * Every destination is a flow that already exists — no placeholders.
 *
 * Keyboard contract: Escape closes, focus is trapped in the menu while open,
 * focus returns to the trigger on close, and Up/Down move between items.
 */

const ITEMS: { href: string; label: string }[] = [
  { href: "/trips/new?status=scheduled", label: "Schedule a ride" },
  { href: "/trips/new", label: "Log a completed trip" },
  { href: "/expenses/new", label: "Add expense" },
  { href: "/customers/new", label: "Add customer" },
];

export function CreateMenu({ variant }: { variant: "sidebar" | "fab" }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const pathname = usePathname();

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Navigating away closes the menu (the link click itself is a navigation).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Move focus into the menu when it opens.
  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>("[data-menu-item]");
    first?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }

      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>("[data-menu-item]") ?? [],
      );
      if (items.length === 0) return;
      const index = items.findIndex((el) => el === document.activeElement);

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        const next = items[(index + delta + items.length) % items.length];
        next?.focus();
        return;
      }

      // Focus trap: Tab cycles within the menu rather than escaping to the page
      // behind it.
      if (event.key === "Tab") {
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    // A click outside dismisses without stealing focus back.
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) close(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, close]);

  const isFab = variant === "fab";

  const triggerClass = isFab
    ? "flex h-14 w-14 items-center justify-center rounded-full bg-obsidian-blue text-white shadow-lg shadow-black/40 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-black active:scale-95"
    : "flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-obsidian-blue px-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-black";

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={isFab ? "Create" : undefined}
        className={triggerClass}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M10 4v12M4 10h12" />
        </svg>
        {isFab ? null : "Create"}
      </button>

      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Create"
          className={`absolute z-50 w-56 overflow-hidden rounded-xl border border-obsidian-line bg-obsidian-graphite shadow-panel ${
            isFab ? "bottom-16 right-0" : "left-0 top-full mt-2"
          }`}
        >
          <ul className="py-1">
            {ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  role="menuitem"
                  data-menu-item
                  onClick={() => setOpen(false)}
                  className="flex min-h-[44px] items-center px-4 text-sm text-obsidian-platinum transition-colors hover:bg-obsidian-slate focus:bg-obsidian-slate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-obsidian-cyan"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
