import Link from "next/link";
import { listAppointments, getBeautyProfile } from "@/lib/db/beauty";
import { balanceDueCents } from "@/lib/business/beauty/intel";
import { formatUsd } from "@/lib/money";
import { BeautyHeader, BeautyLink, BeautyPanel } from "@/components/beauty/beauty-ui";

export const dynamic = "force-dynamic";
export default async function AppointmentsPage() {
  const [rows, profile] = await Promise.all([listAppointments(), getBeautyProfile()]);
  const formatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: profile.timezone });
  return <main className="mx-auto max-w-4xl px-5 pb-20 pt-6"><BeautyHeader title="Appointments" action={<BeautyLink href="/beauty/appointments/new">Book appointment</BeautyLink>} /><BeautyPanel className="mt-6 p-0">{rows.length ? <ul className="divide-y divide-[color:var(--beauty-border)]">{rows.map((appointment) => <li key={appointment.id}><Link href={`/beauty/appointments/${appointment.id}/edit`} className="grid gap-2 p-4 hover:bg-white/5 sm:grid-cols-[1fr_auto]"><div><p className="text-sm text-stone-100">{appointment.client?.name ?? "Walk-in"}</p><p className="text-xs text-stone-500">{formatter.format(new Date(appointment.starts_at))} · {appointment.status.replace("_", " ")}</p><p className="mt-1 text-xs text-stone-400">{appointment.appointment_services?.map((line) => line.name).join(" + ") || "Service unavailable"}</p></div><div className="text-right"><p className="text-sm text-[var(--beauty-primary)]">{formatUsd(appointment.price_cents)}</p>{balanceDueCents(appointment) > 0 ? <p className="text-xs text-rose-300">{formatUsd(balanceDueCents(appointment))} due</p> : null}</div></Link></li>)}</ul> : <p className="p-8 text-center text-stone-500">No appointments yet.</p>}</BeautyPanel></main>;
}
