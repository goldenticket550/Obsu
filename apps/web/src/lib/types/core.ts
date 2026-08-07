export interface CorePortfolioOrganization {
  organization_id: string;
  organization_name: string;
  display_name: string | null;
  workspace_label: string | null;
  vertical: string;
  status: string;
  plan: string;
  pilot_started_at: string | null;
  pilot_ends_at: string | null;
  is_active: boolean;
}

export interface CoreOpenFeedback {
  feedback_id: string;
  organization_id: string;
  organization_name: string;
  division: string;
  category: string;
  priority: string | null;
  status: "new" | "reviewing";
  title: string;
  description: string;
  page_or_feature: string | null;
  created_at: string;
  total_count: number;
}

export interface CoreActivityCount {
  organization_id: string;
  organization_name: string;
  division: string;
  event_name: string;
  event_count: number;
}

export interface CoreNotableActivity {
  event_id: string;
  organization_id: string;
  organization_name: string;
  division: string;
  event_name: "pilot_expired" | "pilot_extended" | "feedback_submitted";
  feature: string | null;
  created_at: string;
}

export interface CoreConsoleData {
  portfolio: CorePortfolioOrganization[];
  feedback: CoreOpenFeedback[];
  activityCounts: CoreActivityCount[];
  notableActivity: CoreNotableActivity[];
  feedbackPage: number;
  feedbackPageSize: number;
  feedbackTotal: number;
}
