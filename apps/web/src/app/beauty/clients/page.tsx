import Link from "next/link";
import { listAppointments, listBeautyClients, getBeautyProfile } from "@/lib/db/beauty";
import { balanceDueCents, fillsDueClients, isMissingAddOn } from "@/lib/business/beauty/intel";
import { formatUsd } from "@/lib/money";
import {
  BeautyHeader,
  BeautyLink,
  BeautyPanel,
  beautyPage,
  beautyPanelTitle,
} from "@/components/beauty/beauty-ui";
import { ReminderDrafts, type ReminderDraftRow } from "@/components/beauty/reminder-drafts";
import styles from "./clients.module.css";

export const dynamic = "force-dynamic";

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "—";
}

export default async function ClientsPage() {
  const now = new Date();
  const [clients, appointments, profile] = await Promise.all([listBeautyClients(), listAppointments(), getBeautyProfile()]);
  const due = fillsDueClients(clients, appointments, now, 21, profile.timezone);
  const addOnDrafts: ReminderDraftRow[] = appointments.filter((appointment) => appointment.status === "booked" && new Date(appointment.starts_at) >= now && isMissingAddOn(appointment)).flatMap((appointment) => {
    const client = clients.find((candidate) => candidate.id === appointment.client_id);
    return client ? [{ id: `addon-${appointment.id}`, clientId: client.id, appointmentId: appointment.id, name: client.name, daysSince: 0, kind: "addon" }] : [];
  });
  const businessName = profile.display_name?.trim() || "your beauty studio";

  return (
    <main className={`${beautyPage} mx-auto max-w-4xl px-5 pt-6`}>
      <BeautyHeader title="Clients" action={<BeautyLink href="/beauty/clients/new">Add client</BeautyLink>} />

      <section className={styles.lead} aria-labelledby="fills-due-heading">
        <div className={styles.leadHeader}>
          <h2 id="fills-due-heading" className={styles.leadTitle}>Fills Due</h2>
          <p className={styles.leadMeta}>{due.length} due</p>
        </div>
        {due.length ? (
          <ol className={styles.dueList}>
            {due.map((item, index) => {
              const balance = balanceDueCents(item.lastAppointment);
              const missingAddOn = isMissingAddOn(item.lastAppointment);
              const services = item.lastAppointment.appointment_services?.map((line) => line.name).join(" + ") || "Service unavailable";
              const fillDraft: ReminderDraftRow = {
                id: `fill-${item.customer.id}`,
                clientId: item.customer.id,
                name: item.customer.name,
                daysSince: item.daysSince,
                kind: "fill",
              };
              return (
                <li key={item.customer.id} className={styles.dueCard}>
                  <span className={styles.rank}>{index + 1}</span>
                  <span className={styles.avatar} aria-hidden="true">{initials(item.customer.name)}</span>
                  <div className={styles.dueBody}>
                    <div className={styles.dueHeader}>
                      <p className={styles.clientName}>{item.customer.name}</p>
                      <span className={styles.daysBadge}>{item.daysSince} days</span>
                    </div>
                    <p className={styles.lastService}>Last service: {services}</p>
                    {balance > 0 || missingAddOn ? (
                      <div className={styles.pills}>
                        {balance > 0 ? <span className={`${styles.pill} ${styles.pillAlert}`}>Balance due {formatUsd(balance)}</span> : null}
                        {missingAddOn ? <span className={styles.pill}>Missing add-on</span> : null}
                      </div>
                    ) : null}
                  </div>
                  <div className={styles.draftArea}>
                    <ReminderDrafts rows={[fillDraft]} businessName={businessName} />
                  </div>
                </li>
              );
            })}
          </ol>
        ) : <p className={styles.emptyDue}>No repeat lash clients are currently past the fill-due threshold.</p>}
      </section>

      {addOnDrafts.length > 0 ? (
        <BeautyPanel className={styles.sectionPanel}>
          <h2 className={beautyPanelTitle}>Possible missing add-ons</h2>
          <ReminderDrafts rows={addOnDrafts} businessName={businessName} />
        </BeautyPanel>
      ) : null}

      <BeautyPanel className={styles.directory}>
        <h2 className={beautyPanelTitle}>All clients</h2>
        {clients.length ? (
          <ul className={styles.directoryList}>
            {clients.map((client) => (
              <li key={client.id} className={styles.directoryItem}>
                <Link className={styles.directoryLink} href={`/beauty/clients/${client.id}`}>
                  <span className={styles.directoryCopy}>
                    <span className={styles.directoryName}>{client.name}</span>
                    <span className={styles.directoryContact}>{[client.phone, client.email].filter(Boolean).join(" \u00b7 ") || "No contact details"}</span>
                  </span>
                  <span className={styles.open}>Open {"\u2192"}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className={styles.emptyClients}>No clients yet.</p>}
      </BeautyPanel>
    </main>
  );
}
