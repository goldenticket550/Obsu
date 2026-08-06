import { notFound } from "next/navigation";
import { getService } from "@/lib/db/beauty";
import { BeautyHeader, BeautyPanel, beautyDangerButton, beautyPage } from "@/components/beauty/beauty-ui";
import { ServiceForm } from "@/components/beauty/service-form";
import { deleteService } from "@/app/beauty/actions";

export default async function EditServicePage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  const service = await getService(params.id);
  if (!service) notFound();
  return (
    <main className={`${beautyPage} mx-auto max-w-xl px-5 pt-6`}>
      <BeautyHeader title="Edit service" />
      <BeautyPanel className="mt-6">
        <ServiceForm service={service} error={searchParams.error} />
        <form action={deleteService} className="mt-4">
          <input type="hidden" name="id" value={service.id} />
          <button className={beautyDangerButton}>Mark service inactive</button>
        </form>
      </BeautyPanel>
    </main>
  );
}
