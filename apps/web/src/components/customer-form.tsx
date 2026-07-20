import {
  CancelLink,
  Field,
  FormError,
  SubmitButton,
  TextArea,
  TextInput,
} from "@/components/form";
import type { Customer } from "@/lib/types";

export function CustomerForm({
  action,
  customer,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  customer?: Customer | null;
  error?: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="mt-8 flex flex-col gap-3">
      {customer ? <input type="hidden" name="id" value={customer.id} /> : null}
      <Field label="Name">
        <TextInput
          name="name"
          required
          defaultValue={customer?.name ?? ""}
          placeholder="e.g. Ashley"
        />
      </Field>
      <Field label="Phone">
        <TextInput
          name="phone"
          type="tel"
          defaultValue={customer?.phone ?? ""}
          placeholder="555-0100"
        />
      </Field>
      <Field label="Email">
        <TextInput
          name="email"
          type="email"
          defaultValue={customer?.email ?? ""}
          placeholder="you@example.com"
        />
      </Field>
      <Field label="Notes">
        <TextArea name="notes" rows={3} defaultValue={customer?.notes ?? ""} />
      </Field>
      <FormError message={error} />
      <div className="mt-2 grid grid-cols-2 gap-3">
        <CancelLink href="/customers" />
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
