"use server";

import { redirect } from "next/navigation";
import { errorMessage, optStr, str } from "@/lib/form";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_PRIORITIES,
  submitPilotFeedback,
  type FeedbackCategory,
  type FeedbackPriority,
} from "@/lib/db/feedback";

export async function submitFeedback(formData: FormData) {
  const categoryRaw = str(formData, "category");
  const priorityRaw = str(formData, "priority");
  const category = FEEDBACK_CATEGORIES.includes(categoryRaw as FeedbackCategory)
    ? (categoryRaw as FeedbackCategory)
    : "other";
  const priority = FEEDBACK_PRIORITIES.includes(priorityRaw as FeedbackPriority)
    ? (priorityRaw as FeedbackPriority)
    : null;

  try {
    await submitPilotFeedback({
      category,
      title: str(formData, "title"),
      description: str(formData, "description"),
      pageOrFeature: optStr(formData, "page_or_feature"),
      priority,
    });
  } catch (error) {
    redirect("/feedback?error=" + encodeURIComponent(errorMessage(error)));
  }
  redirect("/feedback?submitted=1");
}
