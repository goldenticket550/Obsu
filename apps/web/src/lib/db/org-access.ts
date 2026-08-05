import { createSupabaseServerClient } from "./supabase-server";

export const ORG_WRITE_BLOCKED_MESSAGE =
  "This workspace is read-only because its pilot has ended or access is suspended.";

export class OrganizationWriteBlockedError extends Error {
  readonly code = "organization_write_blocked";

  constructor(message = ORG_WRITE_BLOCKED_MESSAGE) {
    super(message);
    this.name = "OrganizationWriteBlockedError";
  }
}

type ServerSupabaseClient = ReturnType<typeof createSupabaseServerClient>;

/**
 * Final server-side lifecycle gate shared by forms, APIs, and voice writes.
 * The organization id must already have come from the authenticated session.
 */
export async function assertOrgWriteAllowed(
  supabase: ServerSupabaseClient,
  organizationId: string,
): Promise<void> {
  const { data, error } = await supabase.rpc("is_org_active", {
    org: organizationId,
  });

  if (error) {
    throw new OrganizationWriteBlockedError(
      "We couldn't verify workspace access. No changes were made. Try again shortly.",
    );
  }
  if (data !== true) throw new OrganizationWriteBlockedError();
}

export function organizationAccessState(active: boolean): {
  canRead: true;
  canWrite: boolean;
} {
  return { canRead: true, canWrite: active };
}
