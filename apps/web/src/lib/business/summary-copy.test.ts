import { describe, expect, it } from "vitest";
import { indefiniteArticle, withIndefiniteArticle } from "./english";
import { businessDayPhrase, businessDayLabelParts } from "./schedule";
import { summarizeProposal, type ProposalAction } from "./proposal";
import { TRIP_TYPES } from "@/lib/enums";

/**
 * The approval sentence is the one thing the owner reads before authorizing a
 * write. Both bugs these cover were cosmetic in isolation and load-bearing in
 * place: copy that reads as broken invites skimming, and an approval gate
 * cannot afford a skimmed sentence.
 */

// 7 PM EDT on Tuesday July 28 — inside the business day for 2026-07-28.
const NOW = new Date("2026-07-28T23:00:00Z");

/**
 * `tripType` is widened to string on purpose: trip types are org-configurable
 * data, so the article rule has to hold for values the union does not yet name.
 */
function rideOn(tripDate: string, tripType = "airport"): ProposalAction {
  return {
    kind: "create_trip",
    customerName: "Ashley",
    tripDate,
    tripType,
    status: "scheduled",
    revenueCents: 24000,
    pickup: null,
    dropoff: null,
    paymentMethod: null,
    costs: { gasCents: null, tollsCents: null, otherCents: null, otherLabel: null },
  } as ProposalAction;
}

/* ------------------------------------------------------------------ */
/* 1 — the article follows the SOUND of the trip type                  */
/* ------------------------------------------------------------------ */

describe("the indefinite article is derived, not tabulated", () => {
  it("uses 'an' before a vowel sound", () => {
    expect(indefiniteArticle("airport")).toBe("an");
    expect(indefiniteArticle("event")).toBe("an");
    expect(indefiniteArticle("other")).toBe("an");
    expect(indefiniteArticle("island")).toBe("an");
  });

  it("uses 'a' before a consonant sound", () => {
    expect(indefiniteArticle("prom")).toBe("a");
    expect(indefiniteArticle("photoshoot")).toBe("a");
    expect(indefiniteArticle("nightlife")).toBe("a");
    expect(indefiniteArticle("wedding")).toBe("a");
  });

  /** The case a vowel-letter check gets wrong: the h is silent. */
  it("uses 'an' for a silent h — 'an hourly ride', not 'a hourly ride'", () => {
    expect(indefiniteArticle("hourly")).toBe("an");
    expect(indefiniteArticle("hour")).toBe("an");
    expect(indefiniteArticle("honest")).toBe("an");
    // A spoken h still takes "a".
    expect(indefiniteArticle("holiday")).toBe("a");
    expect(indefiniteArticle("hotel")).toBe("a");
  });

  /** The mirror case: a vowel letter that is spoken as a consonant. */
  it("uses 'a' for a vowel spelled with a consonant sound", () => {
    expect(indefiniteArticle("university")).toBe("a");
    expect(indefiniteArticle("uniform")).toBe("a");
    expect(indefiniteArticle("one-way")).toBe("a");
    expect(indefiniteArticle("euro")).toBe("a");
    // …while other u-words keep "an".
    expect(indefiniteArticle("uptown")).toBe("an");
    expect(indefiniteArticle("urgent")).toBe("an");
  });

  it("survives the input it will actually be handed", () => {
    expect(indefiniteArticle("")).toBe("a");
    expect(indefiniteArticle("   ")).toBe("a");
    expect(indefiniteArticle("AIRPORT")).toBe("an");
    expect(indefiniteArticle("  airport  ")).toBe("an");
    expect(indefiniteArticle("_airport")).toBe("an");
    expect(indefiniteArticle("123")).toBe("a");
  });

  it("composes into the phrase callers actually want", () => {
    expect(withIndefiniteArticle("airport")).toBe("an airport");
    expect(withIndefiniteArticle("prom")).toBe("a prom");
  });

  /**
   * Trip types are org-configurable, so this is checked against the real list
   * rather than a copy of it — a new type added to the enum is covered the day
   * it lands.
   */
  it("answers for every trip type in the app, and gets today's list right", () => {
    for (const type of TRIP_TYPES) {
      expect(["a", "an"]).toContain(indefiniteArticle(type));
    }
    const expected: Record<string, "a" | "an"> = {
      airport: "an",
      hourly: "an",
      event: "an",
      prom: "a",
      photoshoot: "a",
      nightlife: "a",
      special_occasion: "a",
      other: "an",
    };
    for (const type of TRIP_TYPES) {
      expect(`${type}: ${indefiniteArticle(type)}`).toBe(`${type}: ${expected[type]}`);
    }
  });

  it("the summary says 'an airport ride', never 'a airport ride'", () => {
    const summary = summarizeProposal(rideOn("2026-07-28", "airport"), NOW);
    expect(summary).toContain("an airport ride");
    expect(summary).not.toContain("a airport");
  });

  it("the summary says 'an hourly ride', never 'a hourly ride'", () => {
    const summary = summarizeProposal(rideOn("2026-07-28", "hourly"), NOW);
    expect(summary).toContain("an hourly ride");
    expect(summary).not.toContain("a hourly");
  });

  it("no trip type ever produces a mismatched article in a real summary", () => {
    for (const type of TRIP_TYPES) {
      const summary = summarizeProposal(rideOn("2026-07-28", type), NOW);
      const article = indefiniteArticle(type);
      expect(summary).toContain(`${article} ${type} ride`);
      // The wrong article must not appear in front of this type anywhere.
      const wrong = article === "a" ? "an" : "a";
      expect(summary).not.toContain(`${wrong} ${type} ride`);
    }
  });
});

