/**
 * C1 — the organization's name as it is allowed to appear in a system prompt.
 *
 * The business name is USER-SUPPLIED at onboarding, so interpolating it into a
 * system prompt is an injection surface. It is treated as untrusted text and
 * as a LABEL ONLY: it identifies whose business the assistant is speaking
 * about. It is never data the model computes with, reasons over, or may use to
 * justify a number — the no-fabrication rule is unchanged, and every figure
 * still comes from a tool result.
 *
 * Defence is layered:
 *  1. Control characters (including newlines and tabs) are removed, so the
 *     value cannot open a new line and pose as another instruction.
 *  2. Double quotes and backticks are removed, so it cannot close the quoted
 *     span it is placed in.
 *  3. Length is bounded, so it cannot flood the prompt or push the real rules
 *     out of the model's attention.
 *  4. The caller places it on ONE quoted line, states the operative rules
 *     AFTER it, and explicitly instructs the model to ignore any directions
 *     contained inside the name itself.
 *
 * PURE — no data access, fully unit-testable.
 */

export const MAX_BUSINESS_NAME_LENGTH = 60;

/** Used when the org has no usable name. Never a real business's name. */
export const FALLBACK_BUSINESS_NAME = "this business";

/**
 * True for C0 controls (0x00–0x1F, which includes \n, \r and \t), DEL (0x7F),
 * and C1 controls (0x80–0x9F). Written as an explicit check rather than a
 * regex escape range so the intent is readable and cannot be mangled.
 */
function isControlChar(codePoint: number): boolean {
  return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f);
}

function stripControlChars(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0);
    out += code !== undefined && isControlChar(code) ? " " : ch;
  }
  return out;
}

/**
 * Reduces an org name to a single safe line suitable for prompt
 * interpolation. Returns the neutral fallback when nothing usable remains.
 */
export function sanitizeBusinessName(raw: string | null | undefined): string {
  if (typeof raw !== "string") return FALLBACK_BUSINESS_NAME;

  const cleaned = stripControlChars(raw)
    // Delimiters that could terminate the quoted span the name sits in.
    .replace(/["`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return FALLBACK_BUSINESS_NAME;

  return cleaned.length > MAX_BUSINESS_NAME_LENGTH
    ? cleaned.slice(0, MAX_BUSINESS_NAME_LENGTH).trim()
    : cleaned;
}
