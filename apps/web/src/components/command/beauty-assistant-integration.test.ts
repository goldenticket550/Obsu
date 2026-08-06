import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const controller = readFileSync(join(SRC, "components", "command", "obsidian-intelligence.tsx"), "utf8");
const beautyHome = readFileSync(join(SRC, "app", "beauty", "page.tsx"), "utf8");
const sharedStyles = readFileSync(join(SRC, "components", "command", "obsidian-intelligence.module.css"), "utf8");
const beautyStyles = readFileSync(join(SRC, "app", "beauty", "beauty-home.module.css"), "utf8");

describe("Beauty Home assistant integration", () => {
  it("mounts the shared controller, never the bare canvas", () => {
    expect(beautyHome).toContain("<ObsidianIntelligence");
    expect(beautyHome).toContain("showTodayOverview");
    expect(beautyHome).toContain("speakTypedAnswers");
    expect(beautyHome).not.toContain("EclipseIrisCanvas");
    expect(beautyHome).not.toContain("eclipse-iris-canvas");
  });

  it("submits Today's overview through the same verified Ask function", () => {
    expect(controller).toContain("BEAUTY_TODAY_OVERVIEW_REQUEST");
    expect(controller).toContain("void run(BEAUTY_TODAY_OVERVIEW_REQUEST)");
    expect(controller).toContain("const turn = await submitTranscript(trimmed)");
    expect(controller).toContain("today's appointments");
    expect(controller).toContain("revenue summary");
    expect(controller).toContain("fills are due");
    expect(controller).toContain("do not send any reminders or messages");
  });

  it("keeps the labelled typed fallback and speaks Beauty typed answers", () => {
    expect(controller).toContain('htmlFor="obsidian-ask"');
    expect(controller).toContain('type="submit"');
    expect(controller).toContain('source === "voice" || speakTypedAnswers');
    expect(controller).toContain("await speak(turn.text)");
    expect(controller).toContain("aria-label=\"Today's overview: appointments, revenue, and fills due\"");
  });

  it("keeps the overview control calm in reduced-motion mode", () => {
    expect(beautyStyles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(beautyStyles).toContain(".overviewButton { transition: none; }");
    expect(beautyStyles).toContain(".overviewButton:hover:not(:disabled) { transform: none; }");
    expect(sharedStyles).not.toContain("todayOverview");
  });
});
