import { createSupabaseServerClient } from "./supabase-server";
import type {
  CoreActivityCount,
  CoreConsoleData,
  CoreNotableActivity,
  CoreOpenFeedback,
  CorePortfolioOrganization,
} from "@/lib/types/core";

const FEEDBACK_PAGE_SIZE = 20;

function boundedPage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export async function loadCoreConsole(
  requestedPage?: string,
): Promise<CoreConsoleData | null> {
  const supabase = createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data: admin, error: adminError } = await supabase.rpc(
    "is_platform_admin",
    { uid: authData.user.id },
  );
  if (adminError || admin !== true) return null;

  const feedbackPage = boundedPage(requestedPage);
  const pageOffset = (feedbackPage - 1) * FEEDBACK_PAGE_SIZE;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [portfolioResult, feedbackResult, countsResult, notableResult] =
    await Promise.all([
      supabase.rpc("core_portfolio_summary"),
      supabase.rpc("core_open_feedback", {
        page_size: FEEDBACK_PAGE_SIZE,
        page_offset: pageOffset,
      }),
      supabase.rpc("core_activity_counts", { since_at: since }),
      supabase.rpc("core_recent_notable_activity", { row_limit: 20 }),
    ]);

  const error =
    portfolioResult.error ??
    feedbackResult.error ??
    countsResult.error ??
    notableResult.error;
  if (error) throw new Error("OBSIDIAN Core data is temporarily unavailable.");

  const portfolio = (portfolioResult.data ?? []) as CorePortfolioOrganization[];
  const feedback = (feedbackResult.data ?? []) as CoreOpenFeedback[];
  const activityCounts = (countsResult.data ?? []) as CoreActivityCount[];
  const notableActivity = (notableResult.data ?? []) as CoreNotableActivity[];

  return {
    portfolio,
    feedback,
    activityCounts,
    notableActivity,
    feedbackPage,
    feedbackPageSize: FEEDBACK_PAGE_SIZE,
    feedbackTotal: Number(feedback[0]?.total_count ?? 0),
  };
}