/* ------------------------------------------------------------------ */
/* 2 — the day phrase carries its own preposition                      */
/* ------------------------------------------------------------------ */

describe("the day reads as a phrase, not a pasted heading", () => {
  it("puts a relative day in parentheses and drops 'on'", () => {
    expect(businessDayPhrase({ relative: "tonight", dateLabel: "Wednesday, July 29" })).toBe(
      "tonight (Wednesday, July 29)",
    );
    expect(businessDayPhrase({ relative: "tomorrow", dateLabel: "Thursday, July 30" })).toBe(
      "tomorrow (Thursday, July 30)",
    );
  });

  it("keeps 'on' when there is no relative word — the branch that needs it", () => {
    expect(businessDayPhrase({ relative: null, dateLabel: "Saturday, August 8" })).toBe(
      "on Saturday, August 8",
    );
  });

  it("handles a relative word with no date, and neither", () => {
    expect(businessDayPhrase({ relative: "today", dateLabel: "" })).toBe("today");
    expect(businessDayPhrase({ relative: null, dateLabel: "" })).toBe("");
  });

  it("never produces 'on' before a relative word, in ANY branch", () => {
    const relatives = ["today", "tonight", "tomorrow", "yesterday"] as const;
    for (const relative of relatives) {
      for (const dateLabel of ["Wednesday, July 29", ""]) {
        const phrase = businessDayPhrase({ relative, dateLabel });
        expect(phrase.startsWith("on ")).toBe(false);
        expect(phrase).not.toContain("·");
        // Mid-sentence, so it is not capitalised like a heading.
        expect(phrase[0]).toBe(phrase[0]?.toLowerCase());
      }
    }
  });

  it("reads correctly for a relative day in the real summary", () => {
    const summary = summarizeProposal(rideOn("2026-07-28"), NOW);
    expect(summary).toContain("for Ashley tonight (Tuesday, July 28)");
    expect(summary).not.toContain("on Tonight");
    expect(summary).not.toContain("on tonight");
    expect(summary).not.toContain("·");
  });

  it("reads correctly for a distant day in the real summary", () => {
    // Far enough out that no relative word applies.
    const summary = summarizeProposal(rideOn("2026-08-08"), NOW);
    expect(summary).toContain("for Ashley on Saturday, August 8");
  });

  it("reads correctly for tomorrow and yesterday", () => {
    expect(summarizeProposal(rideOn("2026-07-29"), NOW)).toContain(
      "tomorrow (Wednesday, July 29)",
    );
    expect(summarizeProposal(rideOn("2026-07-27"), NOW)).toContain(
      "yesterday (Monday, July 27)",
    );
  });

  it("drops the clause entirely rather than leaving a gap, on an unreadable date", () => {
    const summary = summarizeProposal(rideOn("not-a-date"), NOW);
    expect(summary).not.toMatch(/ {2}/);
    expect(summary).not.toContain(" ,");
    expect(summary).toContain("for Ashley");
  });

  it("still derives from the same parts as the heading form", () => {
    // One answer to "what day is this"; two wordings of it.
    const parts = businessDayLabelParts("2026-07-28", NOW);
    expect(businessDayPhrase(parts)).toBe("tonight (Tuesday, July 28)");
    expect(parts.relative).toBe("tonight");
  });
});

/* ------------------------------------------------------------------ */
/* the whole sentence, end to end                                      */
/* ------------------------------------------------------------------ */

describe("the sentence the owner authorizes", () => {
  it("reads cleanly, with no doubled spaces or stray punctuation", () => {
    for (const type of TRIP_TYPES) {
      for (const date of ["2026-07-28", "2026-07-29", "2026-08-08"]) {
        const summary = summarizeProposal(rideOn(date, type), NOW);
        expect(summary).not.toMatch(/ {2}/);
        expect(summary).not.toMatch(/\s[,.]/);
        expect(summary).not.toContain("·");
        expect(summary.endsWith(".")).toBe(true);
      }
    }
  });

  it("is exactly what it should be, in full", () => {
    expect(summarizeProposal(rideOn("2026-07-28", "airport"), NOW)).toBe(
      "Schedule an airport ride for Ashley tonight (Tuesday, July 28) for $240.00.",
    );
    expect(summarizeProposal(rideOn("2026-08-08", "hourly"), NOW)).toBe(
      "Schedule an hourly ride for Ashley on Saturday, August 8 for $240.00.",
    );
    expect(summarizeProposal(rideOn("2026-08-08", "prom"), NOW)).toBe(
      "Schedule a prom ride for Ashley on Saturday, August 8 for $240.00.",
    );
  });
});
