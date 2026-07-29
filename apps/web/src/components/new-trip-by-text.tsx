"use client";

import { useState, useTransition } from "react";
import {
  TripForm,
  type QuickPickCustomer,
  type TripFormDefaults,
} from "@/components/trip-form";
import { createTrip, parseTripText } from "@/app/trips/actions";
import type { PaymentMethod, TripType } from "@/lib/types";

/**
 * M8 — natural-language trip entry wrapper (client). Sends the note to the
 * server parse action, prefills the M4 TripForm with what came back, and lets
 * the owner review/edit before submitting. The parse writes nothing; the only
 * write is the normal form submit (createTrip). Leaving the page cancels.
 */
export function NewTripByText({
  initialError,
  initialStatus,
  defaultTripType,
  defaultPaymentMethod,
  recentCustomers,
}: {
  initialError?: string;
  /** "scheduled" opens the form in scheduling mode (S1). */
  initialStatus?: "scheduled";
  /** Org-derived form defaults, computed server-side (U5). */
  defaultTripType?: TripType | null;
  defaultPaymentMethod?: PaymentMethod | null;
  recentCustomers?: QuickPickCustomer[];
}) {
  const [text, setText] = useState("");
  const [defaults, setDefaults] = useState<TripFormDefaults | undefined>(
    initialStatus ? { status: initialStatus } : undefined,
  );
  const [parsed, setParsed] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | undefined>(
    initialError,
  );
  const [formKey, setFormKey] = useState(0);
  const [pending, startTransition] = useTransition();

  function parse() {
    const note = text.trim();
    if (!note || pending) return;
    setParseError(null);
    startTransition(async () => {
      const res = await parseTripText(note);
      if (res.error) {
        setParseError(res.error);
        return;
      }
      // Keep scheduling mode if that's how the page was opened — parsing a note
      // fills fields, it doesn't change what kind of trip you're entering.
      setDefaults(
        initialStatus ? { ...res.defaults, status: initialStatus } : res.defaults,
      );
      setParsed(true);
      setSubmitError(undefined);
      setFormKey((k) => k + 1); // remount TripForm so new defaultValues take effect
    });
  }

  return (
    <div className="mt-8">
      <div className="rounded-xl border border-obsidian-line bg-obsidian-graphite p-4 shadow-panel">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-obsidian-silver">
          Log a trip by text
        </p>
        <p className="mt-1 text-[11px] text-obsidian-muted">
          Describe the ride and OBSIDIAN fills the form below for you to review
          — nothing is saved until you press Log trip. Example: &ldquo;logged a
          ride for Ashley, Brooklyn to JFK, $240, $18 gas, $12 tolls&rdquo;.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="logged a ride for Ashley, Brooklyn to JFK, $240, $18 gas, $12 tolls"
          className="mt-3 w-full rounded-lg border border-obsidian-line bg-obsidian-black px-3 py-2 text-sm text-obsidian-platinum placeholder:text-obsidian-muted focus:border-obsidian-cyan focus:outline-none"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={parse}
            disabled={pending || !text.trim()}
            className="rounded-lg bg-obsidian-platinum px-4 py-2 text-sm font-semibold text-obsidian-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Reading…" : "Fill from text"}
          </button>
        </div>
        {parseError ? (
          <p className="mt-3 rounded-lg border border-obsidian-negative/40 bg-obsidian-negative/10 px-3 py-2 text-sm text-obsidian-negative">
            {parseError}
          </p>
        ) : null}
      </div>

      {parsed ? (
        <p className="mt-4 rounded-lg border border-obsidian-cyan/40 bg-obsidian-cyan/10 px-4 py-3 text-sm text-obsidian-cyan">
          Here&apos;s what OBSIDIAN understood — review it and press{" "}
          <span className="font-semibold">Log trip</span> to save, or edit
          anything first. Nothing is saved yet.
        </p>
      ) : null}

      <TripForm
        key={formKey}
        action={createTrip}
        defaults={defaults}
        error={submitError}
        submitLabel="Log trip"
        showInlineCosts
        defaultTripType={defaultTripType}
        defaultPaymentMethod={defaultPaymentMethod}
        recentCustomers={recentCustomers}
      />
    </div>
  );
}
