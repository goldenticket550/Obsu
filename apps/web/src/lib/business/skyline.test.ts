import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { attentionPillText, skylineSubline } from "./skyline";
import { businessDayKey } from "./schedule";
import type { ActionKind } from "./action-required";

/**
 * Skyline Command shell — the top bar's copy.
 *
 * Everything here is pure and takes `now`, so the 4:00 AM business day is
 * decided once and can be tested at the boundary rather than trusted.
 */

const SRC = join(process.cwd(), "src");

const item = (kind: ActionKind) => ({ kind });

describe("the attention pill", () => {
  /** Zero is not a status. An empty slot must not occupy a place meant for a problem. */
  it("renders nothing at zero", () => {
    expect(attentionPillText([])).toBeNull();
  });

  it("is singular for one", () => {
    expect(attentionPillText([item("needs_closing_out")])).toBe(
      "1 ride needs closing out",
    );
  });

  it("is plural for many, and counts them", () => {
    expect(
      attentionPillText([
        item("needs_closing_out"),
        item("needs_closing_out"),
        item("needs_closing_out"),
      ]),
    ).toBe("3 rides need closing out");
  });

  it("names each kind correctly, singular and plural", () => {
    const cases: [ActionKind, string, string][] = [
      ["needs_closing_out", "1 ride needs closing out", "2 rides need closing out"],
      ["missing_revenue", "1 ride is missing its fare", "2 rides are missing their fare"],
      ["missing_customer", "1 ride has no customer", "2 rides have no customer"],
      ["missing_route", "1 ride is missing its route", "2 rides are missing their route"],
      ["quiet_customer", "1 customer has gone quiet", "2 customers have gone quiet"],
    ];
    for (const [kind, one, two] of cases) {
      expect(attentionPillText([item(kind)])).toBe(one);
      expect(attentionPillText([item(kind), item(kind)])).toBe(two);
    }
  });

  /**
   * The reference reads "1 RIDE NEEDS CLOSING OUT", which is only true when the
   * list actually contains that. `quiet_customer` is not a ride, so a pill that
   * always said "rides" would misdescribe the list.
   */
  it("does not call a quiet customer a ride", () => {
    const text = attentionPillText([item("quiet_customer")]) ?? "";
    expect(text).toContain("customer");
    expect(text).not.toContain("ride");
  });

  it("claims nothing specific when the kinds differ", () => {
    expect(
      attentionPillText([item("needs_closing_out"), item("quiet_customer")]),
    ).toBe("2 things need your attention");
    expect(
      attentionPillText([
        item("needs_closing_out"),
        item("quiet_customer"),
        item("missing_route"),
      ]),
    ).toBe("3 things need your attention");
  });

  it("never renders a bare zero", () => {
    const all: ActionKind[] = [
      "needs_closing_out",
      "missing_revenue",
      "missing_customer",
      "missing_route",
      "quiet_customer",
    ];
    for (const kind of all) {
      const text = attentionPillText([item(kind)]) ?? "";
      expect(text).not.toMatch(/\b0\b/);
    }
    expect(attentionPillText([])).toBeNull();
  });
});

describe("the subline speaks the business day", () => {
  /**
   * The 4:00 AM boundary. At 3:59 the night is not over, so the label must
   * still name the previous calendar day.
   */
  const before = new Date("2026-07-30T07:59:00Z"); // 03:59 EDT, Jul 30
  const after = new Date("2026-07-30T08:01:00Z"); // 04:01 EDT, Jul 30

  it("names different days either side of 4:00 AM", () => {
    const early = skylineSubline(before);
    const late = skylineSubline(after);
    expect(early).not.toBe(late);

    // Not merely different strings — genuinely different calendar days.
    expect(businessDayKey(before)).toBe("2026-07-29");
    expect(businessDayKey(after)).toBe("2026-07-30");
    expect(early).toContain("July 29");
    expect(late).toContain("July 30");
  });

  it("greets by the business clock, not the calendar clock", () => {
    // 03:59 is still the evening's work, not the morning's.
    expect(skylineSubline(before)).toContain("Good evening");
    expect(skylineSubline(after)).toContain("Good morning");
  });

  it("reads no ambient clock — the same instant always gives the same text", () => {
    expect(skylineSubline(before)).toBe(skylineSubline(before));
  });
});

describe("the shell hard-codes no business identity", () => {
  it("names no business anywhere in the shell source", () => {
    for (const file of [
      join(SRC, "components", "command", "skyline-shell.tsx"),
      join(SRC, "components", "command", "skyline-shell.module.css"),
      join(SRC, "lib", "business", "skyline.ts"),
      join(SRC, "app", "page.tsx"),
    ]) {
      const text = readFileSync(file, "utf8");
      expect(text).not.toMatch(/midnight\s*rydes/i);
      expect(text).not.toContain("Your business");
    }
  });

  it("the eyebrow comes from the org record and falls back to empty, not a literal", () => {
    const shell = readFileSync(
      join(SRC, "components", "command", "skyline-shell.tsx"),
      "utf8",
    );
    expect(shell).toContain("businessName ?? \"\"");

    const page = readFileSync(join(SRC, "app", "page.tsx"), "utf8");
    expect(page).toContain("businessName={org?.name ?? null}");
  });

  it("the page passes now down rather than letting the shell read a clock", () => {
    const shell = readFileSync(
      join(SRC, "components", "command", "skyline-shell.tsx"),
      "utf8",
    );
    expect(shell).not.toContain("new Date(");
    expect(shell).not.toContain("Date.now(");
  });

  it("the pill and Action Required read the same array", () => {
    const page = readFileSync(join(SRC, "app", "page.tsx"), "utf8");
    expect(page).toContain("actionItems={actionItems}");
    expect(page).toContain("<ActionRequired items={actionItems} />");
    expect(page).toContain("needsAttention={actionItems.length > 0}");
  });
});

describe("shell class scoping", () => {
  it("uses a CSS module, so .shell and .grid cannot leak", () => {
    const shell = readFileSync(
      join(SRC, "components", "command", "skyline-shell.tsx"),
      "utf8",
    );
    expect(shell).toContain('from "./skyline-shell.module.css"');
  });

  it("no shell layer name exists in the global stylesheet", () => {
    const globals = readFileSync(join(SRC, "app", "globals.css"), "utf8");
    for (const name of [
      "atmos",
      "horizon",
      "shell",
      "grid",
      "topbar",
      "eyebrow",
      "subline",
      "pill",
      "panel",
      "content",
    ]) {
      expect(globals).not.toContain(`.${name}`);
    }
  });

  it("the module pastes no raw hex for semantic colour", () => {
    const css = readFileSync(
      join(SRC, "components", "command", "skyline-shell.module.css"),
      "utf8",
    );
    // The atmospheric washes are alpha gradients with no palette equivalent;
    // solid semantic colours must come from token classes instead.
    expect(css).not.toMatch(/color:\s*#[0-9a-f]{6}\s*;/i);
    expect(css).not.toMatch(/border(-color)?:\s*[^;]*#[0-9a-f]{6}/i);
  });
});
