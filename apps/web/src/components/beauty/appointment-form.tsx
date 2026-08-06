import { saveBeautyAppointment } from "@/app/beauty/actions";
import { formatDateTimeLocal } from "@/lib/business/beauty/timezone";
import { APPOINTMENT_STATUSES, PAYMENT_METHODS } from "@/lib/business/beauty/validation";
import type { Appointment, Service } from "@/lib/types/beauty";
import type { Customer } from "@/lib/types";
import {
  BeautyError,
  BeautyField,
  beautyAddOn,
  beautyCheckbox,
  beautyFormSpaced,
  beautyGridThree,
  beautyGridTwo,
  beautyHint,
  beautyInput,
  beautyLegend,
  beautyPrimaryButton,
} from "./beauty-ui";

export function AppointmentForm({ appointment, services, clients, timeZone, error }: { appointment?: Appointment | null; services: Service[]; clients: Customer[]; timeZone: string; error?: string }) {
  const lineIds = new Set(appointment?.appointment_services?.map((line) => line.service_id));
  const selectedInactive = appointment?.service_id ? services.find((service) => service.id === appointment.service_id && !service.active) : null;
  return (
    <form action={saveBeautyAppointment} className={beautyFormSpaced}>
      {appointment ? <input type="hidden" name="id" value={appointment.id} /> : null}
      <BeautyField label="Client">
        <select className={beautyInput} name="client_id" defaultValue={appointment?.client_id ?? ""}>
          <option value="">Walk-in / not selected</option>
          {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
        </select>
      </BeautyField>
      <BeautyField label="Primary service">
        <select className={beautyInput} name="service_id" required defaultValue={appointment?.service_id ?? ""}>
          <option value="" disabled>Select a service</option>
          {selectedInactive ? <option value={selectedInactive.id} disabled>{selectedInactive.name} — inactive</option> : null}
          {services.filter((service) => service.active).map((service) => <option key={service.id} value={service.id}>{service.name} — {service.duration_minutes} min — ${(service.price_cents / 100).toFixed(2)}</option>)}
        </select>
      </BeautyField>
      <fieldset>
        <legend className={beautyLegend}>Add-ons</legend>
        <div className={beautyGridTwo}>
          {services.filter((service) => service.active && service.id !== appointment?.service_id).map((service) => (
            <label key={service.id} className={beautyAddOn}>
              <input type="checkbox" name="add_on_ids" value={service.id} defaultChecked={lineIds.has(service.id)} />
              <span>{service.name} (+${(service.price_cents / 100).toFixed(2)})</span>
            </label>
          ))}
        </div>
      </fieldset>
      <BeautyField label={`Starts (${timeZone})`}>
        <input className={beautyInput} type="datetime-local" name="starts_at" required defaultValue={appointment ? formatDateTimeLocal(new Date(appointment.starts_at), timeZone) : ""} />
      </BeautyField>
      <div className={beautyGridTwo}>
        <BeautyField label="Status"><select className={beautyInput} name="status" defaultValue={appointment?.status ?? "booked"}>{APPOINTMENT_STATUSES.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}</select></BeautyField>
        <BeautyField label="Payment method"><select className={beautyInput} name="payment_method" defaultValue={appointment?.payment_method ?? "cash"}>{PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}</select></BeautyField>
      </div>
      <div className={beautyGridThree}>
        <BeautyField label="Deposit ($)"><input className={beautyInput} name="deposit" type="number" step="0.01" min="0" defaultValue={appointment?.deposit_cents == null ? "" : appointment.deposit_cents / 100} /></BeautyField>
        <BeautyField label="Paid ($)"><input className={beautyInput} name="amount_paid" type="number" step="0.01" min="0" defaultValue={appointment?.amount_paid_cents == null ? "" : appointment.amount_paid_cents / 100} /></BeautyField>
        <BeautyField label="Late fee ($)"><input className={beautyInput} name="late_fee" type="number" step="0.01" min="0" defaultValue={appointment?.late_fee_cents == null ? "" : appointment.late_fee_cents / 100} /></BeautyField>
      </div>
      <label className={beautyCheckbox}><input type="checkbox" name="deposit_paid" defaultChecked={appointment?.deposit_paid} /> Deposit received</label>
      <BeautyField label="Notes"><textarea className={beautyInput} name="notes" rows={3} defaultValue={appointment?.notes ?? ""} /></BeautyField>
      <BeautyError message={error} />
      <p className={beautyHint}>Duration and total are calculated from immutable service snapshots. Conflicting and out-of-hours times are refused.</p>
      <button className={beautyPrimaryButton}>Save appointment</button>
    </form>
  );
}
