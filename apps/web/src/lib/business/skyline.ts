import type { ActionKind } from "./action-required";
import { businessDateLabel, greetingFor } from "./command-center";

/**
 * Skyline Command shell — the copy for the top bar. PURE.
 *
 * Everything here takes `now` as an argument. No component calls new Date(),
 * so the 4:00 AM business-day boundary stays testable and the server and
 * client cannot disagree about what day it is.
 */

/**
 * The attention pill.
 *
 * The reference reads "1 RIDE NEEDS CLOSING OUT", which is right only when
 * that is genuinely what the list contains. `buildActionRequired` returns five
 * kinds, and one of them — `quiet_customer` — is not a ride at all, so a pill
 * that always said "rides" would misdescribe the list the moment a customer
 * went quiet.
 *
 * So the wording is derived: when every item shares a kind, the pill names it
 * exactly; when they differ, it falls back to a count that claims nothing
 * specific. Zero renders NOTHING — not "0 rides", which would occupy a slot
 * meant for a problem with the absence of one.
 */
export function attentionPillText(
  items: readonly { kind: ActionKind }[],
): string | null {
  const count = items.length;
  if (count === 0) return null;

  const kinds = new Set(items.map((item) => item.kind));
  const only = kinds.size === 1 ? [...kinds][0] : null;
  if (!only) {
    return count === 1
      ? "1 thing needs your attention"
      : `${count} things need your attention`;
  }

  const plural = count > 1;
  switch (only) {
    case "needs_closing_out":
      return plural
        ? `${count} rides need closing out`
        : "1 ride needs closing out";
    case "missing_revenue":
      return plural
        ? `${count} rides are missing their fare`
        : "1 ride is missing its fare";
    case "missing_customer":
      return plural
        ? `${count} rides have no customer`
        : "1 ride has no customer";
    case "missing_route":
      return plural
        ? `${count} rides are missing their route`
        : "1 ride is missing its route";
    case "quiet_customer":
      return plural
        ? `${count} customers have gone quiet`
        : "1 customer has gone quiet";
    default: {
      const exhaustive: never = only;
      return exhaustive;
    }
  }
}

/**
 * The top bar's subline: a greeting and the business day.
 *
 * Both halves come from the existing 4:00 AM America/New_York functions, so at
 * 3:59 AM this still reads as the previous business day — the night is not
 * over until four.
 */
export function skylineSubline(now: Date): string {
  return `${greetingFor(now)} · ${businessDateLabel(now)}`;
}
