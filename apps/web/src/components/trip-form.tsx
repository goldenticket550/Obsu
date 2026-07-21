"use client";

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

/**
 * Prefill values for the create form (M8 natural-language entry). Keys are the
 * form field names; all optional — unset fields render blank.
 */
export type TripFormDefaults = Partial<
  Record<
    | "customer_name"
    | "trip_date"
    | "status"
    | "pickup_location"
    | "dropoff_location"
    | "trip_type"
    | "payment_method"
    | "revenue"
    | "hours"
    | "hourly_rate"
    | "mileage"
    | "notes"
    | "cost_gas"
    | "cost_tolls"
    | "cost_other"
    | "cost_other_label",
    string
  >
>;

export function TripForm({
  action,
  trip,
  customerName,
  defaults,
  error,
  submitLabel,
  showInlineCosts,
}: {
  action: (formData: FormData) => void | Promise<void>;
  trip?: Trip | null;
  customerName?: string;
  defaults?: TripFormDefaults;
  error?: string;
  submitLabel: string;
  showInlineCosts: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const d = defaults ?? {};

  // Field default values: edit mode derives from the trip; create mode uses the
  // (optional) parsed defaults, else blank.
  const v = trip
    ? {
        customer_name: customerName ?? "",
        trip_date: trip.trip_date ?? today,
        status: trip.status ?? "completed",
        pickup_location: trip.pickup_location ?? "",
        dropoff_location: trip.dropoff_location ?? "",
        trip_type: trip.trip_type ?? "",
        payment_method: trip.payment_method ?? "",
        revenue: centsToDollars(trip.revenue_cents),
        hours: trip.hours != null ? String(trip.hours) : "",
        hourly_rate:
          trip.hourly_rate_cents != null
            ? centsToDollars(trip.hourly_rate_cents)
            : "",
        mileage: trip.mileage != null ? String(trip.mileage) : "",
        notes: trip.notes ?? "",
        cost_gas: "",
        cost_tolls: "",
        cost_other: "",
        cost_other_label: "",
      }
    : {
        customer_name: d.customer_name ?? "",
        trip_date: d.trip_date ?? today,
        status: d.status ?? "completed",
        pickup_location: d.pickup_location ?? "",
        dropoff_location: d.dropoff_location ?? "",
        trip_type: d.trip_type ?? "",
        payment_method: d.payment_method ?? "",
        revenue: d.revenue ?? "",
        hours: d.hours ?? "",
        hourly_rate: d.hourly_rate ?? "",
        mileage: d.mileage ?? "",
        notes: d.notes ?? "",
        cost_gas: d.cost_gas ?? "",
        cost_tolls: d.cost_tolls ?? "",
        cost_other: d.cost_other ?? "",
        cost_other_label: d.cost_other_label ?? "",
      };

  return (
    <form action={action} className="mt-8 flex flex-col gap-3">
      {trip ? <input type="hidden" name="id" value={trip.id} /> : null}

      <Field
        label="Customer"
        hint="Type a name — we'll find or create this customer. Leave blank for none."
      >
        <TextInput
          name="customer_name"
          defaultValue={v.customer_name}
          placeholder="e.g. Ashley"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Trip date">
          <TextInput name="trip_date" type="date" defaultValue={v.trip_date} />
        </Field>
        <Field label="Status">
          <Select name="status" defaultValue={v.status}>
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
            defaultValue={v.pickup_location}
            placeholder="Brooklyn"
          />
        </Field>
        <Field label="Drop-off">
          <TextInput
            name="dropoff_location"
            defaultValue={v.dropoff_location}
            placeholder="JFK"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Trip type">
          <Select name="trip_type" defaultValue={v.trip_type}>
            <option value="">—</option>
            {TRIP_TYPES.map((t) => (
              <option key={t} value={t}>
                {labelize(t)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Payment">
          <Select name="payment_method" defaultValue={v.payment_method}>
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
          defaultValue={v.revenue}
          placeholder="240"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Hours" hint="Optional — hourly jobs">
          <TextInput
            name="hours"
            inputMode="decimal"
            defaultValue={v.hours}
            placeholder="3"
          />
        </Field>
        <Field label="Hourly rate ($)" hint="Optional">
          <TextInput
            name="hourly_rate"
            inputMode="decimal"
            defaultValue={v.hourly_rate}
            placeholder="90"
          />
        </Field>
      </div>

      <Field label="Mileage" hint="Optional">
        <TextInput
          name="mileage"
          inputMode="decimal"
          defaultValue={v.mileage}
          placeholder="28.5"
        />
      </Field>

      <Field label="Notes">
        <TextArea name="notes" rows={2} defaultValue={v.notes} />
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
              <TextInput
                name="cost_gas"
                inputMode="decimal"
                defaultValue={v.cost_gas}
                placeholder="0"
              />
            </Field>
            <Field label="Tolls ($)">
              <TextInput
                name="cost_tolls"
                inputMode="decimal"
                defaultValue={v.cost_tolls}
                placeholder="0"
              />
            </Field>
            <Field label="Other ($)">
              <TextInput
                name="cost_other"
                inputMode="decimal"
                defaultValue={v.cost_other}
                placeholder="0"
              />
            </Field>
            <Field label="Other label">
              <TextInput
                name="cost_other_label"
                defaultValue={v.cost_other_label}
                placeholder="e.g. Car wash"
              />
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
