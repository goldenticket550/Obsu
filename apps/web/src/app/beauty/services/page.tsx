import { listServices } from "@/lib/db/beauty";
import { BeautyHeader, BeautyLink, beautyPage } from "@/components/beauty/beauty-ui";
import { ServiceMenu } from "@/components/beauty/service-menu";

export const dynamic = "force-dynamic";

export default async function Services() {
  const services = await listServices();
  return (
    <main className={`${beautyPage} mx-auto max-w-4xl px-5 pt-6`}>
      <BeautyHeader title="Services" action={<BeautyLink href="/beauty/services/new">Add service</BeautyLink>} />
      {services.length ? <ServiceMenu services={services} /> : (
        <p className="mt-6 rounded-2xl border border-[#decdbb] bg-[#f7efe3] p-8 text-center text-sm text-[#59473c]">No services yet.</p>
      )}
    </main>
  );
}
