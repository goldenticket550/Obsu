"use client";

import { useState } from "react";
import { logReminderDraftCopy } from "@/app/beauty/actions";

export interface ReminderDraftRow {
  id: string;
  clientId: string;
  appointmentId?: string;
  name: string;
  daysSince: number;
  kind: "fill" | "addon";
}

export function ReminderDrafts({ rows, businessName }: { rows: ReminderDraftRow[]; businessName: string }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState("");
  const [logWarning, setLogWarning] = useState("");
  const text = (row: ReminderDraftRow) => drafts[row.id] ?? (row.kind === "fill" ? `Hey ${row.name}! It has been ${row.daysSince} days since your last lash appointment. Would you like to book your fill with ${businessName}?` : `Hey ${row.name}! Quick reminder to add bottom lashes if you want them with your Bestie Deal at ${businessName}.`);

  async function copy(row: ReminderDraftRow) {
    try {
      await navigator.clipboard.writeText(text(row));
    } catch {
      setLogWarning("Clipboard access is unavailable. Select and copy the draft text manually.");
      return;
    }
    setCopied(row.id);
    setLogWarning("");
    try {
      await logReminderDraftCopy({ clientId: row.clientId, appointmentId: row.appointmentId, kind: row.kind });
    } catch {
      setLogWarning("The draft was copied, but its activity event could not be recorded.");
    }
  }

  return (
    <>
      {logWarning ? <p role="status" className="mt-3 text-xs text-stone-100">{logWarning}</p> : null}
      <ul className="divide-y divide-[color:var(--beauty-border)]">
        {rows.map((row) => (
          <li key={row.id} className="py-4">
            <p className="mb-2 text-sm font-medium text-stone-200">{row.name} · {row.kind === "fill" ? "Fill due" : "Possible missing add-on"}</p>
            <textarea className="w-full rounded-lg border border-[color:var(--beauty-border)] bg-black/30 p-3 text-sm text-stone-200" rows={3} value={text(row)} onChange={(event) => setDrafts((current) => ({ ...current, [row.id]: event.target.value }))} />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-stone-500">Draft only. Obsidian never sends this message.</span>
              <button type="button" className="min-h-[44px] rounded-lg bg-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-950" onClick={() => void copy(row)}>{copied === row.id ? "Copied" : "Copy"}</button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
