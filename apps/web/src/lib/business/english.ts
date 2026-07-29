/**
 * Small English copy rules. PURE.
 *
 * These exist because the sentence on the approval card is the one thing the
 * owner reads before authorizing a write. Copy that reads as broken invites
 * the reader to skim, and skimming is exactly what an approval gate cannot
 * afford.
 */

/**
 * Words whose written vowel and spoken vowel disagree. English article choice
 * follows SOUND, not spelling, so a check for a vowel letter gets these wrong
 * in both directions.
 */

/** Silent h — spelled with a consonant, spoken with a vowel. "an hour". */
const SILENT_H_PREFIXES = ["hour", "honest", "honor", "honour", "heir"];

/**
 * Spelled with a vowel, spoken with a consonant — the "yoo" and "wuh" sounds.
 * "a university", "a one-way trip", "a euro".
 */
const CONSONANT_SOUND_VOWEL_PREFIXES = [
  "uni", // university, unit, uniform, union, unique
  "use", // use, used, useful
  "usu", // usual
  "uti", // utility
  "eu", // euro, European, eulogy
  "one", // one-way, once
  "ewe",
];

/**
 * "a" or "an" for a word, decided from the word itself.
 *
 * Derived rather than tabulated because the values it runs on are
 * org-configurable: trip types are data, not a closed set the code can
 * enumerate, so a lookup table would be wrong the moment someone adds one.
 *
 * Honest limit: this is a heuristic over prefixes, not a pronunciation
 * dictionary. "uninvited" and "unassuming" take "an" but begin with "uni" and
 * are answered wrongly. Every trip type in the app today is correct, and a
 * wrong article on an unusual word is a smaller fault than a lookup table that
 * silently omits whatever the owner types next.
 */
export function indefiniteArticle(word: string): "a" | "an" {
  // Leading punctuation and separators are not the sound; skip to the letters.
  const cleaned = word.trim().toLowerCase().replace(/^[^a-z]+/, "");
  if (!cleaned) return "a";

  if (SILENT_H_PREFIXES.some((prefix) => cleaned.startsWith(prefix))) return "an";
  if (CONSONANT_SOUND_VOWEL_PREFIXES.some((prefix) => cleaned.startsWith(prefix))) {
    return "a";
  }
  return /^[aeiou]/.test(cleaned) ? "an" : "a";
}

/** The word with its article, e.g. "an airport". */
export function withIndefiniteArticle(word: string): string {
  return `${indefiniteArticle(word)} ${word}`;
}
