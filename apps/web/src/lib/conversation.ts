/**
 * The visible conversation. PURE, bounded, and session-only.
 *
 * WHY THIS IS A PRIVACY CONCERN AND NOT POLISH: these turns contain spoken
 * transcripts naming real customers, their pickups, and what they paid. A
 * laptop left open — or stolen — with that history on screen exposes a
 * customer list, not a chat log.
 *
 * Two properties, both enforced here rather than remembered at call sites:
 *
 *   BOUNDED. `MAX_TURNS` is a hard cap. An unbounded list grows for as long as
 *   the tab is open, so the exposure grows with it, and there is no reason to
 *   keep the twentieth-most-recent answer on screen.
 *
 *   CLEARABLE. `clearConversation()` exists so sign-out can drop it explicitly
 *   rather than relying on a component unmounting during navigation. Today
 *   sign-out does navigate and React state does die — verified: there is no
 *   localStorage, sessionStorage, IndexedDB or cookie use anywhere in `src`,
 *   so nothing survives a reload either. But "it happens to unmount" is a
 *   property of the current routing, not a guarantee, and a privacy guarantee
 *   that depends on a redirect is one refactor from being false.
 *
 * NOT PERSISTED, deliberately. Adding storage would need an authorized model
 * for retaining customer names on the device, and there isn't one.
 */

/**
 * Broadcast when the user signs out, so anything holding conversation state
 * drops it at that moment rather than whenever navigation happens to unmount
 * it. The distinction matters: unmount is a consequence of the current
 * routing, and a privacy guarantee that depends on a redirect is one refactor
 * away from being false.
 */
export const SIGN_OUT_EVENT = "obsidian:sign-out";

/** Fired from the sign-out control, before the server action navigates. */
export function announceSignOut(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SIGN_OUT_EVENT));
  }
}

export type ConversationTurn =
  /** What the user said or typed. Untrusted text; render, never execute. */
  | { role: "user"; text: string }
  /** A read-only answer. */
  | { role: "assistant"; text: string }
  /** A proposed change awaiting approval. Nothing was written. */
  | { role: "proposal"; summary: string }
  /** What came of an approved action. */
  | { role: "outcome"; text: string; ok: boolean }
  | { role: "error"; text: string };

/**
 * How many turns stay on screen. Small on purpose: this is an operational
 * assistant, not a chat history, and the useful context is the last exchange.
 */
export const MAX_TURNS = 12;

/**
 * Appends a turn, dropping the oldest beyond the cap.
 *
 * Returns a new array — never mutates — so React state updates behave.
 */
export function appendTurn(
  history: readonly ConversationTurn[],
  turn: ConversationTurn,
): ConversationTurn[] {
  const next = [...history, turn];
  return next.length > MAX_TURNS ? next.slice(next.length - MAX_TURNS) : next;
}

/** Everything gone. Used on sign-out and on an explicit clear. */
export function clearConversation(): ConversationTurn[] {
  return [];
}

/**
 * Whether a turn's text may be read aloud or shown.
 *
 * A guard against the one thing that must never reach this list: credentials
 * or tokens pasted into the box. Those would otherwise sit in memory and on
 * screen alongside customer names.
 */
export function isSafeToRetain(text: string): boolean {
  const lowered = text.toLowerCase();
  return !/\b(password|passwd|api[_ -]?key|secret|bearer|token)\b/.test(lowered);
}

/**
 * Appends only if the text is safe to keep. Unsafe text is replaced with a
 * note, so the conversation does not silently lose a turn — the user should
 * see that something was withheld and why.
 */
export function appendRedacted(
  history: readonly ConversationTurn[],
  turn: ConversationTurn,
): ConversationTurn[] {
  const text = turn.role === "proposal" ? turn.summary : turn.text;
  if (isSafeToRetain(text)) return appendTurn(history, turn);
  return appendTurn(history, {
    role: "error",
    text: "That looked like it contained a credential, so it wasn't kept.",
  });
}
