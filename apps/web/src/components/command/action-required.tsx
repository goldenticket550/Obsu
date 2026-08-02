import Link from "next/link";
import type { ActionItem, ActionSeverity } from "@/lib/business/action-required";
import surfaces from "./command-surfaces.module.css";

/**
 * U2 — Action Required. Renders the prioritized list produced by the pure
 * rules. Severity uses the fixed colour semantics and is ALWAYS paired with a
 * word, never signalled by colour alone.
 */

const SEVERITY_STYLE: Record<ActionSeverity, { dot: string; word: string; label: string }> = {
  urgent: { dot: "bg-state-danger", word: "text-state-danger", label: "Urgent" },
  warning: { dot: "bg-state-warning", word: "text-state-warning", label: "Warning" },
  info: { dot: "bg-accent-soft", word: "text-accent-soft", label: "Review" },
};

export function ActionRequired({
  items,
  variant = "default",
}: {
  items: ActionItem[];
  variant?: "default" | "command";
}) {
  return (
    <section
      id="action-required"
      tabIndex={-1}
      data-scene-surface="attention"
      aria-labelledby="action-heading"
      className={`rounded-2xl border border-line bg-surface-raised/70 p-5 shadow-panel transition-colors duration-150 hover:border-accent-soft/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft ${variant === "command" ? surfaces.attentionRail : ""}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="action-heading"
          className="text-[11px] font-medium uppercase tracking-[0.18em] text-content-secondary"
        >
          Action required
        </h2>
        {items.length > 0 ? (
          <span className="text-[11px] tabular-nums text-content-muted">
            {items.length}
          </span>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-content-muted">Nothing needs your attention.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => {
            const style = SEVERITY_STYLE[item.severity];
            return (
              <li
                key={item.id}
                className="rounded-lg border border-line bg-surface-base/60 p-3 transition-colors duration-150 hover:border-accent-soft/45 hover:bg-surface-sunken/60 focus-within:border-accent-soft/55"
              >
                <div className="flex items-baseline gap-2">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
                  <span className={`text-[10px] uppercase tracking-wide ${style.word}`}>
                    {style.label}
                  </span>
                </div>

                <p className="mt-1 text-sm font-medium text-content-primary">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-content-secondary">
                  {item.detail}
                </p>
                <p className="mt-1 truncate text-[11px] text-content-muted" title={item.recordLabel}>
                  {item.recordLabel}
                </p>

                <Link
                  href={item.href}
                  className="mt-2 inline-flex min-h-[44px] items-center rounded-lg border border-line px-3 text-xs text-content-primary transition-colors hover:border-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
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
