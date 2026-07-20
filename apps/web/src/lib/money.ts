/**
 * Money helpers. Storage is ALWAYS integer cents; the UI works in dollars.
 * Keeping a single conversion boundary here avoids floating-point drift and
 * keeps money logic out of components (build rule #6).
 */

/**
 * Parse a dollar string/number (e.g. "240", "240.50", "$1,240.50") to integer
 * cents. Rejects invalid input and negatives.
 */
export function dollarsToCents(input: string | number): number {
  const raw =
    typeof input === "number"
      ? input
      : parseFloat(String(input).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(raw)) {
    throw new Error("Enter a valid dollar amount.");
  }
  if (raw < 0) {
    throw new Error("Amount cannot be negative.");
  }
  return Math.round(raw * 100);
}

/**
 * Format integer cents as a plain 2-decimal dollar string (no currency
 * symbol), e.g. 24000 -> "240.00".
 */
export function centsToDollars(cents: number): string {
  const n = Number.isFinite(cents) ? cents : 0;
  return (n / 100).toFixed(2);
}

/** Like dollarsToCents, but blank/whitespace -> null (for optional amounts). */
export function optionalDollarsToCents(
  input: string | null | undefined,
): number | null {
  if (input == null) return null;
  const s = String(input).trim();
  if (s === "") return null;
  return dollarsToCents(s);
}
