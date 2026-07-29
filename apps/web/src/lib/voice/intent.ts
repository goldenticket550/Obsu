/**
 * V2 — what a transcript is asking for. PURE.
 *
 * This owns one boundary: the point where untrusted text is sorted into "a
 * question about the business" and "a request to change the business". Those
 * have different consequences — one reads, one proposes a write — so they are
 * decided in one place with a test around it rather than inferred at a call
 * site.
 *
 * Deliberately deterministic. A model could classify more gracefully, but this
 * decision gates whether a write is proposed at all, and a rule you can read is
 * worth more here than one you have to sample. When intent is unclear the
 * answer is `unclear`, never a guess at a write.
 */

export type Intent =
  /** Nothing was said. */
  | { kind: "empty" }
  /** A question about existing records. Reads only. */
  | { kind: "question" }
  /** A request to record a ride. Produces a PROPOSAL, never a write. */
  | { kind: "log_ride" }
  /**
   * Words shaped like consent — "yes", "do it", "confirm". Named explicitly so
   * it can be REFUSED rather than falling through to something that acts.
   * Approval is a control the user touches; it never arrives as text.
   */
  | { kind: "bare_approval" }
  /** Understood as neither. */
  | { kind: "unclear" };

/** Consent-shaped phrases. Matched whole, so "yes" ≠ "yesterday". */
const APPROVAL_WORDS = [
  "yes",
  "yeah",
  "yep",
  "yup",
  "ok",
  "okay",
  "sure",
  "confirm",
  "confirmed",
  "approve",
  "approved",
  "do it",
  "go ahead",
  "send it",
  "execute",
  "run it",
  "save it",
  "that's right",
  "thats right",
  "correct",
];

/** Verbs that mean "write this down", as opposed to "tell me". */
const LOG_VERBS = [
  "log",
  "logged",
  "record",
  "add",
  "book",
  "schedule",
  "put in",
  "enter",
  "create",
  "new ride",
  "new trip",
];

/** Openers that mean "tell me", which must beat a log verb in the same breath. */
const QUESTION_OPENERS = [
  "how",
  "what",
  "who",
  "when",
  "where",
  "why",
  "which",
  "did",
  "do",
  "does",
  "am",
  "is",
  "are",
  "was",
  "were",
  "can",
  "show",
  "tell",
  "list",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasWholePhrase(haystack: string, needle: string): boolean {
  // Padding both sides turns a substring test into a word-boundary test without
  // building a regex out of user text.
  return ` ${haystack} `.includes(` ${needle} `);
}

/**
 * Classifies a transcript.
 *
 * Order is the design. Approval-shaped text is caught FIRST, before anything
 * that could act on it — a transcript that says "yes, do it" must never reach
 * the branch that proposes a write, no matter what else it contains.
 */
export function classifyIntent(transcript: string): Intent {
  const text = normalize(transcript);
  if (!text) return { kind: "empty" };

  for (const word of APPROVAL_WORDS) {
    if (text === word || hasWholePhrase(text, word)) {
      return { kind: "bare_approval" };
    }
  }

  const firstWord = text.split(" ")[0] ?? "";
  if (QUESTION_OPENERS.includes(firstWord) || transcript.trim().endsWith("?")) {
    return { kind: "question" };
  }

  for (const verb of LOG_VERBS) {
    if (hasWholePhrase(text, verb)) return { kind: "log_ride" };
  }

  return { kind: "unclear" };
}

export interface IntentCopy {
  /** What to say when this intent produces no action. Null when it does act. */
  message: string | null;
}

/** Exhaustive: a new intent fails the type check until its handling exists. */
export function intentCopy(intent: Intent): IntentCopy {
  switch (intent.kind) {
    case "question":
    case "log_ride":
      return { message: null };
    case "empty":
      return { message: "I didn't catch anything. Try again." };
    case "bare_approval":
      return {
        // Says why, because "I can't do that" with no reason reads as a bug.
        message:
          "I can't take a yes as an instruction — approving is a button, so nothing gets done by accident. Tell me what you'd like, and I'll show you the change to approve.",
      };
    case "unclear":
      return {
        message:
          "I'm not sure whether that's a question or something to record. Try \"how much did I make this week\", or \"log a ride for Ashley, $240\".",
      };
    default: {
      const exhaustive: never = intent;
      return exhaustive;
    }
  }
}
