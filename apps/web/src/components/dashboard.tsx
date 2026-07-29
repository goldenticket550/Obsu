import type { ReactNode } from "react";

/**
 * Shared presentational building blocks. Pure UI — no business logic, no data
 * fetching.
 *
 * U3: StatCard and QuickAction were removed. Business Pulse supersedes
 * StatCard (two metric-card components would drift apart), and the Create menu
 * needs real `role="menuitem"` semantics rather than QuickAction's link/disabled
 * pair — whose disabled branch was a "coming soon" placeholder this project
 * does not ship.
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

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm leading-relaxed text-obsidian-muted">{children}</p>
  );
}
