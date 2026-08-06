"use client";

import { useState } from "react";
import { logReminderDraftCopy } from "@/app/beauty/actions";
import styles from "./reminder-drafts.module.css";

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
      {logWarning ? <p role="status" className={styles.warning}>{logWarning}</p> : null}
      <ul className={styles.list}>
        {rows.map((row) => (
          <li key={row.id} className={styles.item}>
            <details className={styles.details}>
              <summary className={styles.summary}>Draft reminder</summary>
              <div className={styles.editor}>
                <label className={styles.label} htmlFor={`reminder-${row.id}`}>{row.name} — {row.kind === "fill" ? "Fill due" : "Possible missing add-on"}</label>
                <textarea
                  id={`reminder-${row.id}`}
                  className={styles.textarea}
                  rows={3}
                  value={text(row)}
                  onChange={(event) => setDrafts((current) => ({ ...current, [row.id]: event.target.value }))}
                />
                <div className={styles.controls}>
                  <span className={styles.note}>Draft only. Obsidian never sends this message.</span>
                  <button type="button" className={styles.copy} onClick={() => void copy(row)}>{copied === row.id ? "Copied" : "Copy draft"}</button>
                </div>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
