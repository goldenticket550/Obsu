import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/customer-form";
import { TopBar } from "@/components/form";
import { getCustomer } from "@/lib/db/customers";
import { updateCustomer } from "../../actions";

export default async function EditCustomerPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const customer = await getCustomer(params.id);
  if (!customer) notFound();
  return (
    <main className="mx-auto w-full max-w-sm px-5 pb-16 pt-6">
      <TopBar title="Edit customer" backHref="/customers" />
      <CustomerForm
        action={updateCustomer}
        customer={customer}
        error={searchParams.error}
        submitLabel="Save changes"
      />
    </main>
  );
}
