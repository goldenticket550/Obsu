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
 * Format integer cents as a 2-decimal dollar string with thousands separators
 * and no currency symbol, e.g. 124050 -> "1,240.50", 750 -> "7.50".
 */
export function centsToDollars(cents: number): string {
  const n = Number.isFinite(cents) ? cents : 0;
  return (n / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Display helper: integer cents -> "$1,240.00" (negatives as "-$5.00").
 * Built on centsToDollars so all money formatting shares one boundary.
 */
export function formatUsd(cents: number): string {
  const value = Number.isFinite(cents) ? cents : 0;
  const sign = value < 0 ? "-" : "";
  return `${sign}$${centsToDollars(Math.abs(value))}`;
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
