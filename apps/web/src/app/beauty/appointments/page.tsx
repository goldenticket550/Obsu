import Link from "next/link";
import { listAppointments, getBeautyProfile } from "@/lib/db/beauty";
import { appointmentStatusLabel, balanceDueCents } from "@/lib/business/beauty/intel";
import { formatUsd } from "@/lib/money";
import { BeautyHeader, BeautyLink, beautyPage } from "@/components/beauty/beauty-ui";
import type { Appointment } from "@/lib/types/beauty";
import styles from "./appointments.module.css";

export const dynamic = "force-dynamic";

function appointmentDurationMinutes(appointment: Appointment): number {
  return Math.max(0, Math.round((new Date(appointment.ends_at).getTime() - new Date(appointment.starts_at).getTime()) / 60_000));
}

export default async function AppointmentsPage() {
  const now = new Date();
  const [rows, profile] = await Promise.all([listAppointments(), getBeautyProfile()]);
  const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: profile.timezone });
  const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: profile.timezone });
  const days = new Map<string, Appointment[]>();
  for (const appointment of rows) {
    const day = dayFormatter.format(new Date(appointment.starts_at));
    days.set(day, [...(days.get(day) ?? []), appointment]);
  }

  return (
    <main className={`${beautyPage} mx-auto max-w-4xl px-5 pt-6`}>
      <BeautyHeader title="Appointments" action={<BeautyLink href="/beauty/appointments/new">New appointment</BeautyLink>} />
      {rows.length ? (
        <div className={styles.days}>
          {Array.from(days.entries()).map(([day, appointments]) => (
            <section key={day} className={styles.day} aria-labelledby={`appointments-${day.replaceAll(" ", "-")}`}>
              <h2 className={styles.dayHeading} id={`appointments-${day.replaceAll(" ", "-")}`}>{day}</h2>
              <ol className={styles.timeline}>
                {appointments.map((appointment) => {
                  const balance = balanceDueCents(appointment);
                  const status = appointmentStatusLabel(appointment, now);
                  const services = appointment.appointment_services?.map((line) => line.name).join(" + ") || "Service unavailable";
                  return (
                    <li key={appointment.id} className={styles.item}>
                      <time className={styles.time} dateTime={appointment.starts_at}>{timeFormatter.format(new Date(appointment.starts_at))}</time>
                      <span className={styles.dot} aria-hidden="true" />
                      <Link href={`/beauty/appointments/${appointment.id}/edit`} className={styles.card}>
                        <span className={styles.cardHeader}>
                          <span className={styles.client}>{appointment.client?.name ?? "Walk-in"}</span>
                          <span className={styles.status} data-status={appointment.status}>{status}</span>
                        </span>
                        <span className={styles.service}>{services}</span>
                        <span className={styles.metaRow}>
                          <span className={styles.duration}>{appointmentDurationMinutes(appointment)} min</span>
                          <span className={styles.price}>
                            {formatUsd(appointment.price_cents)}
                            {balance > 0 ? <span className={styles.balance}>{formatUsd(balance)} due</span> : null}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      ) : <p className={styles.empty}>No appointments yet.</p>}
    </main>
  );
}
