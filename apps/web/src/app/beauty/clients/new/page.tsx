import { BeautyHeader, BeautyPanel, beautyPage } from "@/components/beauty/beauty-ui";
import { ClientForm } from "@/components/beauty/client-form";

export default function NewClientPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className={`${beautyPage} mx-auto max-w-xl px-5 pt-6`}>
      <BeautyHeader title="New client" />
      <BeautyPanel className="mt-6"><ClientForm error={searchParams.error} /></BeautyPanel>
    </main>
  );
}
