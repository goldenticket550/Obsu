import type { TripType } from "@/lib/types";
import { enumWords, labelize } from "@/lib/enums";

/**
 * Display wording for a trip type. PURE.
 *
 * The stored values are database enums (`special_occasion`), and until now
 * every surface rendered them raw — the ride form, the lists, and the sentence
 * on the approval card all showed the underscore. One helper, so they cannot
 * disagree about what a type is called.
 *
 * RETURNS LOWERCASE, and callers capitalise.
 *
 * Lowercase is the LOSSLESS form: "special occasion" can be capitalised by a
 * caller that needs a heading, but "Special Occasion" cannot be safely
 * lowercased back, because nothing in the string records which capitals were
 * meaningful. It also suits the main caller — the proposal summary, where the
 * type sits mid-sentence ("Log an airport ride…") and a capital would read as
 * a proper noun.
 *
 * THE CONSTRAINT THIS INHERITS: lowercase is only lossless while no trip type
 * contains a proper noun. A type like "JFK run" breaks it — lowercasing gives
 * "jfk run", and capitalising the first letter gives "Jfk run". Neither is
 * right, and no amount of string manipulation here can recover the information,
 * because the casing that matters was thrown away when the enum was named.
 *
 * Whoever adds such a type inherits that problem and must solve it properly:
 * store the display label alongside the value (a labelled type table), rather
 * than deriving presentation from an identifier. Do not special-case it here.
 */
export function tripTypeLabel(tripType: TripType | string): string {
  // Delegates to the shared normalization. `labelize` in lib/enums derives its
  // Title Case form from the SAME function, so the chip on a list and the word
  // in the approval sentence cannot drift apart — only their casing differs.
  return enumWords(tripType);
}

/** Title Case, for chips and headings. The same words, cased for standing alone. */
export function tripTypeHeading(tripType: TripType | string): string {
  return labelize(tripType);
}
