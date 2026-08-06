import Link from "next/link";
import { listAppointments, listBeautyClients, getBeautyProfile } from "@/lib/db/beauty";
import { fillsDueClients, isMissingAddOn } from "@/lib/business/beauty/intel";
import { BeautyHeader, BeautyLink, BeautyPanel } from "@/components/beauty/beauty-ui";
import { ReminderDrafts, type ReminderDraftRow } from "@/components/beauty/reminder-drafts";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const now = new Date();
  const [clients, appointments, profile] = await Promise.all([listBeautyClients(), listAppointments(), getBeautyProfile()]);
  const due = fillsDueClients(clients, appointments, now, 21, profile.timezone);
  const addOnDrafts: ReminderDraftRow[] = appointments.filter((appointment) => appointment.status === "booked" && new Date(appointment.starts_at) >= now && isMissingAddOn(appointment)).flatMap((appointment) => {
    const client = clients.find((candidate) => candidate.id === appointment.client_id);
    return client ? [{ id: `addon-${appointment.id}`, clientId: client.id, appointmentId: appointment.id, name: client.name, daysSince: 0, kind: "addon" }] : [];
  });
  const drafts: ReminderDraftRow[] = [
    ...due.map((item) => ({ id: `fill-${item.customer.id}`, clientId: item.customer.id, name: item.customer.name, daysSince: item.daysSince, kind: "fill" as const })),
    ...addOnDrafts,
  ];
  const businessName = profile.display_name?.trim() || "your beauty studio";

  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 pt-6">
      <BeautyHeader title="Clients" action={<BeautyLink href="/beauty/clients/new">Add client</BeautyLink>} />
      {drafts.length > 0 ? <BeautyPanel className="mt-6"><h2 className="text-sm font-semibold text-[var(--beauty-primary)]">Draft reminders</h2><ReminderDrafts rows={drafts} businessName={businessName} /></BeautyPanel> : null}
      <BeautyPanel className="mt-6 p-0">
        {clients.length ? <ul className="divide-y divide-[color:var(--beauty-border)]">{clients.map((client) => <li key={client.id}><Link className="flex justify-between p-4 hover:bg-white/5" href={`/beauty/clients/${client.id}`}><div><p className="text-sm text-stone-100">{client.name}</p><p className="text-xs text-stone-500">{[client.phone, client.email].filter(Boolean).join(" · ") || "No contact details"}</p></div><span className="text-xs text-[var(--beauty-primary)]">Open ?</span></Link></li>)}</ul> : <p className="p-8 text-center text-stone-500">No clients yet.</p>}
      </BeautyPanel>
    </main>
  );
}
