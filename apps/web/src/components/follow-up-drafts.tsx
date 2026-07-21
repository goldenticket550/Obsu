"use client";

import { useState } from "react";

/**
 * M9 — follow-up drafts (Level-2 "prepare" only). For each inactive repeat
 * customer, the owner can open an editable, copyable draft message. There is
 * NO send button and no messaging integration — the owner copies it and sends
 * it himself elsewhere. Nothing leaves the app.
 */

export interface FollowUpRow {
  id: string;
  name: string;
  daysSinceLastTrip: number;
  lifetimeUsd: string;
}

function defaultDraft(name: string): string {
  return `Hey ${name}, hope all's well — just checking in! It's been a little while. Midnight Rydes is here whenever you need a ride; happy to get you booked in.`;
}

export function FollowUpDrafts({ customers }: { customers: FollowUpRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function draftFor(row: FollowUpRow): string {
    return drafts[row.id] ?? defaultDraft(row.name);
  }

  async function copy(row: FollowUpRow) {
    try {
      await navigator.clipboard.writeText(draftFor(row));
      setCopiedId(row.id);
      setTimeout(() => setCopiedId((c) => (c === row.id ? null : c)), 2000);
    } catch {
      /* clipboard may be unavailable; the text stays selectable in the box */
    }
  }

  return (
    <ul className="divide-y divide-obsidian-line">
      {customers.map((row) => {
        const open = openId === row.id;
        return (
          <li key={row.id} className="px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-obsidian-platinum">
                  {row.name}
                </p>
                <p className="text-xs text-obsidian-muted">
                  {row.daysSinceLastTrip} days since last ride · {row.lifetimeUsd}{" "}
                  lifetime
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : row.id)}
                className="shrink-0 rounded-lg border border-obsidian-line px-3 py-1.5 text-xs text-obsidian-silver transition-colors hover:border-obsidian-cyan hover:text-obsidian-platinum"
              >
                {open ? "Hide draft" : "Draft follow-up"}
              </button>
            </div>

            {open ? (
              <div className="mt-3">
                <textarea
                  value={draftFor(row)}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [row.id]: e.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-obsidian-line bg-obsidian-black px-3 py-2 text-sm text-obsidian-platinum focus:border-obsidian-cyan focus:outline-none"
                />
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-obsidian-muted">
                    Edit it, copy it, and send it yourself — OBSIDIAN never sends
                    messages.
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(row)}
                    className="rounded-lg bg-obsidian-platinum px-3 py-1.5 text-xs font-semibold text-obsidian-black transition-opacity hover:opacity-90"
                  >
                    {copiedId === row.id ? "Copied ✓" : "Copy"}
                  </button>
                </div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
