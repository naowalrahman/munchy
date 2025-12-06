"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Food log entry type
 */
export interface FoodLogEntry {
  id: string;
  user_id: string;
  meal_name: string;
  food_fdc_id: number;
  food_description: string;
  serving_amount: number;
  serving_unit: string;
  calories: number;
  protein: number | null;
  carbohydrates: number | null;
  total_fat: number | null;
  logged_at: string;
  date: string;
  created_at: string;
  updated_at: string;
  barcode?: string | null; // Original barcode for foods added via barcode scanning
}

/**
 * Input for logging a new food entry
 */
export interface LogFoodEntryInput {
  meal_name: string;
  food_fdc_id: number;
  food_description: string;
  serving_amount: number;
  serving_unit: string;
  calories: number;
  protein: number | null;
  carbohydrates: number | null;
  total_fat: number | null;
  date?: string; // Optional, defaults to today
  barcode?: string | null; // Optional barcode for foods added via barcode scanning
}

/**
 * Response type for food log operations
 */
export interface FoodLogResponse {
  success: boolean;
  data?: FoodLogEntry | FoodLogEntry[];
  error?: string;
}

/**
 * Log a new food entry
 */
export async function logFoodEntry(input: LogFoodEntryInput): Promise<FoodLogResponse> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    // Insert food log entry
    const { data, error } = await supabase
      .from("food_logs")
      .insert({
        user_id: user.id,
        meal_name: input.meal_name,
        food_fdc_id: input.food_fdc_id,
        food_description: input.food_description,
        serving_amount: input.serving_amount,
        serving_unit: input.serving_unit,
        calories: input.calories,
        protein: input.protein,
        carbohydrates: input.carbohydrates,
        total_fat: input.total_fat,
        date: input.date || new Date().toISOString().split("T")[0],
        barcode: input.barcode || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error logging food entry:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error logging food entry:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get food logs for a specific date
 */
export async function getFoodLogsForDate(date: string): Promise<FoodLogResponse> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    // Query food logs for the date
    const { data, error } = await supabase
      .from("food_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .order("logged_at", { ascending: true });

    if (error) {
      console.error("Error fetching food logs:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error("Unexpected error fetching food logs:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get food logs for today
 */
export async function getTodayFoodLogs(): Promise<FoodLogResponse> {
  const today = new Date().toISOString().split("T")[0];
  return getFoodLogsForDate(today);
}

/**
 * Update a food log entry (e.g., change serving size)
 */
export async function updateFoodEntry(
  id: string,
  updates: Partial<
    Pick<LogFoodEntryInput, "serving_amount" | "serving_unit" | "calories" | "protein" | "carbohydrates" | "total_fat">
  >
): Promise<FoodLogResponse> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    // Update food log entry
    const { data, error } = await supabase
      .from("food_logs")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating food entry:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error updating food entry:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Delete a food log entry
 */
export async function deleteFoodEntry(id: string): Promise<FoodLogResponse> {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    // Delete food log entry
    const { error } = await supabase.from("food_logs").delete().eq("id", id).eq("user_id", user.id);

    if (error) {
      console.error("Error deleting food entry:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Unexpected error deleting food entry:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get meal summary for a specific date (grouped by meal_name)
 */
export async function getMealSummary(date: string): Promise<{
  success: boolean;
  data?: Record<string, FoodLogEntry[]>;
  error?: string;
}> {
  try {
    const response = await getFoodLogsForDate(date);

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error ?? "Failed to fetch food logs",
      };
    }

    // Group logs by meal_name
    const logs = Array.isArray(response.data) ? response.data : [response.data];
    const grouped = logs.reduce(
      (acc, log) => {
        if (!acc[log.meal_name]) {
          acc[log.meal_name] = [];
        }
        acc[log.meal_name].push(log);
        return acc;
      },
      {} as Record<string, FoodLogEntry[]>
    );

    return { success: true, data: grouped };
  } catch (error) {
    console.error("Unexpected error getting meal summary:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
