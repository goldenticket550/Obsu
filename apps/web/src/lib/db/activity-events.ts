import { createSupabaseServerClient } from "./supabase-server";
import { assertOrgWriteAllowed } from "./org-access";

export const ACTIVITY_EVENT_NAMES = [
  "pilot_activated",
  "user_signed_in",
  "orb_session_started",
  "orb_question_asked",
  "feature_opened",
  "booking_request_reviewed",
  "core_workflow_started",
  "core_workflow_completed",
  "feedback_submitted",
  "pilot_expired",
  "pilot_extended",
] as const;

export type ActivityEventName = (typeof ACTIVITY_EVENT_NAMES)[number];
export type SafeEventMetadata = Record<string, string | number | boolean | null>;

export async function appendActivityEvent(params: {
  organizationId: string;
  userId: string | null;
  eventName: ActivityEventName;
  feature: string | null;
  metadata?: SafeEventMetadata;
}): Promise<void> {
  const supabase = createSupabaseServerClient();
  await assertOrgWriteAllowed(supabase, params.organizationId);
  const metadata = params.metadata ?? {};
  if (JSON.stringify(metadata).length > 2048) {
    throw new Error("Activity metadata is too large.");
  }
  const { error } = await supabase.from("activity_event").insert({
    organization_id: params.organizationId,
    user_id: params.userId,
    event_name: params.eventName,
    feature: params.feature,
    metadata,
  });
  if (error) throw error;
}
