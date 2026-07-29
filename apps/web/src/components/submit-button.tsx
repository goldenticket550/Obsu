"use client";

import { useEffect, useRef, useState } from "react";
import {
  shouldAllowSubmit,
  submitLabelFor,
  type SubmitPhase,
} from "@/lib/submit-guard";

/**
 * Submit button that cannot be double-submitted.
 *
 * The CRUD forms post to server actions via `<form action={serverAction}>`, and
 * most of those pages are SERVER components — so the pending state has to live
 * in the button itself. React 18.3 (this project's version) does not ship
 * `useFormStatus`, so this listens to the owning form's native `submit` event
 * instead: after the first submit the button disables itself, which both blocks
 * a second POST and shows honest progress.
 *
 * Why this matters here: `createTrip` writes a trip AND its linked gas/tolls/
 * other expense rows. A double-click on a slow connection previously created
 * duplicate trips and duplicate money records.
 *
 * The guard is released if the page is restored from the back/forward cache
 * (`pageshow`), so returning to a form never leaves a permanently dead button.
 */
export function SubmitButtonClient({
  children,
  pendingLabel,
}: {
  /** Idle label. A string so the pending swap stays a simple text change. */
  children: string;
  pendingLabel?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<SubmitPhase>("idle");
  const phaseRef = useRef<SubmitPhase>("idle");

  useEffect(() => {
    const form = buttonRef.current?.form;
    if (!form) return;

    const onSubmit = (event: Event) => {
      // Native validation failures never reach a submit event, so a form that
      // failed `required`/`minLength` checks stays fully interactive.
      if (!shouldAllowSubmit(phaseRef.current)) {
        // A second submit slipped through (e.g. Enter key while disabled) —
        // block it so no duplicate record is written.
        event.preventDefault();
        return;
      }
      phaseRef.current = "submitting";
      setPhase("submitting");
    };
    // Re-enable when the page is shown again (incl. bfcache Back navigation),
    // so returning to a form never leaves a permanently dead button.
    const onPageShow = () => {
      phaseRef.current = "idle";
      setPhase("idle");
    };

    form.addEventListener("submit", onSubmit);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      form.removeEventListener("submit", onSubmit);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  const submitting = phase === "submitting";
  return (
    <button
      ref={buttonRef}
      type="submit"
      disabled={submitting}
      className="rounded-lg bg-obsidian-platinum px-4 py-2 text-sm font-semibold text-obsidian-black transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-obsidian-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian-black disabled:cursor-not-allowed disabled:opacity-60"
    >
      {submitLabelFor(phase, children, pendingLabel)}
    </button>
  );
}
