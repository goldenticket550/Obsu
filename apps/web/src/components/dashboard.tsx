import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Presentational building blocks for the OBSIDIAN dashboard shell.
 * These are pure UI (no business logic, no data fetching) — M1 renders
 * static placeholders. Real values are wired in from the business engine
 * (M5) and dashboard phase (M6).
 */

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-obsidian-silver">
      {children}
    </h2>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-obsidian-line bg-obsidian-graphite p-5 shadow-panel ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <Panel>
      <p className="text-xs font-medium uppercase tracking-wider text-obsidian-silver">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-semibold tabular-nums ${
          accent ? "text-obsidian-cyan" : "text-obsidian-platinum"
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-obsidian-muted">{hint}</p> : null}
    </Panel>
  );
}

export function QuickAction({ label, href }: { label: string; href?: string }) {
  // With an href (M4 CRUD) it links; without one it stays disabled (e.g. Ask
  // OBSIDIAN, wired in M7).
  if (href) {
    return (
      <Link
        href={href}
        className="rounded-lg border border-obsidian-line bg-obsidian-slate px-4 py-3 text-center text-sm font-medium text-obsidian-platinum transition-colors hover:border-obsidian-cyan"
      >
        {label}
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled
      title="Available in an upcoming phase"
      className="cursor-not-allowed rounded-lg border border-obsidian-line bg-obsidian-slate px-4 py-3 text-sm font-medium text-obsidian-silver transition-colors"
    >
      {label}
    </button>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm leading-relaxed text-obsidian-muted">{children}</p>
  );
}
