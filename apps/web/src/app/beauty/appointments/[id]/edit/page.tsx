import { notFound } from "next/navigation";
import { getAppointment, getBeautyProfile, listBeautyClients, listServices } from "@/lib/db/beauty";
import { BeautyHeader, BeautyPanel, beautyDangerButton, beautyPage } from "@/components/beauty/beauty-ui";
import { AppointmentForm } from "@/components/beauty/appointment-form";
import { cancelBeautyAppointment } from "@/app/beauty/actions";

export default async function EditAppointmentPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const [appointment, services, clients, profile] = await Promise.all([getAppointment(params.id), listServices(), listBeautyClients(), getBeautyProfile()]);
  if (!appointment) notFound();
  return (
    <main className={`${beautyPage} mx-auto max-w-2xl px-5 pt-6`}>
      <BeautyHeader title="Edit appointment" />
      <BeautyPanel className="mt-6">
        <AppointmentForm appointment={appointment} services={services} clients={clients} timeZone={profile.timezone} error={searchParams.error} />
        <form action={cancelBeautyAppointment} className="mt-4">
          <input type="hidden" name="id" value={appointment.id} />
          <button className={beautyDangerButton}>Cancel appointment</button>
        </form>
      </BeautyPanel>
    </main>
  );
}
