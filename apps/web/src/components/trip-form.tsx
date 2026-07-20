import {
  CancelLink,
  Field,
  FormError,
  Select,
  SubmitButton,
  TextArea,
  TextInput,
} from "@/components/form";
import {
  PAYMENT_METHODS,
  TRIP_STATUSES,
  TRIP_TYPES,
  labelize,
} from "@/lib/enums";
import { centsToDollars } from "@/lib/money";
import type { Trip } from "@/lib/types";

export function TripForm({
  action,
  trip,
  customerName,
  error,
  submitLabel,
  showInlineCosts,
}: {
  action: (formData: FormData) => void | Promise<void>;
  trip?: Trip | null;
  customerName?: string;
  error?: string;
  submitLabel: string;
  showInlineCosts: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className="mt-8 flex flex-col gap-3">
      {trip ? <input type="hidden" name="id" value={trip.id} /> : null}

      <Field
        label="Customer"
        hint="Type a name — we'll find or create this customer. Leave blank for none."
      >
        <TextInput
          name="customer_name"
          defaultValue={customerName ?? ""}
          placeholder="e.g. Ashley"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Trip date">
          <TextInput
            name="trip_date"
            type="date"
            defaultValue={trip?.trip_date ?? today}
          />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={trip?.status ?? "completed"}>
            {TRIP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {labelize(s)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Pickup">
          <TextInput
            name="pickup_location"
            defaultValue={trip?.pickup_location ?? ""}
            placeholder="Brooklyn"
          />
        </Field>
        <Field label="Drop-off">
          <TextInput
            name="dropoff_location"
            defaultValue={trip?.dropoff_location ?? ""}
            placeholder="JFK"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Trip type">
          <Select name="trip_type" defaultValue={trip?.trip_type ?? ""}>
            <option value="">—</option>
            {TRIP_TYPES.map((t) => (
              <option key={t} value={t}>
                {labelize(t)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Payment">
          <Select
            name="payment_method"
            defaultValue={trip?.payment_method ?? ""}
          >
            <option value="">—</option>
            {PAYMENT_METHODS.map((p) => (
              <option key={p} value={p}>
                {labelize(p)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Revenue ($)" hint="Total you charged — the source of truth.">
        <TextInput
          name="revenue"
          inputMode="decimal"
          required
          defaultValue={trip ? centsToDollars(trip.revenue_cents) : ""}
          placeholder="240"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Hours" hint="Optional — hourly jobs">
          <TextInput
            name="hours"
            inputMode="decimal"
            defaultValue={trip?.hours != null ? String(trip.hours) : ""}
            placeholder="3"
          />
        </Field>
        <Field label="Hourly rate ($)" hint="Optional">
          <TextInput
            name="hourly_rate"
            inputMode="decimal"
            defaultValue={
              trip?.hourly_rate_cents != null
                ? centsToDollars(trip.hourly_rate_cents)
                : ""
            }
            placeholder="90"
          />
        </Field>
      </div>

      <Field label="Mileage" hint="Optional">
        <TextInput
          name="mileage"
          inputMode="decimal"
          defaultValue={trip?.mileage != null ? String(trip.mileage) : ""}
          placeholder="28.5"
        />
      </Field>

      <Field label="Notes">
        <TextArea name="notes" rows={2} defaultValue={trip?.notes ?? ""} />
      </Field>

      {showInlineCosts ? (
        <div className="rounded-xl border border-obsidian-line bg-obsidian-graphite p-4">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-obsidian-silver">
            This trip&apos;s costs (optional)
          </p>
          <p className="mt-1 text-[11px] text-obsidian-muted">
            Each amount over $0 is saved as an expense linked to this trip.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Gas ($)">
              <TextInput name="cost_gas" inputMode="decimal" placeholder="0" />
            </Field>
            <Field label="Tolls ($)">
              <TextInput name="cost_tolls" inputMode="decimal" placeholder="0" />
            </Field>
            <Field label="Other ($)">
              <TextInput name="cost_other" inputMode="decimal" placeholder="0" />
            </Field>
            <Field label="Other label">
              <TextInput name="cost_other_label" placeholder="e.g. Car wash" />
            </Field>
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-obsidian-muted">
          Trip-linked costs are managed on the Expenses screens.
        </p>
      )}

      <FormError message={error} />
      <div className="mt-2 grid grid-cols-2 gap-3">
        <CancelLink href="/trips" />
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
