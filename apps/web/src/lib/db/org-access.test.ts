import { describe, expect, it, vi } from "vitest";
import {
  assertOrgWriteAllowed,
  OrganizationWriteBlockedError,
  organizationAccessState,
} from "./org-access";

function client(result: { data: boolean | null; error: { message: string } | null }) {
  return {
    rpc: vi.fn(async () => result),
  } as never;
}

describe("organization lifecycle write gate", () => {
  it("allows an active pilot write", async () => {
    const supabase = client({ data: true, error: null });
    await expect(assertOrgWriteAllowed(supabase, "org-a")).resolves.toBeUndefined();
  });

  it("refuses an expired pilot write with a typed, user-safe error", async () => {
    const supabase = client({ data: false, error: null });
    await expect(assertOrgWriteAllowed(supabase, "org-a")).rejects.toBeInstanceOf(
      OrganizationWriteBlockedError,
    );
  });

  it("fails closed without exposing database details", async () => {
    const supabase = client({ data: null, error: { message: "private postgres detail" } });
    await expect(assertOrgWriteAllowed(supabase, "org-a")).rejects.not.toThrow(
      /private postgres detail/,
    );
  });

  it("keeps reads available when writes are blocked", () => {
    expect(organizationAccessState(false)).toEqual({ canRead: true, canWrite: false });
  });
});
