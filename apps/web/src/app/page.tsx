import { redirect } from "next/navigation";
import {
  EmptyState,
  Panel,
  QuickAction,
  SectionLabel,
  StatCard,
} from "@/components/dashboard";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { signOut } from "./login/actions";

/**
 * OBSIDIAN RIDES — dashboard (M2).
 *
 * Now protected: requires a signed-in user (middleware also guards this) and a
 * business (Organization). New users with no org are sent to /onboarding.
 * The stat cards are still placeholders — real trip/expense data arrives in
 * M3–M6. This phase proves auth + tenancy + the personalized shell.
 */
export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Find the user's business. RLS ensures they only ever see their own.
  const { data: memberships } = await supabase
    .from("memberships")
    .select("organization_id, role")
    .limit(1);

  const membership = memberships?.[0];
  if (!membership) redirect("/onboarding");

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", membership.organization_id)
    .single();

  const businessName: string = org?.name ?? "Your business";

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-16 pt-6">
      {/* Top bar */}
      <header className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tracking-[0.2em] text-obsidian-platinum">
            OBSIDIAN
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-obsidian-cyan">
            Rides
          </span>
        </div>
        <form action={signOut} className="flex items-center gap-3">
          <span className="hidden text-xs text-obsidian-muted sm:inline">
            {user.email}
          </span>
          <button
            type="submit"
            className="rounded-lg border border-obsidian-line px-3 py-1.5 text-xs text-obsidian-silver transition-colors hover:border-obsidian-cyan hover:text-obsidian-platinum"
          >
            Sign out
          </button>
        </form>
      </header>

      {/* Greeting */}
      <section className="mt-8">
        <h1 className="text-2xl font-semibold text-obsidian-platinum">
          Good morning.
        </h1>
        <p className="mt-1 text-sm text-obsidian-silver">
          {businessName} at a glance. Your live numbers appear here once you
          start logging trips.
        </p>
      </section>

      {/* This month */}
      <section className="mt-8">
        <SectionLabel>This Month</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Revenue" value="—" hint="Awaiting data" />
          <StatCard label="Recorded Expenses" value="—" hint="Awaiting data" />
          <StatCard
            label="Est. Operating Profit"
            value="—"
            hint="Estimated"
            accent
          />
          <StatCard label="Trips" value="—" hint="Awaiting data" />
        </div>
        <p className="mt-2 text-xs text-obsidian-muted">
          Average trip value will be shown here. Profit is an{" "}
          <span className="text-obsidian-silver">estimate</span> based on
          trip-linked expenses — not audited net income.
        </p>
      </section>

      {/* Customer insights */}
      <section className="mt-8">
        <SectionLabel>Customer Insights</SectionLabel>
        <Panel>
          <EmptyState>
            Follow-up opportunities — repeat customers who have gone quiet —
            will surface here once trips are being logged.
          </EmptyState>
        </Panel>
      </section>

      {/* Recent activity */}
      <section className="mt-8">
        <SectionLabel>Recent Activity</SectionLabel>
        <Panel>
          <EmptyState>No trips or expenses recorded yet.</EmptyState>
        </Panel>
      </section>

      {/* Quick actions */}
      <section className="mt-8">
        <SectionLabel>Quick Actions</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction label="Log Trip" />
          <QuickAction label="Add Expense" />
          <QuickAction label="Add Customer" />
          <QuickAction label="Ask OBSIDIAN" />
        </div>
      </section>

      {/* Ask OBSIDIAN */}
      <section className="mt-8">
        <SectionLabel>Ask OBSIDIAN</SectionLabel>
        <div className="flex items-center gap-2 rounded-xl border border-obsidian-line bg-obsidian-graphite p-2 shadow-panel">
          <input
            type="text"
            disabled
            placeholder="Ask anything about your business…"
            className="flex-1 bg-transparent px-3 py-2 text-sm text-obsidian-platinum placeholder:text-obsidian-muted focus:outline-none"
          />
          <span
            aria-hidden
            className="select-none rounded-lg border border-obsidian-line px-3 py-2 text-obsidian-muted"
            title="Voice input is out of MVP scope"
          >
            🎙
          </span>
        </div>
        <p className="mt-2 text-xs text-obsidian-muted">
          The assistant answers from your verified business data — never
          guessed numbers. Enabled in a later phase.
        </p>
      </section>

      <footer className="mt-12 border-t border-obsidian-line pt-5 text-center text-xs text-obsidian-muted">
        OBSIDIAN · Your Business. Our A.I. · M2 — signed in as {user.email}
      </footer>
    </main>
  );
}
