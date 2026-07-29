"use client";

import { useState } from "react";
import {
  CancelLink,
  Field,
  FormError,
  Select,
  SubmitButton,
  TextArea,
  TextInput,
} from "@/components/form";
import { hasQuotedPrice, requiresRevenue } from "@/lib/business/trip-status";
import { initialTripTypeValue } from "@/lib/business/form-defaults";
import { toTimeInputValue } from "@/lib/business/pickup-time";
import type { PaymentMethod, TripStatus, TripType } from "@/lib/types";
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
    | "cost_other_label"
    | "amount_paid"
    | "passenger_count"
    | "note"
    | "pickup_time",
    string
  >
>;

/** A customer offered as a quick-pick chip (U5). */
export interface QuickPickCustomer {
  id: string;
  name: string;
}

export function TripForm({
  action,
  trip,
  customerName,
  defaults,
  error,
  submitLabel,
  showInlineCosts,
  defaultTripType,
  defaultPaymentMethod,
  recentCustomers = [],
}: {
  action: (formData: FormData) => void | Promise<void>;
  trip?: Trip | null;
  customerName?: string;
  defaults?: TripFormDefaults;
  error?: string;
  submitLabel: string;
  showInlineCosts: boolean;
  /** Org's most common trip type. Null/undefined when there's no history —
   * then the field is simply required and empty (U5). */
  defaultTripType?: TripType | null;
  /** Org's most common payment method, same rule. */
  defaultPaymentMethod?: PaymentMethod | null;
  /** Most recently ridden customers, offered as chips. */
  recentCustomers?: QuickPickCustomer[];
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
        // D1 Part 0: editing NEVER preselects the history-derived default —
        // that would write a guessed classification onto a historical record.
        trip_type: initialTripTypeValue({
          editing: true,
          storedTripType: trip.trip_type,
        }),
        payment_method: trip.payment_method ?? "",
        // A scheduled trip stored as 0 has no price set yet — show it blank
        // rather than a fabricated "0.00".
        revenue:
          trip.status !== "completed" && !hasQuotedPrice(trip)
            ? ""
            : centsToDollars(trip.revenue_cents),
        hours: trip.hours != null ? String(trip.hours) : "",
        hourly_rate:
          trip.hourly_rate_cents != null
            ? centsToDollars(trip.hourly_rate_cents)
            : "",
        mileage: trip.mileage != null ? String(trip.mileage) : "",
        notes: trip.notes ?? "",
        // D1: null means NOT TRACKED, so the field opens blank — never "0.00",
        // which would assert a payment of nothing.
        amount_paid:
          trip.amount_paid_cents != null
            ? centsToDollars(trip.amount_paid_cents)
            : "",
        passenger_count:
          trip.passenger_count != null ? String(trip.passenger_count) : "",
        note: trip.note ?? "",
        pickup_time: toTimeInputValue(trip.start_time),
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
        // U5: preselect the org's own most common values. Where the org has no
        // history these are null and the field opens empty — never guessed.
        trip_type: initialTripTypeValue({
          editing: false,
          parsedTripType: d.trip_type,
          derivedDefault: defaultTripType,
        }),
        payment_method: d.payment_method ?? defaultPaymentMethod ?? "",
        revenue: d.revenue ?? "",
        hours: d.hours ?? "",
        hourly_rate: d.hourly_rate ?? "",
        mileage: d.mileage ?? "",
        notes: d.notes ?? "",
        amount_paid: d.amount_paid ?? "",
        passenger_count: d.passenger_count ?? "",
        note: d.note ?? "",
        pickup_time: d.pickup_time ?? "",
        cost_gas: d.cost_gas ?? "",
        cost_tolls: d.cost_tolls ?? "",
        cost_other: d.cost_other ?? "",
        cost_other_label: d.cost_other_label ?? "",
      };

  // Status drives the form's mode: a SCHEDULED ride is a booking (pickup time
  // matters, price may not be known yet), a COMPLETED one is a logbook entry
  // (revenue is the point). Tracked in state so the fields react immediately.
  const [status, setStatus] = useState<TripStatus>(v.status as TripStatus);
  const scheduling = status === "scheduled";
  const revenueRequired = requiresRevenue(status);

  // Controlled only where the UI has to write into the field: the quick-pick
  // chips fill the customer, and trip type / payment carry a derived default.
  // Everything else stays uncontrolled, so nothing is re-rendered away.
  const [customer, setCustomer] = useState(v.customer_name);
  const [tripType, setTripType] = useState(v.trip_type);
  const [payment, setPayment] = useState(v.payment_method);

  // Inline validation appears on BLUR, not on every keystroke — being corrected
  // mid-word while typing one-handed is worse than no help at all. Messages say
  // what to do, not what went wrong.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const markTouched = (field: string) =>
    setTouched((t) => ({ ...t, [field]: true }));

  const tripTypeError =
    touched.trip_type && !tripType ? "Pick the kind of ride this was." : null;
  const revenueHint = "Enter the amount you charged.";

  return (
    <form action={action} className="mt-8 flex flex-col gap-3">
      {trip ? <input type="hidden" name="id" value={trip.id} /> : null}

      <Field
        label="Customer"
        hint="Type a name — we'll find or create this customer. Leave blank for none."
      >
        <TextInput
          name="customer_name"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          placeholder="e.g. Ashley"
        />
      </Field>

      {/* Quick-pick: a shortcut, never a constraint. The field above stays free
          text, so typing a brand-new name is exactly as fast as before. */}
      {recentCustomers.length > 0 ? (
        <div className="-mt-1">
          <p className="sr-only" id="recent-customers-label">
            Recent customers
          </p>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-labelledby="recent-customers-label"
          >
            {recentCustomers.map((c) => {
              const selected = customer.trim() === c.name;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCustomer(c.name)}
                  aria-pressed={selected}
                  className={`inline-flex min-h-[44px] items-center rounded-full border px-3.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-black ${
                    selected
                      ? "border-obsidian-cyan bg-obsidian-cyan/10 text-obsidian-platinum"
                      : "border-obsidian-line text-obsidian-silver hover:border-obsidian-cyan hover:text-obsidian-platinum"
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Field label={scheduling ? "Pickup date" : "Trip date"}>
          <TextInput name="trip_date" type="date" defaultValue={v.trip_date} />
        </Field>
        <Field label="Status">
          <Select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TripStatus)}
          >
            {TRIP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {labelize(s)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {/* Scheduling mode: when the ride is booked for, not when it was driven. */}
      {scheduling ? (
        <Field
          label="Pickup time"
          hint="Optional — New York time. Add it when the hour is settled."
        >
          <TextInput name="pickup_time" type="time" defaultValue={v.pickup_time} />
        </Field>
      ) : (
        <input type="hidden" name="pickup_time" value={v.pickup_time} />
      )}

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
        {/* U5: required. `required` + an empty placeholder option means the
            browser blocks submission before the form is ever sent — so a
            missing trip type never costs the operator the rest of their
            entry, and the submit guard never latches. */}
        <Field label="Trip type">
          <Select
            name="trip_type"
            required
            value={tripType}
            onChange={(e) => setTripType(e.target.value)}
            onBlur={() => markTouched("trip_type")}
            aria-invalid={tripTypeError ? true : undefined}
            aria-describedby={tripTypeError ? "trip-type-error" : undefined}
          >
            <option value="">Choose…</option>
            {TRIP_TYPES.map((t) => (
              <option key={t} value={t}>
                {labelize(t)}
              </option>
            ))}
          </Select>
          {tripTypeError ? (
            <span
              id="trip-type-error"
              role="alert"
              className="mt-1 block text-[11px] normal-case tracking-normal text-obsidian-amber"
            >
              {tripTypeError}
            </span>
          ) : null}
        </Field>
        <Field label="Payment">
          <Select
            name="payment_method"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
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

      <Field
        label={revenueRequired ? "Revenue ($)" : "Quoted price ($) — optional"}
        hint={
          revenueRequired
            ? "Total you charged — the source of truth."
            : "Leave blank if the price isn't set yet. A scheduled ride counts toward your totals only once you mark it completed."
        }
      >
        <TextInput
          name="revenue"
          inputMode="decimal"
          pattern="[0-9$,. ]*"
          required={revenueRequired}
          defaultValue={v.revenue}
          placeholder="240"
          onBlur={() => markTouched("revenue")}
          aria-describedby={
            revenueRequired && touched.revenue ? "revenue-hint" : undefined
          }
        />
        {revenueRequired && touched.revenue ? (
          <span
            id="revenue-hint"
            className="mt-1 block text-[11px] normal-case tracking-normal text-obsidian-muted"
          >
            {revenueHint}
          </span>
        ) : null}
      </Field>

      {/* D1: amount paid sits beside the fare. Leaving it blank persists NULL —
          "payment not tracked" — which is a different claim from "paid $0". */}
      <Field
        label="Amount paid ($) — optional"
        hint="Leave blank if you're not tracking payment for this ride."
      >
        <TextInput
          name="amount_paid"
          inputMode="decimal"
          pattern="[0-9$,. ]*"
          defaultValue={v.amount_paid}
          placeholder="Leave blank if not tracking"
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
            pattern="[0-9$,. ]*"
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

      <Field label="Passengers" hint="Optional — leave blank if not recorded.">
        <TextInput
          name="passenger_count"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          defaultValue={v.passenger_count}
          placeholder="e.g. 3"
        />
      </Field>

      <Field label="Notes">
        <TextArea name="notes" rows={2} defaultValue={v.notes} />
      </Field>

      {/* D1 added a `note` column alongside the pre-existing `notes`. Labelled
          distinctly so the two are not mistaken for each other — see the report:
          consolidating them needs its own approved migration. */}
      <Field label="Ride note" hint="Optional — a short note about this ride.">
        <TextInput name="note" defaultValue={v.note} placeholder="Optional" />
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
                pattern="[0-9$,. ]*"
                defaultValue={v.cost_gas}
                placeholder="0"
              />
            </Field>
            <Field label="Tolls ($)">
              <TextInput
                name="cost_tolls"
                inputMode="decimal"
                pattern="[0-9$,. ]*"
                defaultValue={v.cost_tolls}
                placeholder="0"
              />
            </Field>
            <Field label="Other ($)">
              <TextInput
                name="cost_other"
                inputMode="decimal"
                pattern="[0-9$,. ]*"
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
