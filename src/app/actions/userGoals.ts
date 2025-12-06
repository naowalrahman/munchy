"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * User goals type
 */
export interface UserGoals {
  id: string;
  user_id: string;
  calorie_goal: number;
  protein_goal: number;
  carb_goal: number;
  fat_goal: number;
  weight_kg: number | null;
  height_cm: number | null;
  age: number | null;
  sex: "male" | "female" | null;
  activity_level: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extra_active" | null;
  weight_goal: "lose" | "maintain" | "gain" | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for updating user goals
 */
export interface UpdateUserGoalsInput {
  calorie_goal: number;
  protein_goal: number;
  carb_goal: number;
  fat_goal: number;
  weight_kg?: number | null;
  height_cm?: number | null;
  age?: number | null;
  sex?: "male" | "female" | null;
  activity_level?: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extra_active" | null;
  weight_goal?: "lose" | "maintain" | "gain" | null;
}

/**
 * Response type for user goals operations
 */
export interface UserGoalsResponse {
  success: boolean;
  data?: UserGoals;
  error?: string;
}

/**
 * Get user's current goals
 */
export async function getUserGoals(): Promise<UserGoalsResponse> {
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

    // Query user goals
    const { data, error } = await supabase.from("user_goals").select("*").eq("user_id", user.id).maybeSingle();

    if (error) {
      console.error("Error fetching user goals:", error);
      return { success: false, error: error.message };
    }

    // If no goals exist, return default values
    if (!data) {
      return {
        success: true,
        data: {
          id: "",
          user_id: user.id,
          calorie_goal: 2000,
          protein_goal: 150,
          carb_goal: 250,
          fat_goal: 65,
          weight_kg: null,
          height_cm: null,
          age: null,
          sex: null,
          activity_level: null,
          weight_goal: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error fetching user goals:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Update or create user goals
 */
export async function updateUserGoals(input: UpdateUserGoalsInput): Promise<UserGoalsResponse> {
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

    // Check if user goals already exist
    const { data: existingGoals } = await supabase.from("user_goals").select("id").eq("user_id", user.id).maybeSingle();

    let data, error;

    if (existingGoals) {
      // Update existing goals
      const result = await supabase.from("user_goals").update(input).eq("user_id", user.id).select().single();
      data = result.data;
      error = result.error;
    } else {
      // Insert new goals
      const result = await supabase
        .from("user_goals")
        .insert({
          user_id: user.id,
          ...input,
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("Error updating user goals:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/profile");
    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error updating user goals:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
