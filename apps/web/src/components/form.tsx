import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import Link from "next/link";

/**
 * Presentational form + page-chrome primitives for the CRUD screens (M4).
 * Pure UI — no data access, no business logic (build rule #6). They reuse the
 * OBSIDIAN dark theme tokens so every screen matches the dashboard.
 */

const controlClass =
  "mt-1 w-full rounded-lg border border-obsidian-line bg-obsidian-graphite px-3 py-2 text-sm text-obsidian-platinum placeholder:text-obsidian-muted focus:border-obsidian-cyan focus:outline-none";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-xs font-medium uppercase tracking-wider text-obsidian-silver">
      {label}
      {children}
      {hint ? (
        <span className="mt-1 block text-[11px] normal-case tracking-normal text-obsidian-muted">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={controlClass} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={controlClass} />;
}

export function Select({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={controlClass}>
      {children}
    </select>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-obsidian-negative/40 bg-obsidian-negative/10 px-3 py-2 text-sm text-obsidian-negative">
      {message}
    </p>
  );
}

export function SubmitButton({ children }: { children: ReactNode }) {
  return (
    <button
      type="submit"
      className="rounded-lg bg-obsidian-platinum px-4 py-2 text-sm font-semibold text-obsidian-black transition-opacity hover:opacity-90"
    >
      {children}
    </button>
  );
}

export function CancelLink({
  href,
  children = "Cancel",
}: {
  href: string;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-obsidian-line px-4 py-2 text-center text-sm text-obsidian-silver transition-colors hover:border-obsidian-cyan hover:text-obsidian-platinum"
    >
      {children}
    </Link>
  );
}

/** Primary link styled like a button (for "Add" actions in list headers). */
export function LinkButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg bg-obsidian-platinum px-3 py-1.5 text-xs font-semibold text-obsidian-black transition-opacity hover:opacity-90"
    >
      {children}
    </Link>
  );
}

/** Top bar for CRUD pages: back arrow + OBSIDIAN mark + section title + action. */
export function TopBar({
  title,
  backHref = "/",
  action,
}: {
  title: string;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link
          href={backHref}
          aria-label="Back"
          className="text-obsidian-silver transition-colors hover:text-obsidian-platinum"
        >
          ←
        </Link>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tracking-[0.2em] text-obsidian-platinum">
            OBSIDIAN
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-obsidian-cyan">
            Rides
          </span>
        </div>
        <span className="text-sm text-obsidian-silver">/ {title}</span>
      </div>
      {action}
    </header>
  );
}
