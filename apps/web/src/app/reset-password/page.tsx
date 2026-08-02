import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { updateRecoveredPassword } from "./actions";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      "/forgot-password?error=" +
        encodeURIComponent("Request a password-reset link before choosing a new password."),
    );
  }

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
          Choose a new password
        </h1>
        <p className="mt-2 text-sm text-obsidian-silver">
          Use at least 6 characters and enter it twice.
        </p>
      </div>

      <form className="flex flex-col gap-3">
        <label className="text-xs font-medium uppercase tracking-wider text-obsidian-silver">
          New password
          <input
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-obsidian-line bg-obsidian-graphite px-3 py-3 text-sm text-obsidian-platinum focus:border-obsidian-cyan focus:outline-none"
          />
        </label>
        <label className="text-xs font-medium uppercase tracking-wider text-obsidian-silver">
          Confirm password
          <input
            name="confirmation"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="mt-1 w-full rounded-lg border border-obsidian-line bg-obsidian-graphite px-3 py-3 text-sm text-obsidian-platinum focus:border-obsidian-cyan focus:outline-none"
          />
        </label>
        <button
          formAction={updateRecoveredPassword}
          className="mt-2 min-h-[44px] rounded-lg bg-obsidian-platinum px-4 py-2 text-sm font-semibold text-obsidian-black transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan"
        >
          Update password
        </button>
      </form>

      {searchParams.error ? (
        <p className="mt-4 rounded-lg border border-obsidian-negative/40 bg-obsidian-negative/10 px-3 py-2 text-sm text-obsidian-negative">
          {searchParams.error}
        </p>
      ) : null}
    </main>
  );
}
