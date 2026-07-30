/**
 * One vocabulary for absence. PURE.
 *
 * Absence has KINDS, and this app already knew that for money — payment.ts
 * distinguishes "not tracked" from "$0.00 received", because they are different
 * claims about the world. Nothing else did. Every component invented its own
 * fallback, so the same missing pickup could read "—" on one screen, "Not set"
 * on another, and "Unknown" on a third.
 *
 * The distinction that matters operationally:
 *
 *   not_set     — a value that SHOULD exist and does not yet. Actionable. The
 *                 owner can fix it, and Action Required may chase it.
 *   not_tracked — a value this business does not record at all. Not a gap, not
 *                 actionable, and must never be presented as one.
 *   none        — a legitimate, complete answer of "there is nothing here".
 *
 * Rendering all three as "—" collapses them, and collapsing them is how a
 * screen ends up nagging someone about a field they deliberately never use.
 */

export type Absence = "not_set" | "not_tracked" | "none";

/** Exhaustive: a new kind of absence fails the type check until it has words. */
export function absenceLabel(kind: Absence): string {
  switch (kind) {
    case "not_set":
      return "Not set";
    case "not_tracked":
      return "Not tracked";
    case "none":
      return "None";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

/**
 * A value, or the words for its absence.
 *
 * Blank and whitespace-only strings count as absent: a field containing " " is
 * not a value, and rendering it produces an empty slot that looks like a bug.
 */
export function valueOr(
  value: string | null | undefined,
  kind: Absence = "not_set",
): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : absenceLabel(kind);
}

/**
 * Whether a slot is showing an absence rather than data.
 *
 * Callers use this to style the slot as muted — the honesty rule is that
 * absence must never look like data, and the styling has to key off the same
 * decision that produced the text.
 */
export function isAbsent(value: string | null | undefined): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}
