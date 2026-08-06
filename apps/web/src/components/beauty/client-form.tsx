import { saveBeautyClientAction } from "@/app/beauty/actions";
import type { BeautyClientDetails } from "@/lib/types/beauty";
import type { Customer } from "@/lib/types";
import {
  BeautyError,
  BeautyField,
  beautyForm,
  beautyGridTwo,
  beautyInput,
  beautyPrimaryButton,
} from "./beauty-ui";

export function ClientForm({ client, details, error }: { client?: Customer; details?: BeautyClientDetails | null; error?: string }) {
  return (
    <form action={saveBeautyClientAction} className={beautyForm}>
      {client ? <input type="hidden" name="id" value={client.id} /> : null}
      <BeautyField label="Name"><input name="name" required className={beautyInput} defaultValue={client?.name} /></BeautyField>
      <div className={beautyGridTwo}>
        <BeautyField label="Phone"><input name="phone" type="tel" className={beautyInput} defaultValue={client?.phone ?? ""} /></BeautyField>
        <BeautyField label="Email"><input name="email" type="email" className={beautyInput} defaultValue={client?.email ?? ""} /></BeautyField>
      </div>
      <BeautyField label="General notes"><textarea name="notes" rows={2} className={beautyInput} defaultValue={client?.notes ?? ""} /></BeautyField>
      <BeautyField label="Allergy notes"><textarea name="allergy_notes" rows={2} className={beautyInput} defaultValue={details?.allergy_notes ?? ""} /></BeautyField>
      <div className={beautyGridTwo}>
        <BeautyField label="Patch test date"><input name="patch_test_date" type="date" className={beautyInput} defaultValue={details?.patch_test_date ?? ""} /></BeautyField>
        <BeautyField label="Patch test result"><input name="patch_test_result" className={beautyInput} defaultValue={details?.patch_test_result ?? ""} /></BeautyField>
      </div>
      <BeautyField label="Natural lash notes"><textarea name="natural_lash_notes" rows={2} className={beautyInput} defaultValue={details?.natural_lash_notes ?? ""} /></BeautyField>
      <BeautyError message={error} />
      <button className={beautyPrimaryButton}>Save client</button>
    </form>
  );
}
