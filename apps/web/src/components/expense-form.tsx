import {
  CancelLink,
  Field,
  FormError,
  Select,
  SubmitButton,
  TextArea,
  TextInput,
} from "@/components/form";
import { EXPENSE_CATEGORIES, labelize } from "@/lib/enums";
import { centsToDollars } from "@/lib/money";
import type { Expense } from "@/lib/types";
import type { TripOption } from "@/lib/db/expenses";

export function ExpenseForm({
  action,
  expense,
  error,
  submitLabel,
  tripOptions,
}: {
  action: (formData: FormData) => void | Promise<void>;
  expense?: Expense | null;
  error?: string;
  submitLabel: string;
  tripOptions: TripOption[];
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className="mt-8 flex flex-col gap-3">
      {expense ? <input type="hidden" name="id" value={expense.id} /> : null}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <Select name="category" defaultValue={expense?.category ?? "other"}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {labelize(c)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Amount ($)">
          <TextInput
            name="amount"
            inputMode="decimal"
            required
            defaultValue={expense ? centsToDollars(expense.amount_cents) : ""}
            placeholder="18"
          />
        </Field>
      </div>
      <Field label="Date">
        <TextInput
          name="expense_date"
          type="date"
          defaultValue={expense?.expense_date ?? today}
        />
      </Field>
      <Field label="Linked trip" hint="Optional">
        <Select name="trip_id" defaultValue={expense?.trip_id ?? ""}>
          <option value="">— none —</option>
          {tripOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Description">
        <TextArea
          name="description"
          rows={2}
          defaultValue={expense?.description ?? ""}
        />
      </Field>
      <FormError message={error} />
      <div className="mt-2 grid grid-cols-2 gap-3">
        <CancelLink href="/expenses" />
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
