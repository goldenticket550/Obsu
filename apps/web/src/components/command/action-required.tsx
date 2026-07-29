import Link from "next/link";
import type { ActionItem, ActionSeverity } from "@/lib/business/action-required";

/**
 * U2 — Action Required. Renders the prioritized list produced by the pure
 * rules. Severity uses the fixed colour semantics and is ALWAYS paired with a
 * word, never signalled by colour alone.
 */

const SEVERITY_STYLE: Record<ActionSeverity, { dot: string; word: string; label: string }> = {
  urgent: { dot: "bg-obsidian-negative", word: "text-obsidian-negative", label: "Urgent" },
  warning: { dot: "bg-obsidian-amber", word: "text-obsidian-amber", label: "Warning" },
  info: { dot: "bg-obsidian-cyan", word: "text-obsidian-cyan", label: "Review" },
};

export function ActionRequired({ items }: { items: ActionItem[] }) {
  return (
    <section
      aria-labelledby="action-heading"
      className="rounded-2xl border border-obsidian-line bg-obsidian-graphite/60 p-5 shadow-panel"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="action-heading"
          className="text-[11px] font-medium uppercase tracking-[0.18em] text-obsidian-silver"
        >
          Action required
        </h2>
        {items.length > 0 ? (
          <span className="text-[11px] tabular-nums text-obsidian-muted">
            {items.length}
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-obsidian-muted">Nothing needs your attention.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => {
            const style = SEVERITY_STYLE[item.severity];
            return (
              <li
                key={item.id}
                className="rounded-lg border border-obsidian-line bg-obsidian-black/40 p-3"
              >
                <div className="flex items-baseline gap-2">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
                  <span className={`text-[10px] uppercase tracking-wide ${style.word}`}>
                    {style.label}
                  </span>
                </div>

                <p className="mt-1 text-sm font-medium text-obsidian-platinum">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-obsidian-silver">
                  {item.detail}
                </p>
                <p className="mt-1 truncate text-[11px] text-obsidian-muted" title={item.recordLabel}>
                  {item.recordLabel}
                </p>

                <Link
                  href={item.href}
                  className="mt-2 inline-flex min-h-[44px] items-center rounded-lg border border-obsidian-line px-3 text-xs text-obsidian-platinum transition-colors hover:border-obsidian-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-black"
                >
                  {item.actionLabel} →
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
