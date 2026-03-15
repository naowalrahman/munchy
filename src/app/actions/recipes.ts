"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  servings: number;
  created_at: string;
  updated_at: string;
  items?: RecipeItem[];
}

export interface RecipeItem {
  id: string;
  recipe_id: string;
  food_fdc_id: number;
  food_description: string;
  serving_amount: number;
  serving_unit: string;
  calories: number;
  protein: number | null;
  carbohydrates: number | null;
  total_fat: number | null;
  fiber: number | null;
  sugars: number | null;
  sodium: number | null;
  potassium: number | null;
  calcium: number | null;
  iron: number | null;
  vitamin_c: number | null;
  vitamin_a: number | null;
  barcode: string | null;
  sort_order: number;
  created_at: string;
}

export interface CreateRecipeInput {
  name: string;
  description?: string;
  servings?: number;
}

export interface UpdateRecipeInput {
  name?: string;
  description?: string;
  servings?: number;
}

export interface AddRecipeItemInput {
  food_fdc_id: number;
  food_description: string;
  serving_amount: number;
  serving_unit: string;
  calories: number;
  protein: number | null;
  carbohydrates: number | null;
  total_fat: number | null;
  fiber?: number | null;
  sugars?: number | null;
  sodium?: number | null;
  potassium?: number | null;
  calcium?: number | null;
  iron?: number | null;
  vitamin_c?: number | null;
  vitamin_a?: number | null;
  barcode?: string | null;
}

export interface RecipeResponse<T = Recipe | Recipe[]> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getRecipes(): Promise<RecipeResponse<Recipe[]>> {
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
      .select(`
        *,
        recipe_items (*)
      `)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching recipes:", error);
      return { success: false, error: error.message };
    }

    const recipes = (data || []).map((recipe) => ({
      ...recipe,
      items: (recipe.recipe_items || []).sort((a: RecipeItem, b: RecipeItem) => a.sort_order - b.sort_order),
    }));

    return { success: true, data: recipes };
  } catch (error) {
    console.error("Unexpected error fetching recipes:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getRecipe(id: string): Promise<RecipeResponse<Recipe>> {
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
      .select(`
        *,
        recipe_items (*)
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      console.error("Error fetching recipe:", error);
      return { success: false, error: error.message };
    }

    const recipe = {
      ...data,
      items: (data.recipe_items || []).sort((a: RecipeItem, b: RecipeItem) => a.sort_order - b.sort_order),
    };

    return { success: true, data: recipe };
  } catch (error) {
    console.error("Unexpected error fetching recipe:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function createRecipe(input: CreateRecipeInput): Promise<RecipeResponse<Recipe>> {
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
      .insert({
        user_id: user.id,
        name: input.name,
        description: input.description || null,
        servings: input.servings || 1,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating recipe:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/recipes");
    return { success: true, data: { ...data, items: [] } };
  } catch (error) {
    console.error("Unexpected error creating recipe:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateRecipe(id: string, input: UpdateRecipeInput): Promise<RecipeResponse<Recipe>> {
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
      .update(input)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating recipe:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/recipes");
    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error updating recipe:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deleteRecipe(id: string): Promise<RecipeResponse<void>> {
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
      console.error("Error deleting recipe:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/recipes");
    return { success: true };
  } catch (error) {
    console.error("Unexpected error deleting recipe:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function addRecipeItem(recipeId: string, input: AddRecipeItemInput): Promise<RecipeResponse<RecipeItem>> {
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
      .select("id")
      .eq("id", recipeId)
      .eq("user_id", user.id)
      .single();

    if (recipeError || !recipe) {
      return { success: false, error: "Recipe not found" };
    }

    const { data: maxItem } = await supabase
      .from("recipe_items")
      .select("sort_order")
      .eq("recipe_id", recipeId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = (maxItem?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("recipe_items")
      .insert({
        recipe_id: recipeId,
        food_fdc_id: input.food_fdc_id,
        food_description: input.food_description,
        serving_amount: input.serving_amount,
        serving_unit: input.serving_unit,
        calories: input.calories,
        protein: input.protein,
        carbohydrates: input.carbohydrates,
        total_fat: input.total_fat,
        fiber: input.fiber ?? null,
        sugars: input.sugars ?? null,
        sodium: input.sodium ?? null,
        potassium: input.potassium ?? null,
        calcium: input.calcium ?? null,
        iron: input.iron ?? null,
        vitamin_c: input.vitamin_c ?? null,
        vitamin_a: input.vitamin_a ?? null,
        barcode: input.barcode || null,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding recipe item:", error);
      return { success: false, error: error.message };
    }

    await supabase.from("recipes").update({ updated_at: new Date().toISOString() }).eq("id", recipeId);

    revalidatePath("/recipes");
    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error adding recipe item:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function updateRecipeItem(
  itemId: string,
  input: Partial<AddRecipeItemInput>
): Promise<RecipeResponse<RecipeItem>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    const { data: item, error: itemError } = await supabase
      .from("recipe_items")
      .select("recipe_id, recipes!inner(user_id)")
      .eq("id", itemId)
      .single();

    if (itemError || !item) {
      return { success: false, error: "Recipe item not found" };
    }

    const { data, error } = await supabase
      .from("recipe_items")
      .update(input)
      .eq("id", itemId)
      .select()
      .single();

    if (error) {
      console.error("Error updating recipe item:", error);
      return { success: false, error: error.message };
    }

    await supabase.from("recipes").update({ updated_at: new Date().toISOString() }).eq("id", item.recipe_id);

    revalidatePath("/recipes");
    return { success: true, data };
  } catch (error) {
    console.error("Unexpected error updating recipe item:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deleteRecipeItem(itemId: string): Promise<RecipeResponse<void>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "User not authenticated" };
    }

    const { data: item } = await supabase
      .from("recipe_items")
      .select("recipe_id, recipes!inner(user_id)")
      .eq("id", itemId)
      .single();

    if (!item) {
      return { success: false, error: "Recipe item not found" };
    }

    const { error } = await supabase.from("recipe_items").delete().eq("id", itemId);

    if (error) {
      console.error("Error deleting recipe item:", error);
      return { success: false, error: error.message };
    }

    await supabase.from("recipes").update({ updated_at: new Date().toISOString() }).eq("id", item.recipe_id);

    revalidatePath("/recipes");
    return { success: true };
  } catch (error) {
    console.error("Unexpected error deleting recipe item:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
