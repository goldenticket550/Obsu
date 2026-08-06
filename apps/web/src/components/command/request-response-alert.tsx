import Link from "next/link";

export function requestResponseText(count: number): string | null {
  if (count <= 0) return null;
  return count === 1
    ? "1 request needs a response"
    : `${count} requests need a response`;
}

export function RequestResponseAlert({ count }: { count: number }) {
  const text = requestResponseText(count);
  if (!text) return null;

  return (
    <Link
      href="#action-required"
      className="group mt-4 inline-flex min-h-[44px] max-w-full items-center gap-3 rounded-full border border-[color:var(--workspace-primary)]/50 bg-black/35 px-4 text-sm text-[color:var(--workspace-primary)] shadow-[0_0_24px_color-mix(in_srgb,var(--workspace-primary)_10%,transparent)] backdrop-blur transition hover:border-[color:var(--workspace-primary)] hover:bg-black/55 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--workspace-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M12 8v5M12 17h.01" strokeLinecap="round" />
        <path d="M10.3 3.6 2.5 17.1A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.9L13.7 3.6a2 2 0 0 0-3.4 0Z" strokeLinejoin="round" />
      </svg>
      <span className="min-w-0 truncate">{text}</span>
      <span className="text-xl transition-transform group-hover:translate-x-0.5" aria-hidden="true">›</span>
    </Link>
  );
}
