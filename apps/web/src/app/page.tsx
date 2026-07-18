import {
  EmptyState,
  Panel,
  QuickAction,
  SectionLabel,
  StatCard,
} from "@/components/dashboard";

/**
 * OBSIDIAN RIDES — dashboard shell (M1, Foundation).
 *
 * This is a static preview. It renders the intended layout with placeholder
 * values so the app boots and the design is visible. No database, no auth,
 * and no real numbers yet — those arrive in later phases (auth M2, data M3,
 * business engine M5, live dashboard M6, Ask OBSIDIAN M7).
 */
export default function DashboardPage() {
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
        <span className="flex items-center gap-2 text-xs text-obsidian-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-obsidian-cyan" />
          Preview shell
        </span>
      </header>

      {/* Greeting */}
      <section className="mt-8">
        <h1 className="text-2xl font-semibold text-obsidian-platinum">
          Good morning.
        </h1>
        <p className="mt-1 text-sm text-obsidian-silver">
          Midnight Rydes at a glance. Your live numbers appear here once your
          data is connected.
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
        OBSIDIAN · Your Business. Our A.I. · M1 Foundation preview
      </footer>
    </main>
  );
}
