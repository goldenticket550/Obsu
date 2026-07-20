import { ExpenseForm } from "@/components/expense-form";
import { TopBar } from "@/components/form";
import { listTripOptions } from "@/lib/db/expenses";
import { createExpense } from "../actions";

export default async function NewExpensePage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const tripOptions = await listTripOptions();
  return (
    <main className="mx-auto w-full max-w-sm px-5 pb-16 pt-6">
      <TopBar title="Add expense" backHref="/expenses" />
      <ExpenseForm
        action={createExpense}
        error={searchParams.error}
        submitLabel="Add expense"
        tripOptions={tripOptions}
      />
    </main>
  );
}
