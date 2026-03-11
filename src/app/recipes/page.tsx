import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import RecipesClient from "./RecipesClient";
import { getRecipes } from "@/app/actions/recipes";

export default async function RecipesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const recipesResponse = await getRecipes();
  const initialRecipes = recipesResponse.success && recipesResponse.data ? recipesResponse.data : [];

  return <RecipesClient initialRecipes={initialRecipes} />;
}
