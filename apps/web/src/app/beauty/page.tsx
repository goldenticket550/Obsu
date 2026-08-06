import { ObsidianIntelligence } from "@/components/command/obsidian-intelligence";
import { BeautyHeader, BeautyPanel } from "@/components/beauty/beauty-ui";
import { beautyMonthRevenueCents, fillsDueClients, upcomingAppointments } from "@/lib/business/beauty/intel";
import { getBeautyProfile, listAppointments, listBeautyClients } from "@/lib/db/beauty";
import { formatUsd } from "@/lib/money";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BeautyDashboard() {
  const now = new Date();
  const [appointments, clients, profile] = await Promise.all([listAppointments(), listBeautyClients(), getBeautyProfile()]);
  const revenue = beautyMonthRevenueCents(appointments, now, profile.timezone);
  const upcoming = upcomingAppointments(appointments, now);
  const due = fillsDueClients(clients, appointments, now, 21, profile.timezone);
  return (
    <main className="mx-auto max-w-5xl px-5 pb-20 pt-6">
      <BeautyHeader title="Command Center" />
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <BeautyPanel><p className="text-xs uppercase tracking-widest text-stone-500">Month revenue</p><p className="mt-2 text-3xl text-[var(--beauty-primary)]">{formatUsd(revenue)}</p><p className="mt-2 text-xs text-stone-500">Completed appointments only · {profile.timezone}</p></BeautyPanel>
        <BeautyPanel><p className="text-xs uppercase tracking-widest text-stone-500">Upcoming</p><p className="mt-2 text-3xl text-stone-100">{upcoming.length}</p><Link className="mt-2 block text-xs text-[var(--beauty-primary)]" href="/beauty/appointments">View appointments ?</Link></BeautyPanel>
        <BeautyPanel><p className="text-xs uppercase tracking-widest text-stone-500">Fills due</p><p className="mt-2 text-3xl text-stone-100">{due.length}</p><Link className="mt-2 block text-xs text-[var(--beauty-primary)]" href="/beauty/clients">Review drafts ?</Link></BeautyPanel>
      </section>
      <BeautyPanel className="mt-5 overflow-hidden"><div className="mb-5 text-center"><p className="text-xs uppercase tracking-[.25em] text-[var(--beauty-primary)]">Ask Obsidian</p><h2 className="mt-2 text-2xl text-stone-100">Your beauty back office, at a glance.</h2><p className="mt-2 text-sm text-stone-400">Tap the shared orb or type a question. Answers use only verified records in this workspace.</p></div><ObsidianIntelligence needsAttention={due.length > 0} actionCount={due.length} /></BeautyPanel>
      {upcoming.length === 0 ? <BeautyPanel className="mt-5 text-center text-sm text-stone-500">No upcoming appointments yet. Your dashboard will stay honest until bookings are recorded.</BeautyPanel> : null}
    </main>
  );
}
