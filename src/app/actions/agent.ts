"use server";

import { createMunchyAgent, DisplayMessage } from "@/utils/agent/model";
import { AgentInputItem, run, RunToolCallItem, RunToolCallOutputItem } from "@openai/agents";
import { createClient } from "@/utils/supabase/server";

// ============================================================================
// Server Action
// ============================================================================

/**
 * Runs the Munchy agent with the given user message and history.
 *
 * @param userMessage - The new user message
 * @param history - Previous conversation history (AgentInputItem[]) from result.history, or empty for first message
 * @returns Updated history for the next turn, display messages for UI, and optional error
 */
export async function runAgent(
  userMessage: string,
  history: AgentInputItem[]
): Promise<{
  history: AgentInputItem[];
  newDisplayMessages: DisplayMessage[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        history,
        newDisplayMessages: [],
        error: "You must be logged in to use the AI agent.",
      };
    }

    const apiKey = user.user_metadata?.groq_api_key;
    if (!apiKey) {
      return {
        history,
        newDisplayMessages: [],
        error: "Please set your Groq API key in profile settings to use the AI agent.",
      };
    }

    const munchyAgent = createMunchyAgent(apiKey);
    history.push({ role: "user", content: userMessage });
    const result = await run(munchyAgent, history);

    const newDisplayMessages: DisplayMessage[] = [];

    if (result.newItems) {
      for (const item of result.newItems) {
        if (item.type === "tool_call_item") {
          const toolCall = item as RunToolCallItem & { rawItem?: { name?: string; arguments?: string } };
          newDisplayMessages.push({
            role: "tool",
            content: "",
            toolName: toolCall.rawItem?.name || "unknown",
            toolArgs: toolCall.rawItem?.arguments ? JSON.parse(toolCall.rawItem.arguments) : {},
          });
        } else if (item.type === "tool_call_output_item") {
          const toolOutput = item as RunToolCallOutputItem & { rawItem?: { output?: string }; output?: string };
          // Find the matching tool call and add the result
          const lastToolMsg = newDisplayMessages.findLast((m) => m.role === "tool" && !m.toolResult);
          if (lastToolMsg) {
            lastToolMsg.toolResult = toolOutput.rawItem?.output || toolOutput.output;
          }
        }
      }
    }

    if (result.finalOutput) {
      newDisplayMessages.push({ role: "assistant", content: result.finalOutput });
    }

    return {
      history: result.history,
      newDisplayMessages,
    };
  } catch (error) {
    console.error("Agent error:", error);
    return {
      history,
      newDisplayMessages: [{ role: "user", content: userMessage }],
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
