import type { Cents, ISODate, PaymentMethod, UUID } from "./index";

export type ServiceCategory =
  | "lash_set" | "lash_fill" | "bottom_lash" | "cleansing"
  | "removal" | "brow" | "lip_filler" | "other";
export type AppointmentStatus = "booked" | "completed" | "canceled" | "no_show";

export interface Service {
  id: UUID; organization_id: UUID; name: string; category: ServiceCategory;
  duration_minutes: number; price_cents: Cents; deposit_cents?: Cents | null;
  description?: string | null; active: boolean; sort_order?: number | null; created_at: ISODate;
}
export interface AppointmentLine {
  id: UUID; organization_id: UUID; appointment_id: UUID; service_id?: UUID | null;
  name: string; category: ServiceCategory; price_cents: Cents; duration_minutes?: number | null; created_at: ISODate;
}
export interface Appointment {
  id: UUID; organization_id: UUID; client_id?: UUID | null; service_id?: UUID | null;
  starts_at: ISODate; ends_at: ISODate; status: AppointmentStatus; price_cents: Cents;
  deposit_cents?: Cents | null; deposit_paid: boolean; amount_paid_cents?: Cents | null;
  payment_method?: PaymentMethod | null; late_fee_cents?: Cents | null; notes?: string | null;
  created_at: ISODate; appointment_services?: AppointmentLine[]; client?: { name: string; phone?: string | null } | null;
}
export interface WorkingHours { id: UUID; organization_id: UUID; weekday: number; start_time: string; end_time: string; created_at: ISODate; }
export interface TimeOff { id: UUID; organization_id: UUID; starts_at: ISODate; ends_at: ISODate; reason?: string | null; created_at: ISODate; }
export interface BeautyClientDetails {
  customer_id: UUID; organization_id: UUID; allergy_notes?: string | null; patch_test_date?: ISODate | null;
  patch_test_result?: string | null; natural_lash_notes?: string | null; created_at: ISODate; updated_at: ISODate;
}
