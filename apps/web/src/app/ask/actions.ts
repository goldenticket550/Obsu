"use server";

import { askObsidian } from "@/lib/ai/ask";
import { errorMessage } from "@/lib/form";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";

/**
 * Ask OBSIDIAN server action. Requires a signed-in user (tools are org-scoped
 * via RLS); returns either an answer or a friendly error — never throws to the
 * client. The API key and SDK stay server-side.
 */
export async function askAction(
  question: string,
): Promise<{ answer?: string; error?: string }> {
  const q = String(question ?? "").trim();
  if (!q) return { error: "Type a question first." };

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in again." };

  try {
    return { answer: await askObsidian(q) };
  } catch (e) {
    return { error: errorMessage(e) };
  }
}
