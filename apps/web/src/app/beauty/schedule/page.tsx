import { addTimeOff, addWorkingHours, removeScheduleRow } from "@/app/beauty/actions";
import { getBeautyProfile, listTimeOff, listWorkingHours } from "@/lib/db/beauty";
import {
  BeautyError,
  BeautyField,
  BeautyHeader,
  BeautyPanel,
  beautyDangerButton,
  beautyForm,
  beautyGridThree,
  beautyInput,
  beautyList,
  beautyListItem,
  beautyMuted,
  beautyPage,
  beautyPanelTitle,
  beautyPrimaryButton,
} from "@/components/beauty/beauty-ui";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const dynamic = "force-dynamic";

export default async function SchedulePage({ searchParams }: { searchParams: { error?: string } }) {
  const [hours, blocks, profile] = await Promise.all([listWorkingHours(), listTimeOff(), getBeautyProfile()]);
  const formatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: profile.timezone });
  return (
    <main className={`${beautyPage} mx-auto max-w-4xl px-5 pt-6`}>
      <BeautyHeader title="Schedule" />
      <p className="mt-2 text-xs leading-6 text-[#c9b79f]">All times use {profile.timezone}.</p>
      <div className="mt-4"><BeautyError message={searchParams.error} /></div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <BeautyPanel>
          <h2 className={beautyPanelTitle}>Working hours</h2>
          <form action={addWorkingHours} className={`${beautyForm} mt-4`}>
            <div className={beautyGridThree}>
              <select name="weekday" aria-label="Weekday" className={beautyInput}>{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select>
              <input name="start_time" aria-label="Opening time" type="time" required className={beautyInput} />
              <input name="end_time" aria-label="Closing time" type="time" required className={beautyInput} />
            </div>
            <button className={beautyPrimaryButton}>Add hours</button>
          </form>
          {hours.length ? (
            <ul className={beautyList}>
              {hours.map((item) => (
                <li key={item.id} className={`${beautyListItem} flex items-center justify-between gap-3`}>
                  <span>{days[item.weekday]}{" \u00b7 "}{item.start_time.slice(0, 5)}{"\u2013"}{item.end_time.slice(0, 5)}</span>
                  <form action={removeScheduleRow}>
                    <input type="hidden" name="table" value="working_hours" />
                    <input type="hidden" name="id" value={item.id} />
                    <button className={beautyDangerButton}>Remove</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : <p className={`${beautyMuted} mt-3`}>No working hours configured.</p>}
        </BeautyPanel>

        <BeautyPanel>
          <h2 className={beautyPanelTitle}>Time off</h2>
          <form action={addTimeOff} className={`${beautyForm} mt-4`}>
            <BeautyField label="Starts"><input name="starts_at" type="datetime-local" required className={beautyInput} /></BeautyField>
            <BeautyField label="Ends"><input name="ends_at" type="datetime-local" required className={beautyInput} /></BeautyField>
            <BeautyField label="Reason"><input name="reason" className={beautyInput} /></BeautyField>
            <button className={beautyPrimaryButton}>Block time</button>
          </form>
          {blocks.length ? (
            <ul className={beautyList}>
              {blocks.map((block) => (
                <li key={block.id} className={`${beautyListItem} flex items-center justify-between gap-3`}>
                  <span>{formatter.format(new Date(block.starts_at))}{" \u00b7 "}{block.reason || "Time off"}</span>
                  <form action={removeScheduleRow}>
                    <input type="hidden" name="table" value="time_off" />
                    <input type="hidden" name="id" value={block.id} />
                    <button className={beautyDangerButton}>Remove</button>
                  </form>
                </li>
              ))}
            </ul>
          ) : <p className={`${beautyMuted} mt-3`}>No time-off blocks scheduled.</p>}
        </BeautyPanel>
      </div>
    </main>
  );
}
