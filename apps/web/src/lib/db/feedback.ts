import { createSupabaseServerClient } from "./supabase-server";
import { getCurrentOrgId } from "./org";
import { assertOrgWriteAllowed } from "./org-access";
import { appendActivityEvent } from "./activity-events";

export const FEEDBACK_CATEGORIES = [
  "bug",
  "improvement",
  "feature_request",
  "question",
  "other",
] as const;
export const FEEDBACK_PRIORITIES = ["low", "normal", "high"] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
export type FeedbackPriority = (typeof FEEDBACK_PRIORITIES)[number];

export async function submitPilotFeedback(input: {
  category: FeedbackCategory;
  title: string;
  description: string;
  pageOrFeature: string | null;
  priority: FeedbackPriority | null;
}): Promise<void> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in again.");
  const organizationId = await getCurrentOrgId();
  await assertOrgWriteAllowed(supabase, organizationId);

  const title = input.title.trim();
  const description = input.description.trim();
  if (!title || title.length > 120) throw new Error("Enter a title up to 120 characters.");
  if (!description || description.length > 4000) {
    throw new Error("Enter feedback up to 4,000 characters.");
  }

  const { error } = await supabase.from("pilot_feedback").insert({
    organization_id: organizationId,
    submitted_by_user_id: user.id,
    category: input.category,
    title,
    description,
    page_or_feature: input.pageOrFeature?.slice(0, 160) ?? null,
    priority: input.priority,
    status: "new",
    attachment_reference: null,
  });
  if (error) throw error;

  // Deliberately excludes title/description: activity metadata never stores the
  // customer's feedback text or private conversation content.
  await appendActivityEvent({
    organizationId,
    userId: user.id,
    eventName: "feedback_submitted",
    feature: input.pageOrFeature?.slice(0, 80) ?? "feedback",
    metadata: { category: input.category, priority: input.priority },
  });
}
