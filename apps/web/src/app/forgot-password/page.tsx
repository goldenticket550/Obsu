import Link from "next/link";
import { requestPasswordReset } from "./actions";

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string };
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-xl font-semibold tracking-[0.2em] text-obsidian-platinum">
            OBSIDIAN
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-obsidian-cyan">
            Rides
          </span>
        </div>
        <h1 className="mt-6 text-xl font-semibold text-obsidian-platinum">
          Reset your password
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-obsidian-silver">
          Enter your account email. We&apos;ll send a one-time recovery link if an
          account exists.
        </p>
      </div>

      <form className="flex flex-col gap-3">
        <label className="text-xs font-medium uppercase tracking-wider text-obsidian-silver">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-obsidian-line bg-obsidian-graphite px-3 py-3 text-sm text-obsidian-platinum placeholder:text-obsidian-muted focus:border-obsidian-cyan focus:outline-none"
            placeholder="you@example.com"
          />
        </label>
        <button
          formAction={requestPasswordReset}
          className="mt-2 min-h-[44px] rounded-lg bg-obsidian-platinum px-4 py-2 text-sm font-semibold text-obsidian-black transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan"
        >
          Send reset link
        </button>
      </form>

      {searchParams.error ? (
        <p className="mt-4 rounded-lg border border-obsidian-negative/40 bg-obsidian-negative/10 px-3 py-2 text-sm text-obsidian-negative">
          {searchParams.error}
        </p>
      ) : null}
      {searchParams.message ? (
        <p className="mt-4 rounded-lg border border-obsidian-cyan/40 bg-obsidian-cyan/10 px-3 py-2 text-sm text-obsidian-cyan">
          {searchParams.message}
        </p>
      ) : null}

      <Link
        href="/login"
        className="mt-6 text-center text-sm text-obsidian-silver underline decoration-obsidian-line underline-offset-4 transition-colors hover:text-obsidian-platinum focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan"
      >
        Back to sign in
      </Link>
    </main>
  );
}
