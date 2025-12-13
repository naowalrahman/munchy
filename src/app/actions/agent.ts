"use server";

import OpenAI from "openai";
import { setDefaultOpenAIClient } from "@openai/agents-openai";
import { Agent, run, tool, user } from "@openai/agents";
import type { AgentInputItem, AgentOutputItem, RunToolCallItem, RunToolCallOutputItem } from "@openai/agents";
import { z } from "zod";
import { searchFoods, getFoodNutrition, NutritionalData, FoodSearchResult } from "./food";
import { logFoodEntry, getFoodLogsForDate, FoodLogEntry } from "./foodLog";

// ============================================================================
// Groq Model Configuration
// ============================================================================

const groqClient = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});

setDefaultOpenAIClient(groqClient);

// ============================================================================
// Tool Definitions
// ============================================================================

const searchFoodsTool = tool({
    name: "search_foods",
    description:
        "Search for foods in the USDA FoodData Central database by name or description. Returns a list of matching foods with their FDC IDs, descriptions, brand names, and serving sizes. Use this to find foods before getting nutrition info or logging them.",
    parameters: z.object({
        query: z.string().describe("The food name or description to search for (e.g., 'chicken breast', 'apple', 'coca cola')"),
        pageSize: z.number().optional().default(10).describe("Number of results to return (default 10, max 200)"),
    }),
    async execute({ query, pageSize }): Promise<string> {
        try {
            const results: FoodSearchResult[] = await searchFoods(query, pageSize);
            if (results.length === 0) {
                return `No foods found matching "${query}". Try a different search term.`;
            }
            return JSON.stringify(results.slice(0, 5), null, 2);
        } catch (error) {
            return `Error searching foods: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
    },
});

const getFoodNutritionTool = tool({
    name: "get_food_nutrition",
    description:
        "Get detailed nutritional information for a specific food using its FDC ID. Returns calories, protein, carbohydrates, fat, and other nutrients. Always search for foods first to get the FDC ID.",
    parameters: z.object({
        fdcId: z.number().describe("The FoodData Central ID of the food to get nutrition for"),
    }),
    async execute({ fdcId }): Promise<string> {
        try {
            const nutrition: NutritionalData = await getFoodNutrition(fdcId);
            return JSON.stringify(
                {
                    description: nutrition.description,
                    brandName: nutrition.brandName,
                    servingSize: nutrition.servingSize,
                    servingSizeUnit: nutrition.servingSizeUnit,
                    calories: Math.round(nutrition.calories),
                    protein: nutrition.protein?.amount ? Math.round(nutrition.protein.amount * 10) / 10 : null,
                    carbohydrates: nutrition.carbohydrates?.amount ? Math.round(nutrition.carbohydrates.amount * 10) / 10 : null,
                    fat: nutrition.totalFat?.amount ? Math.round(nutrition.totalFat.amount * 10) / 10 : null,
                },
                null,
                2
            );
        } catch (error) {
            return `Error getting nutrition: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
    },
});

const logFoodTool = tool({
    name: "log_food",
    description:
        "Log a food item to the user's daily food log. You must have the nutritional information (from get_food_nutrition) before logging. Specify the meal name (Breakfast, Lunch, Dinner, or a custom name) and optionally the date.",
    parameters: z.object({
        meal_name: z.string().describe("The meal to log this food under (e.g., 'Breakfast', 'Lunch', 'Dinner', or custom)"),
        food_fdc_id: z.number().describe("The FDC ID of the food"),
        food_description: z.string().describe("Description of the food"),
        serving_amount: z.number().describe("The number of servings"),
        serving_unit: z.string().describe("The unit of serving (e.g., 'g', 'oz', 'cup')"),
        calories: z.number().describe("Calories per serving"),
        protein: z.number().nullable().describe("Protein in grams per serving"),
        carbohydrates: z.number().nullable().describe("Carbohydrates in grams per serving"),
        total_fat: z.number().nullable().describe("Total fat in grams per serving"),
        date: z.string().optional().describe("Date to log the food (YYYY-MM-DD format). Defaults to today."),
    }),
    async execute(input): Promise<string> {
        try {
            const result = await logFoodEntry({
                meal_name: input.meal_name,
                food_fdc_id: input.food_fdc_id,
                food_description: input.food_description,
                serving_amount: input.serving_amount,
                serving_unit: input.serving_unit,
                calories: input.calories,
                protein: input.protein,
                carbohydrates: input.carbohydrates,
                total_fat: input.total_fat,
                date: input.date,
            });
            if (result.success) {
                return `Successfully logged ${input.food_description} to ${input.meal_name}!`;
            }
            return `Failed to log food: ${result.error}`;
        } catch (error) {
            return `Error logging food: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
    },
});

const getDailyLogTool = tool({
    name: "get_daily_log",
    description:
        "Get the user's food log for a specific date. Returns all foods logged, grouped by meal. Use this to answer questions about what the user ate or their daily nutrition summary.",
    parameters: z.object({
        date: z.string().describe("The date to get logs for in YYYY-MM-DD format (e.g., '2024-01-15')"),
    }),
    async execute({ date }): Promise<string> {
        try {
            const result = await getFoodLogsForDate(date);
            if (!result.success) {
                return `Error getting logs: ${result.error}`;
            }
            const logs = result.data as FoodLogEntry[];
            if (!logs || logs.length === 0) {
                return `No foods logged for ${date}.`;
            }

            // Group by meal
            const grouped: Record<string, FoodLogEntry[]> = {};
            logs.forEach((log) => {
                if (!grouped[log.meal_name]) grouped[log.meal_name] = [];
                grouped[log.meal_name].push(log);
            });

            // Calculate totals
            const totals = logs.reduce(
                (acc, log) => ({
                    calories: acc.calories + log.calories,
                    protein: acc.protein + (log.protein || 0),
                    carbs: acc.carbs + (log.carbohydrates || 0),
                    fat: acc.fat + (log.total_fat || 0),
                }),
                { calories: 0, protein: 0, carbs: 0, fat: 0 }
            );

            const summary = Object.entries(grouped)
                .map(([meal, foods]) => {
                    const mealCalories = foods.reduce((sum, f) => sum + f.calories, 0);
                    const foodList = foods.map((f) => `  - ${f.food_description} (${f.calories} cal)`).join("\n");
                    return `${meal} (${Math.round(mealCalories)} cal):\n${foodList}`;
                })
                .join("\n\n");

            return `Food log for ${date}:\n\n${summary}\n\nDaily Totals: ${Math.round(totals.calories)} calories, ${Math.round(totals.protein)}g protein, ${Math.round(totals.carbs)}g carbs, ${Math.round(totals.fat)}g fat`;
        } catch (error) {
            return `Error getting daily log: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
    },
});

const webSearchTool = tool({
    name: "web_search",
    description:
        "Search the web for information using Brave Search. Use this to answer general questions about nutrition, health, food facts, or anything else the user asks that isn't covered by other tools.",
    parameters: z.object({
        query: z.string().describe("The search query"),
    }),
    async execute({ query }): Promise<string> {
        const apiKey = process.env.BRAVE_API_KEY;
        if (!apiKey) {
            return "Web search is not configured. BRAVE_API_KEY is missing.";
        }

        try {
            const response = await fetch(
                `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
                {
                    headers: {
                        Accept: "application/json",
                        "Accept-Encoding": "gzip",
                        "X-Subscription-Token": apiKey,
                    },
                }
            );

            if (!response.ok) {
                return `Search failed: ${response.status} ${response.statusText}`;
            }

            const data = await response.json();
            const results = data.web?.results || [];

            if (results.length === 0) {
                return `No results found for "${query}".`;
            }

            return results
                .slice(0, 5)
                .map((r: { title: string; description: string; url: string }) => `**${r.title}**\n${r.description}\n${r.url}`)
                .join("\n\n");
        } catch (error) {
            return `Search error: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
    },
});

// ============================================================================
// Agent Definition
// ============================================================================

const munchyAgent = new Agent({
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
- Use get_daily_log with today's date (${new Date().toISOString().split("T")[0]}) unless they specify another date

Be helpful, concise, and encouraging about the user's nutrition journey. Use emojis occasionally to be friendly! 🍎`,
    model: "openai/gpt-oss-20b",
    modelSettings: {
        toolChoice: "auto",
        parallelToolCalls: false,
        maxTokens: 65536,
    },
    tools: [searchFoodsTool, getFoodNutritionTool, logFoodTool, getDailyLogTool, webSearchTool],
});

// ============================================================================
// Types for UI display
// ============================================================================

export interface DisplayMessage {
    role: "user" | "assistant" | "tool";
    content: string;
    toolName?: string;
    toolArgs?: Record<string, unknown>;
    toolResult?: string;
}

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
    previousResponseId?: string
): Promise<{
    responseId: string | undefined,
    newDisplayMessages: DisplayMessage[],
    error?: string,
}> {
    try {
        const result = await (previousResponseId ? run(munchyAgent, userMessage, { previousResponseId }) : run(munchyAgent, userMessage));

        const newDisplayMessages: DisplayMessage[] = [];

        if (result.newItems) {
            for (const item of result.newItems) {
                if (item.type === "tool_call_item") {
                    const toolCall = item as RunToolCallItem & { rawItem?: { name?: string; arguments?: string } };
                    newDisplayMessages.push({
                        role: "tool",
                        content: "",
                        toolName: toolCall.rawItem?.name || "unknown",
                        toolArgs: toolCall.rawItem?.arguments
                            ? JSON.parse(toolCall.rawItem.arguments)
                            : {},
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
            responseId: result.lastResponseId,
            newDisplayMessages,
        };
    } catch (error) {
        console.error("Agent error:", error);
        return {
            responseId: undefined,
            newDisplayMessages: [{ role: "user", content: userMessage }],
            error: error instanceof Error ? error.message : "An unexpected error occurred",
        };
    }
}

