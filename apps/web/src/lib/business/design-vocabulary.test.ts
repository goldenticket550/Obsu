import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { tripTypeLabel, tripTypeHeading } from "./trip-type";
import { absenceLabel, isAbsent, valueOr, type Absence } from "./missing";
import { enumWords, labelize, TRIP_TYPES } from "@/lib/enums";
import { summarizeProposal, type ProposalAction } from "./proposal";
import {
  MAX_TURNS,
  appendRedacted,
  appendTurn,
  clearConversation,
  isSafeToRetain,
  type ConversationTurn,
} from "@/lib/conversation";

const SRC = join(process.cwd(), "src");
const COMMAND_DIR = join(SRC, "components", "command");

/* ================================================================== */
/* The palette/vocabulary split                                        */
/* ================================================================== */

describe("components reach the palette only through the vocabulary", () => {
  function commandFiles(): string[] {
    return readdirSync(COMMAND_DIR, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
      .map((entry) => join(COMMAND_DIR, entry.name));
  }

  /**
   * ITEM A — the guard that proves the guard.
   *
   * A walk over an empty list passes silently, so the scan below would report
   * success if the directory were renamed, moved, or emptied. That near-miss
   * already happened once with the provider-key guard. This test fails if the
   * scan has nothing to scan.
   */
  it("finds the files it claims to check — the guard is not vacuous", () => {
    const files = commandFiles();
    expect(files.length).toBeGreaterThanOrEqual(6);
    // And they are real, non-empty sources, not stubs that trivially pass.
    for (const file of files) {
      expect(readFileSync(file, "utf8").length).toBeGreaterThan(200);
    }
  });

  it("no Command Center component names a palette colour directly", () => {
    const offenders: string[] = [];
    for (const file of commandFiles()) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/obsidian-[a-z]+/g)) {
        offenders.push(`${file.split(/[\\/]/).pop()} → ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no Command Center component hardcodes a hex value", () => {
    const offenders: string[] = [];
    for (const file of commandFiles()) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
        offenders.push(`${file.split(/[\\/]/).pop()} → ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  /** The vocabulary must actually exist, or the classes above are dead. */
  it("every vocabulary token is defined in the Tailwind config", () => {
    const config = readFileSync(join(process.cwd(), "tailwind.config.ts"), "utf8");
    for (const token of [
      "surface",
      "line",
      "content",
      "accent",
      "state",
      "raised",
      "sunken",
      "primary",
      "secondary",
      "muted",
      "soft",
      "positive",
      "warning",
      "danger",
    ]) {
      expect(config).toContain(token);
    }
  });

  /**
   * The vocabulary duplicates the palette's hexes rather than referencing them
   * (Tailwind config is a plain object). This pins them together, so a palette
   * change that misses its vocabulary entry fails here rather than on screen.
   */
  it("vocabulary hexes match the palette they stand for", () => {
    const config = readFileSync(join(process.cwd(), "tailwind.config.ts"), "utf8");
    const hex = (name: string): string | undefined =>
      config.match(new RegExp(`${name}:\\s*"(#[0-9a-fA-F]{6})"`))?.[1];

    expect(hex("base")).toBe(hex("black"));
    expect(hex("raised")).toBe(hex("graphite"));
    expect(hex("sunken")).toBe(hex("slate"));
    expect(hex("primary")).toBe(hex("platinum"));
    expect(hex("secondary")).toBe(hex("silver"));
    expect(hex("soft")).toBe(hex("cyan"));
  });
});

/* ================================================================== */
/* Trip-type labels                                                    */
/* ================================================================== */

describe("one answer to what a trip type is called", () => {
  it("returns lowercase words, for mid-sentence use", () => {
    expect(tripTypeLabel("special_occasion")).toBe("special occasion");
    expect(tripTypeLabel("airport")).toBe("airport");
  });

  it("returns Title Case for standing alone", () => {
    expect(tripTypeHeading("special_occasion")).toBe("Special Occasion");
  });

  /**
   * The rule this project enforces everywhere: two functions must never answer
   * the same question independently. Both casings derive from `enumWords`.
   */
  it("the sentence form and the chip form derive from the same words", () => {
    for (const type of TRIP_TYPES) {
      expect(tripTypeLabel(type)).toBe(enumWords(type));
      expect(tripTypeHeading(type)).toBe(labelize(type));
      // Same words, different casing — never different words.
      expect(tripTypeHeading(type).toLowerCase()).toBe(tripTypeLabel(type));
    }
  });

  it("no underscore survives to any surface", () => {
    for (const type of TRIP_TYPES) {
      expect(tripTypeLabel(type)).not.toContain("_");
      expect(tripTypeHeading(type)).not.toContain("_");
    }
  });

  it("the approval sentence uses the label, not the raw enum", () => {
    const action = {
      kind: "create_trip",
      customerName: "Ashley",
      tripDate: "2026-07-28",
      tripType: "special_occasion",
      status: "scheduled",
      revenueCents: 24000,
      pickup: null,
      dropoff: null,
      paymentMethod: null,
      costs: { gasCents: null, tollsCents: null, otherCents: null, otherLabel: null },
    } as ProposalAction;

    const summary = summarizeProposal(action, new Date("2026-07-28T23:00:00Z"));
    expect(summary).toContain("a special occasion ride");
    expect(summary).not.toContain("special_occasion");
  });

  it("survives blank and odd input", () => {
    expect(tripTypeLabel("")).toBe("");
    expect(tripTypeLabel("  AIRPORT  ")).toBe("airport");
    expect(tripTypeLabel("a__b")).toBe("a b");
  });
});

/* ================================================================== */
/* Absence                                                             */
/* ================================================================== */

describe("absence has kinds, and they are not interchangeable", () => {
  it("gives each kind its own words", () => {
    const kinds: Absence[] = ["not_set", "not_tracked", "none"];
    const labels = kinds.map(absenceLabel);
    expect(labels).toEqual(["Not set", "Not tracked", "None"]);
    // Three distinct claims, three distinct strings.
    expect(new Set(labels).size).toBe(3);
  });

  it("does not collapse 'not tracked' into 'not set'", () => {
    // The distinction payment.ts already made for money, now available to all.
    expect(absenceLabel("not_tracked")).not.toBe(absenceLabel("not_set"));
  });

  it("treats blank and whitespace as absent", () => {
    expect(isAbsent(null)).toBe(true);
    expect(isAbsent(undefined)).toBe(true);
    expect(isAbsent("")).toBe(true);
    expect(isAbsent("   ")).toBe(true);
    expect(isAbsent("JFK")).toBe(false);
  });

  it("falls back to the right words, and trims a real value", () => {
    expect(valueOr(null)).toBe("Not set");
    expect(valueOr("  ", "not_tracked")).toBe("Not tracked");
    expect(valueOr("  JFK  ")).toBe("JFK");
  });
});

/* ================================================================== */
/* Conversation — bounded, clearable, redacted                         */
/* ================================================================== */

describe("the conversation is bounded and clearable", () => {
  const turn = (n: number): ConversationTurn => ({ role: "user", text: `turn ${n}` });

  it("never grows past the cap", () => {
    let history: ConversationTurn[] = [];
    for (let i = 0; i < MAX_TURNS * 3; i += 1) history = appendTurn(history, turn(i));
    expect(history).toHaveLength(MAX_TURNS);
  });

  it("drops the oldest, keeping the most recent exchange", () => {
    let history: ConversationTurn[] = [];
    for (let i = 0; i < MAX_TURNS + 3; i += 1) history = appendTurn(history, turn(i));
    const first = history[0];
    const last = history[history.length - 1];
    expect(first && "text" in first ? first.text : "").toBe("turn 3");
    expect(last && "text" in last ? last.text : "").toBe(`turn ${MAX_TURNS + 2}`);
  });

  it("does not mutate the array it was given", () => {
    const original: ConversationTurn[] = [turn(1)];
    const next = appendTurn(original, turn(2));
    expect(original).toHaveLength(1);
    expect(next).toHaveLength(2);
  });

  it("clears to empty", () => {
    expect(clearConversation()).toEqual([]);
  });

  /**
   * These turns name real customers. A credential pasted into the box would
   * sit in memory beside them, so it is not retained at all.
   */
  it("refuses to retain anything that looks like a credential", () => {
    expect(isSafeToRetain("How much did I make?")).toBe(true);
    expect(isSafeToRetain("my password is hunter2")).toBe(false);
    expect(isSafeToRetain("here is the API key sk-123")).toBe(false);
    expect(isSafeToRetain("bearer eyJhbGciOi")).toBe(false);
  });

  it("replaces a redacted turn with a note rather than dropping it silently", () => {
    const history = appendRedacted([], { role: "user", text: "my password is hunter2" });
    expect(history).toHaveLength(1);
    expect(history[0]?.role).toBe("error");
    expect(history[0] && "text" in history[0] ? history[0].text : "").toMatch(/credential/i);
    // The secret itself is gone.
    expect(JSON.stringify(history)).not.toContain("hunter2");
  });

  it("the sign-out control clears the conversation before navigating", () => {
    const shell = readFileSync(join(SRC, "components", "app-shell.tsx"), "utf8");
    expect(shell).toContain("announceSignOut");
    expect(shell).toContain("onSubmit={announceSignOut}");

    const ask = readFileSync(join(SRC, "components", "ask-obsidian.tsx"), "utf8");
    expect(ask).toContain("SIGN_OUT_EVENT");
    expect(ask).toContain("clearConversation()");
  });

  /**
   * Nothing may persist across a reload. Verified by absence: if any storage
   * API appears in src, this history could outlive the session.
   */
  it("nothing in the app writes conversation state to browser storage", () => {
    function sourceFiles(dir: string): string[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) return sourceFiles(full);
        return entry.isFile() && /\.tsx?$/.test(entry.name) ? [full] : [];
      });
    }
    const offenders: string[] = [];
    let scanned = 0;
    for (const file of sourceFiles(SRC)) {
      if (/\.test\.tsx?$/.test(file)) continue;
      scanned += 1;
      // Comments stripped: conversation.ts names these APIs precisely to
      // record that none of them is used. The rule is about code.
      const code = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "");
      if (/localStorage|sessionStorage|indexedDB/.test(code)) offenders.push(file);
    }
    // Not vacuous: it really walked the tree.
    expect(scanned).toBeGreaterThan(30);
    expect(offenders).toEqual([]);
  });
});
