import { createOrg } from "./actions";

/**
 * OBSIDIAN RIDES — first-run business setup (M2).
 * Shown when a signed-in user has no organization yet.
 */
export default function OnboardingPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
      <div className="mb-8">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold tracking-[0.2em] text-obsidian-platinum">
            OBSIDIAN
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-obsidian-cyan">
            Rides
          </span>
        </div>
        <h1 className="mt-6 text-2xl font-semibold text-obsidian-platinum">
          Name your business.
        </h1>
        <p className="mt-1 text-sm text-obsidian-silver">
          This is the business OBSIDIAN will manage. You can use{" "}
          <span className="text-obsidian-platinum">Midnight Rydes</span>.
        </p>
      </div>

      <form className="flex flex-col gap-3">
        <label className="text-xs font-medium uppercase tracking-wider text-obsidian-silver">
          Business name
          <input
            name="name"
            type="text"
            required
            defaultValue="Midnight Rydes"
            className="mt-1 w-full rounded-lg border border-obsidian-line bg-obsidian-graphite px-3 py-2 text-sm text-obsidian-platinum placeholder:text-obsidian-muted focus:border-obsidian-cyan focus:outline-none"
          />
        </label>
        <button
          type="submit"
          formAction={createOrg}
          className="mt-2 rounded-lg bg-obsidian-platinum px-4 py-2 text-sm font-semibold text-obsidian-black transition-opacity hover:opacity-90"
        >
          Create business
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
