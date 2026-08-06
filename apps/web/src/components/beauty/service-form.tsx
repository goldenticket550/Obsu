import { saveService } from "@/app/beauty/actions";
import { SERVICE_CATEGORIES } from "@/lib/business/beauty/validation";
import type { Service } from "@/lib/types/beauty";
import {
  BeautyError,
  BeautyField,
  beautyCheckbox,
  beautyFormSpaced,
  beautyGridThree,
  beautyInput,
  beautyPrimaryButton,
} from "./beauty-ui";

export function ServiceForm({ service, error }: { service?: Service | null; error?: string }) {
  return (
    <form action={saveService} className={beautyFormSpaced}>
      {service ? <input type="hidden" name="id" value={service.id} /> : null}
      <BeautyField label="Service name"><input className={beautyInput} name="name" required defaultValue={service?.name} /></BeautyField>
      <BeautyField label="Category"><select className={beautyInput} name="category" defaultValue={service?.category ?? "other"}>{SERVICE_CATEGORIES.map((category) => <option key={category} value={category}>{category.replaceAll("_", " ")}</option>)}</select></BeautyField>
      <div className={beautyGridThree}>
        <BeautyField label="Minutes"><input className={beautyInput} type="number" min="1" step="1" name="duration_minutes" required defaultValue={service?.duration_minutes} /></BeautyField>
        <BeautyField label="Price ($)"><input className={beautyInput} type="number" step="0.01" min="0" name="price" required defaultValue={service ? (service.price_cents / 100).toFixed(2) : ""} /></BeautyField>
        <BeautyField label="Deposit ($)"><input className={beautyInput} type="number" step="0.01" min="0" name="deposit" defaultValue={service?.deposit_cents == null ? "" : (service.deposit_cents / 100).toFixed(2)} /></BeautyField>
      </div>
      <BeautyField label="Description"><textarea className={beautyInput} name="description" rows={3} defaultValue={service?.description ?? ""} /></BeautyField>
      <label className={beautyCheckbox}><input type="checkbox" name="active" defaultChecked={service?.active ?? true} /> Active and bookable</label>
      <BeautyError message={error} />
      <button className={beautyPrimaryButton}>Save service</button>
    </form>
  );
}
