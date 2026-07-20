import Link from "next/link";
import { listCustomers } from "@/lib/db/customers";
import { LinkButton, TopBar } from "@/components/form";
import { EmptyState, Panel } from "@/components/dashboard";

export default async function CustomersPage() {
  const customers = await listCustomers();
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-16 pt-6">
      <TopBar
        title="Customers"
        action={<LinkButton href="/customers/new">Add customer</LinkButton>}
      />
      <div className="mt-8">
        {customers.length === 0 ? (
          <Panel>
            <EmptyState>No customers yet. Add your first customer.</EmptyState>
          </Panel>
        ) : (
          <Panel className="p-0">
            <ul className="divide-y divide-obsidian-line">
              {customers.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/customers/${c.id}/edit`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-obsidian-slate/50"
                  >
                    <div>
                      <p className="text-sm font-medium text-obsidian-platinum">
                        {c.name}
                      </p>
                      <p className="text-xs text-obsidian-muted">
                        {[c.phone, c.email].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <span className="text-xs text-obsidian-silver">Edit →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>
    </main>
  );
}
