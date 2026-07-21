import Anthropic from "@anthropic-ai/sdk";
import { ASK_MODEL, ASK_SYSTEM_PROMPT, MAX_TOOL_ITERATIONS } from "./config";
import { TOOL_DEFS, executeTool } from "./tools";
import { errorMessage } from "@/lib/form";

/**
 * Ask OBSIDIAN orchestration (M7). Runs the tool-use loop server-side:
 * call Claude → if it requests a read-only tool, execute it against this org's
 * data (RLS) and feed the verified result back → repeat → return the final
 * text. The API key stays server-only (never NEXT_PUBLIC, never in the client
 * bundle — this module is only reached through a "use server" action).
 */
export async function askObsidian(question: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Ask OBSIDIAN isn't configured yet. Add ANTHROPIC_API_KEY to apps/web/.env.local and restart the dev server.",
    );
  }

  const client = new Anthropic({ apiKey });
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: question },
  ];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: ASK_MODEL,
      max_tokens: 1024,
      system: ASK_SYSTEM_PROMPT,
      tools: TOOL_DEFS,
      messages,
    });

    if (response.stop_reason !== "tool_use") {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return text || "I don't have an answer for that.";
    }

    // Echo the assistant turn (including tool_use blocks), then run each tool.
    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      try {
        const result = await executeTool(block.name, block.input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        });
      } catch (e) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `Error: ${errorMessage(e)}`,
          is_error: true,
        });
      }
    }
    messages.push({ role: "user", content: toolResults });
  }

  return "I couldn't finish answering that — it took too many steps. Try asking something more specific.";
}
