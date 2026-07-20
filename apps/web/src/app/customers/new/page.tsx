import { CustomerForm } from "@/components/customer-form";
import { TopBar } from "@/components/form";
import { createCustomer } from "../actions";

export default function NewCustomerPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <main className="mx-auto w-full max-w-sm px-5 pb-16 pt-6">
      <TopBar title="New customer" backHref="/customers" />
      <CustomerForm
        action={createCustomer}
        error={searchParams.error}
        submitLabel="Add customer"
      />
    </main>
  );
}
