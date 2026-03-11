"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { aggregateIngredientTotals } from "@/utils/recipeHelpers";

export interface RecipeIngredient {
  id?: string;
  food_fdc_id: number;
  food_description: string;
  serving_amount: number;
  serving_unit: string;
  calories: number;
  protein: number | null;
  carbohydrates: number | null;
  total_fat: number | null;
  barcode?: string | null;
  sort_order: number;
}

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  description: string;
  servings: number;
  calories: number;
  protein: number | null;
  carbohydrates: number | null;
  total_fat: number | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeWithIngredients extends Recipe {
  recipe_ingredients: RecipeIngredient[];
}

export interface LoggedRecipeIngredient {
  id: string;
  food_log_id: string;
  food_fdc_id: number;
  food_description: string;
  serving_amount: number;
  serving_unit: string;
  calories: number;
  protein: number | null;
  carbohydrates: number | null;
  total_fat: number | null;
  barcode: string | null;
  sort_order: number;
}

export interface RecipesResponse<T = Recipe | Recipe[]> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getRecipes(): Promise<RecipesResponse<Recipe[]>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching recipes:", error);
      return { success: false, error: error.message };
    }
    return { success: true, data: data ?? [] };
  } catch (error) {
    console.error("Unexpected error fetching recipes:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getRecipeById(id: string): Promise<RecipesResponse<RecipeWithIngredients>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    const { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (recipeError || !recipe) {
      return { success: false, error: recipeError?.message ?? "Recipe not found" };
    }

    const { data: ingredients, error: ingError } = await supabase
      .from("recipe_ingredients")
      .select("*")
      .eq("recipe_id", id)
      .order("sort_order", { ascending: true });

    if (ingError) {
      console.error("Error fetching recipe ingredients:", ingError);
      return { success: false, error: ingError.message };
    }

    return {
      success: true,
      data: {
        ...recipe,
        recipe_ingredients: ingredients ?? [],
      },
    };
  } catch (error) {
    console.error("Unexpected error fetching recipe:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function createRecipe(input: {
  name: string;
  description?: string;
  servings: number;
  ingredients: Omit<RecipeIngredient, "id">[];
}): Promise<RecipesResponse<Recipe>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    const totals = aggregateIngredientTotals(input.ingredients);
    const { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .insert({
        user_id: user.id,
        name: input.name,
        description: input.description ?? "",
        servings: input.servings,
        calories: totals.calories,
        protein: totals.protein ?? null,
        carbohydrates: totals.carbohydrates ?? null,
        total_fat: totals.total_fat ?? null,
      })
      .select()
      .single();

    if (recipeError || !recipe) {
      return { success: false, error: recipeError?.message ?? "Failed to create recipe" };
    }

    if (input.ingredients.length > 0) {
      const rows = input.ingredients.map((ing, i) => ({
        recipe_id: recipe.id,
        food_fdc_id: ing.food_fdc_id,
        food_description: ing.food_description,
        serving_amount: ing.serving_amount,
        serving_unit: ing.serving_unit,
        calories: ing.calories,
        protein: ing.protein,
        carbohydrates: ing.carbohydrates,
        total_fat: ing.total_fat,
        barcode: ing.barcode ?? null,
        sort_order: ing.sort_order ?? i,
      }));
      const { error: ingError } = await supabase.from("recipe_ingredients").insert(rows);
      if (ingError) {
        console.error("Error inserting recipe ingredients:", ingError);
        await supabase.from("recipes").delete().eq("id", recipe.id);
        return { success: false, error: ingError.message };
      }
    }

    revalidatePath("/recipes");
    return { success: true, data: recipe };
  } catch (error) {
    console.error("Unexpected error creating recipe:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateRecipe(
  id: string,
  input: {
    name?: string;
    description?: string;
    servings?: number;
    ingredients?: Omit<RecipeIngredient, "id">[];
  }
): Promise<RecipesResponse<Recipe>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.servings !== undefined) updates.servings = input.servings;

    if (input.ingredients !== undefined) {
      const totals = aggregateIngredientTotals(input.ingredients);
      updates.calories = totals.calories;
      updates.protein = totals.protein ?? null;
      updates.carbohydrates = totals.carbohydrates ?? null;
      updates.total_fat = totals.total_fat ?? null;

      const { error: delError } = await supabase
        .from("recipe_ingredients")
        .delete()
        .eq("recipe_id", id);
      if (delError) {
        return { success: false, error: delError.message };
      }

      if (input.ingredients.length > 0) {
        const rows = input.ingredients.map((ing, i) => ({
          recipe_id: id,
          food_fdc_id: ing.food_fdc_id,
          food_description: ing.food_description,
          serving_amount: ing.serving_amount,
          serving_unit: ing.serving_unit,
          calories: ing.calories,
          protein: ing.protein,
          carbohydrates: ing.carbohydrates,
          total_fat: ing.total_fat,
          barcode: ing.barcode ?? null,
          sort_order: ing.sort_order ?? i,
        }));
        const { error: ingError } = await supabase.from("recipe_ingredients").insert(rows);
        if (ingError) {
          return { success: false, error: ingError.message };
        }
      }
    }

    const { data, error } = await supabase
      .from("recipes")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/recipes");
    revalidatePath(`/recipes/${id}`);
    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error updating recipe:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deleteRecipe(id: string): Promise<RecipesResponse<null>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    const { error } = await supabase.from("recipes").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/recipes");
    revalidatePath("/dashboard");
    return { success: true, data: null };
  } catch (error) {
    console.error("Unexpected error deleting recipe:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function logRecipeToMeal(input: {
  recipe_id: string;
  meal_name: string;
  date: string;
  servings_multiplier: number;
}): Promise<{ success: boolean; data?: { food_log_id: string }; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    const recipeRes = await getRecipeById(input.recipe_id);
    if (!recipeRes.success || !recipeRes.data) {
      return { success: false, error: recipeRes.error ?? "Recipe not found" };
    }

    const recipe = recipeRes.data;
    const mult = input.servings_multiplier;

    const totals = aggregateIngredientTotals(recipe.recipe_ingredients);
    const scaledCalories = totals.calories * mult;
    const scaledProtein = totals.protein * mult;
    const scaledCarbs = totals.carbohydrates * mult;
    const scaledFat = totals.total_fat * mult;

    const { data: foodLog, error: logError } = await supabase
      .from("food_logs")
      .insert({
        user_id: user.id,
        meal_name: input.meal_name,
        date: input.date,
        food_fdc_id: -1,
        food_description: recipe.name,
        serving_amount: input.servings_multiplier,
        serving_unit: "serving",
        calories: scaledCalories,
        protein: scaledProtein,
        carbohydrates: scaledCarbs,
        total_fat: scaledFat,
        entry_type: "recipe",
        recipe_id: recipe.id,
      })
      .select("id")
      .single();

    if (logError || !foodLog) {
      return { success: false, error: logError?.message ?? "Failed to log recipe" };
    }

    if (recipe.recipe_ingredients.length > 0) {
      const rows = recipe.recipe_ingredients.map((ing, i) => ({
        food_log_id: foodLog.id,
        food_fdc_id: ing.food_fdc_id,
        food_description: ing.food_description,
        serving_amount: ing.serving_amount * mult,
        serving_unit: ing.serving_unit,
        calories: ing.calories * mult,
        protein: ing.protein != null ? ing.protein * mult : null,
        carbohydrates: ing.carbohydrates != null ? ing.carbohydrates * mult : null,
        total_fat: ing.total_fat != null ? ing.total_fat * mult : null,
        barcode: ing.barcode ?? null,
        sort_order: ing.sort_order ?? i,
      }));
      const { error: ingError } = await supabase.from("food_log_recipe_ingredients").insert(rows);
      if (ingError) {
        await supabase.from("food_logs").delete().eq("id", foodLog.id);
        return { success: false, error: ingError.message };
      }
    }

    revalidatePath("/dashboard");
    return { success: true, data: { food_log_id: foodLog.id } };
  } catch (error) {
    console.error("Unexpected error logging recipe:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getLoggedRecipeIngredients(
  foodLogId: string
): Promise<{ success: boolean; data?: LoggedRecipeIngredient[]; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    const { data: log } = await supabase
      .from("food_logs")
      .select("id")
      .eq("id", foodLogId)
      .eq("user_id", user.id)
      .single();

    if (!log) {
      return { success: false, error: "Food log not found" };
    }

    const { data, error } = await supabase
      .from("food_log_recipe_ingredients")
      .select("*")
      .eq("food_log_id", foodLogId)
      .order("sort_order", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data ?? [] };
  } catch (error) {
    console.error("Unexpected error fetching logged recipe ingredients:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateLoggedRecipeIngredients(
  foodLogId: string,
  ingredients: Omit<LoggedRecipeIngredient, "id" | "food_log_id">[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    const { data: log } = await supabase
      .from("food_logs")
      .select("id")
      .eq("id", foodLogId)
      .eq("user_id", user.id)
      .single();

    if (!log) {
      return { success: false, error: "Food log not found" };
    }

    const totals = ingredients.reduce(
      (acc, ing) => ({
        calories: acc.calories + (ing.calories ?? 0),
        protein: acc.protein + (ing.protein ?? 0),
        carbohydrates: acc.carbohydrates + (ing.carbohydrates ?? 0),
        total_fat: acc.total_fat + (ing.total_fat ?? 0),
      }),
      { calories: 0, protein: 0, carbohydrates: 0, total_fat: 0 }
    );

    const { error: delError } = await supabase
      .from("food_log_recipe_ingredients")
      .delete()
      .eq("food_log_id", foodLogId);
    if (delError) {
      return { success: false, error: delError.message };
    }

    if (ingredients.length > 0) {
      const rows = ingredients.map((ing, i) => ({
        food_log_id: foodLogId,
        food_fdc_id: ing.food_fdc_id,
        food_description: ing.food_description,
        serving_amount: ing.serving_amount,
        serving_unit: ing.serving_unit,
        calories: ing.calories,
        protein: ing.protein,
        carbohydrates: ing.carbohydrates,
        total_fat: ing.total_fat,
        barcode: ing.barcode ?? null,
        sort_order: ing.sort_order ?? i,
      }));
      const { error: ingError } = await supabase.from("food_log_recipe_ingredients").insert(rows);
      if (ingError) {
        return { success: false, error: ingError.message };
      }
    }

    const { error: updateError } = await supabase
      .from("food_logs")
      .update({
        calories: totals.calories,
        protein: totals.protein,
        carbohydrates: totals.carbohydrates,
        total_fat: totals.total_fat,
        updated_at: new Date().toISOString(),
      })
      .eq("id", foodLogId)
      .eq("user_id", user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Unexpected error updating logged recipe ingredients:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
