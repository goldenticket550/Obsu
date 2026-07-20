import { notFound } from "next/navigation";
import { ExpenseForm } from "@/components/expense-form";
import { TopBar } from "@/components/form";
import { getExpense, listTripOptions } from "@/lib/db/expenses";
import { updateExpense } from "../../actions";

export default async function EditExpensePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const [expense, tripOptions] = await Promise.all([
    getExpense(params.id),
    listTripOptions(),
  ]);
  if (!expense) notFound();
  return (
    <main className="mx-auto w-full max-w-sm px-5 pb-16 pt-6">
      <TopBar title="Edit expense" backHref="/expenses" />
      <ExpenseForm
        action={updateExpense}
        expense={expense}
        error={searchParams.error}
        submitLabel="Save changes"
        tripOptions={tripOptions}
      />
    </main>
  );
}
