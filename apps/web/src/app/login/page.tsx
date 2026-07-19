import { signIn, signUp } from "./actions";

/**
 * OBSIDIAN RIDES — sign in / create account (M2).
 * One form, two buttons: "Sign in" and "Create account" post to different
 * server actions via formAction. No client-side JavaScript required.
 */
export default function LoginPage({
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
        <p className="mt-2 text-sm text-obsidian-silver">
          Sign in to your business.
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
            className="mt-1 w-full rounded-lg border border-obsidian-line bg-obsidian-graphite px-3 py-2 text-sm text-obsidian-platinum placeholder:text-obsidian-muted focus:border-obsidian-cyan focus:outline-none"
            placeholder="you@example.com"
          />
        </label>

        <label className="text-xs font-medium uppercase tracking-wider text-obsidian-silver">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-obsidian-line bg-obsidian-graphite px-3 py-2 text-sm text-obsidian-platinum placeholder:text-obsidian-muted focus:border-obsidian-cyan focus:outline-none"
            placeholder="••••••••"
          />
        </label>

        <button
          formAction={signIn}
          className="mt-2 rounded-lg bg-obsidian-platinum px-4 py-2 text-sm font-semibold text-obsidian-black transition-opacity hover:opacity-90"
        >
          Sign in
        </button>
        <button
          formAction={signUp}
          className="rounded-lg border border-obsidian-line bg-obsidian-slate px-4 py-2 text-sm font-medium text-obsidian-platinum transition-colors hover:border-obsidian-cyan"
        >
          Create account
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
    </main>
  );
}
