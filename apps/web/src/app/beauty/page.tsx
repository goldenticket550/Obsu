import Link from "next/link";
import { ObsidianIntelligence } from "@/components/command/obsidian-intelligence";
import { BeautyHeader, BeautyPanel, beautyPage } from "@/components/beauty/beauty-ui";
import {
  beautyDayRevenueCents,
  beautyGreeting,
  beautyPreviousDayRevenueCents,
  fillsDueClients,
  todaysRemainingAppointments,
} from "@/lib/business/beauty/intel";
import { getBeautyProfile, listAppointments, listBeautyClients } from "@/lib/db/beauty";
import { formatUsd } from "@/lib/money";
import type { Appointment } from "@/lib/types/beauty";
import styles from "./beauty-home.module.css";

export const dynamic = "force-dynamic";

function serviceSummary(appointment: Appointment): string {
  return appointment.appointment_services?.map((line) => line.name).join(" + ") || "Service unavailable";
}

export default async function BeautyDashboard() {
  const now = new Date();
  const [appointments, clients, profile] = await Promise.all([
    listAppointments(),
    listBeautyClients(),
    getBeautyProfile(),
  ]);
  const todayRevenue = beautyDayRevenueCents(appointments, now, profile.timezone);
  const yesterdayRevenue = beautyPreviousDayRevenueCents(appointments, now, profile.timezone);
  const revenueDelta = todayRevenue - yesterdayRevenue;
  const remaining = todaysRemainingAppointments(appointments, now, profile.timezone);
  const nextAppointment = remaining[0] ?? null;
  const due = fillsDueClients(clients, appointments, now, 21, profile.timezone);
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: profile.timezone,
  });
  const deltaCopy = revenueDelta === 0
    ? "Same as yesterday"
    : `${formatUsd(Math.abs(revenueDelta))} ${revenueDelta > 0 ? "more" : "less"} than yesterday`;

  return (
    <main className={`${beautyPage} ${styles.home} mx-auto max-w-5xl px-5 pt-6`}>
      <BeautyHeader title="Command Center" />
      <p className={styles.greeting}>{beautyGreeting(profile.owner_name, now, profile.timezone)}</p>
      <section className={styles.metrics} aria-label="Today's business overview">
        <article className={styles.metricCard}>
          <p className={styles.metricLabel}>Today&apos;s revenue</p>
          <p className={styles.metricValue}>{formatUsd(todayRevenue)}</p>
          <p className={styles.metricMeta}>{deltaCopy}{" \u00b7 "}completed appointments only</p>
        </article>
        <article className={styles.metricCard}>
          <p className={styles.metricLabel}>Remaining appointments</p>
          <p className={styles.metricValue}>{remaining.length}</p>
          <Link className={styles.metricLink} href="/beauty/appointments">View appointments</Link>
        </article>
        <article className={styles.metricCard}>
          <p className={styles.metricLabel}>Next client</p>
          <p className={styles.nextClient}>{nextAppointment?.client?.name ?? "No remaining clients"}</p>
          <p className={styles.metricMeta}>
            {nextAppointment ? `${timeFormatter.format(new Date(nextAppointment.starts_at))} \u00b7 ${serviceSummary(nextAppointment)}` : "No booked appointments remain today"}
          </p>
        </article>
        <article className={styles.metricCard}>
          <p className={styles.metricLabel}>Fills due</p>
          <p className={styles.metricValue}>{due.length}</p>
          <Link className={styles.metricLink} href="/beauty/clients">Review fill details</Link>
        </article>
      </section>

      <section className={styles.schedulePanel} aria-labelledby="today-schedule-heading">
        <div className={styles.sectionHeader}>
          <h2 id="today-schedule-heading" className={styles.sectionTitle}>Today&apos;s schedule</h2>
          <Link className={styles.scheduleLink} href="/beauty/appointments">View all</Link>
        </div>
        {remaining.length ? (
          <ul className={styles.scheduleList}>
            {remaining.map((appointment) => (
              <li key={appointment.id} className={styles.scheduleItem}>
                <Link className={styles.scheduleAppointment} href={`/beauty/appointments/${appointment.id}/edit`}>
                  <time className={styles.scheduleTime} dateTime={appointment.starts_at}>{timeFormatter.format(new Date(appointment.starts_at))}</time>
                  <span>
                    <span className={styles.scheduleClient}>{appointment.client?.name ?? "Walk-in"}</span>
                    <span className={styles.scheduleService}>{serviceSummary(appointment)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className={styles.scheduleEmpty}>No booked appointments remain today.</p>}
      </section>

      <nav className={styles.quickActions} aria-label="Beauty quick actions">
        <Link className={`${styles.quickAction} ${styles.quickActionPrimary}`} href="/beauty/appointments/new">New appointment</Link>
        <Link className={`${styles.quickAction} ${styles.quickActionSecondary}`} href="/beauty/clients/new">Add client</Link>
      </nav>

      <BeautyPanel tone="dark" className={`${styles.assistantPanel} mt-5 overflow-hidden`}>
        <div className="mb-5 text-center">
          <p className={styles.assistantEyebrow}>Ask Obsidian</p>
          <h2 className={styles.assistantHeading}>Your beauty back office, at a glance.</h2>
          <p className={styles.assistantBody}>Tap the shared orb or type a question. Answers use only verified records in this workspace.</p>
        </div>
        <ObsidianIntelligence
          needsAttention={due.length > 0}
          actionCount={due.length}
          showTodayOverview
          speakTypedAnswers
          todayOverviewClassName={styles.overviewButton}
        />
      </BeautyPanel>
      {appointments.length === 0 ? (
        <p className={styles.emptyState}>No appointments yet. Metrics will update when real bookings are recorded.</p>
      ) : null}
    </main>
  );
}
