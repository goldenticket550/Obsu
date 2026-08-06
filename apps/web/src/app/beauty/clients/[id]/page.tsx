import { notFound } from "next/navigation";
import { getBeautyClient, getBeautyProfile } from "@/lib/db/beauty";
import { formatUsd } from "@/lib/money";
import {
  BeautyHeader,
  BeautyPanel,
  beautyList,
  beautyListItem,
  beautyMuted,
  beautyPage,
  beautyPanelTitle,
} from "@/components/beauty/beauty-ui";
import { ClientForm } from "@/components/beauty/client-form";

export default async function ClientPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const [client, profile] = await Promise.all([getBeautyClient(params.id), getBeautyProfile()]);
  if (!client) notFound();
  const details = client.beauty_client_details[0] ?? null;
  const formatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: profile.timezone });
  return (
    <main className={`${beautyPage} mx-auto max-w-3xl px-5 pt-6`}>
      <BeautyHeader title={client.name} />
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <BeautyPanel><ClientForm client={client} details={details} error={searchParams.error} /></BeautyPanel>
        <BeautyPanel>
          <h2 className={beautyPanelTitle}>Appointment history</h2>
          {client.appointments?.length ? (
            <ul className={beautyList}>
              {client.appointments.map((appointment) => (
                <li key={appointment.id} className={beautyListItem}>
                  <p className="font-semibold">{appointment.appointment_services?.map((line) => line.name).join(" + ") || "Service unavailable"}</p>
                  <p className={beautyMuted}>{formatter.format(new Date(appointment.starts_at))}{" \u00b7 "}{appointment.status.replaceAll("_", " ")}{" \u00b7 "}{formatUsd(appointment.price_cents)}</p>
                </li>
              ))}
            </ul>
          ) : <p className={`${beautyMuted} mt-3`}>No appointment history.</p>}
        </BeautyPanel>
      </div>
    </main>
  );
}
