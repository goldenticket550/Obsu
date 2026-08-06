import { BeautyHeader, BeautyPanel, beautyPage } from "@/components/beauty/beauty-ui";
import { ServiceForm } from "@/components/beauty/service-form";

export default function NewServicePage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className={`${beautyPage} mx-auto max-w-xl px-5 pt-6`}>
      <BeautyHeader title="New service" />
      <BeautyPanel className="mt-6"><ServiceForm error={searchParams.error} /></BeautyPanel>
    </main>
  );
}
