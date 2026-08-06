import { listBeautyClients, listServices, getBeautyProfile } from "@/lib/db/beauty";
import { BeautyHeader, BeautyPanel } from "@/components/beauty/beauty-ui";
import { AppointmentForm } from "@/components/beauty/appointment-form";

export default async function NewAppointmentPage({ searchParams }: { searchParams: { error?: string } }) {
  const [services, clients, profile] = await Promise.all([listServices(), listBeautyClients(), getBeautyProfile()]);
  return <main className="mx-auto max-w-2xl px-5 pb-20 pt-6"><BeautyHeader title="New appointment" /><BeautyPanel className="mt-6"><AppointmentForm services={services} clients={clients} timeZone={profile.timezone} error={searchParams.error} /></BeautyPanel></main>;
}
