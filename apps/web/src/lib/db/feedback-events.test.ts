import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACTIVITY_EVENT_NAMES } from "./activity-events";
import { FEEDBACK_CATEGORIES } from "./feedback";

describe("pilot feedback and activity privacy boundaries", () => {
  it("uses closed allowlists", () => {
    expect(FEEDBACK_CATEGORIES).toEqual([
      "bug", "improvement", "feature_request", "question", "other",
    ]);
    expect(ACTIVITY_EVENT_NAMES).toContain("feedback_submitted");
  });

  it("does not copy feedback text into activity metadata", () => {
    const source = readFileSync(join(process.cwd(), "src", "lib", "db", "feedback.ts"), "utf8");
    const activityCall = source.slice(source.indexOf("await appendActivityEvent"));
    expect(activityCall).not.toContain("description");
    expect(activityCall).not.toContain("title");
    expect(activityCall).not.toContain("transcript");
  });

  it("keeps feedback status review out of tenant source", () => {
    const action = readFileSync(join(process.cwd(), "src", "app", "feedback", "actions.ts"), "utf8");
    expect(action).not.toContain("reviewing");
    expect(action).not.toContain("completed");
    expect(action).not.toContain("declined");
  });

  it("preserves append-only event and action-log protections", () => {
    const migration = readFileSync(
      join(process.cwd(), "..", "..", "supabase", "migrations", "0007_pilot_feedback_events.sql"),
      "utf8",
    );
    expect(migration).toContain("activity_event_no_rewrite");
    expect(migration).toContain("revoke update, delete on public.activity_event");
    expect(migration).not.toContain("alter table public.action_log");
  });
});
