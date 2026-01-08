import OpenAI from "openai";
import { setDefaultOpenAIClient } from "@openai/agents-openai";
import { Agent } from "@openai/agents";
import { getToday } from "@/utils/dateHelpers";
import { agentTools } from "@/utils/agent/tools";

export interface DisplayMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: string;
}

export function createMunchyAgent(apiKey: string): Agent {
  const groqClient = new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });

  setDefaultOpenAIClient(groqClient);

  return new Agent({
    name: "Munchy",
    instructions: `You are Munchy, a friendly AI assistant that helps users track their food and nutrition.

Your capabilities:
1. Search for foods in the USDA database
2. Get detailed nutritional information for foods
3. Log foods to the user's daily food log
4. View the user's food log for any date
5. Search the web for nutrition and health information

When logging food:
- First search for the food to find the correct FDC ID
- Then get the nutritional information
- Finally log it with the user's specified meal and serving size

When answering about what the user ate:
- Use get_daily_log with today's date (${getToday()}) unless they specify another date

Be helpful, concise, and encouraging about the user's nutrition journey. Use emojis occasionally to be friendly! 🍎`,
    model: "openai/gpt-oss-20b",
    modelSettings: {
      toolChoice: "auto",
      parallelToolCalls: false,
      maxTokens: 65536,
    },
    tools: agentTools,
  });
}
