/**
 * Pure state logic for the duplicate-submission guard used by SubmitButton.
 *
 * Kept out of the component so it can be unit-tested with the project's
 * existing `node`-environment vitest setup (there is no DOM test runner in this
 * project, and adding one for this correction would be disproportionate). The
 * component owns the DOM wiring; this owns the decision.
 */

export type SubmitPhase = "idle" | "submitting";

export const DEFAULT_PENDING_LABEL = "Saving…";

/**
 * Whether a submit attempt should be allowed through. The FIRST submit passes;
 * any further attempt while one is in flight is blocked — this is what stops a
 * double-click from creating duplicate trips, expenses, or customers.
 */
export function shouldAllowSubmit(phase: SubmitPhase): boolean {
  return phase === "idle";
}

/** The label to render for the current phase. */
export function submitLabelFor(
  phase: SubmitPhase,
  idleLabel: string,
  pendingLabel: string = DEFAULT_PENDING_LABEL,
): string {
  return phase === "submitting" ? pendingLabel : idleLabel;
}
