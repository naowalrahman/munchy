import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { getRecipes } from "@/app/actions/recipes";
import RecipesClient from "./RecipesClient";

export default async function RecipesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const recipesResponse = await getRecipes();
  const recipes = recipesResponse.success ? recipesResponse.data || [] : [];

  return <RecipesClient initialRecipes={recipes} />;
}
