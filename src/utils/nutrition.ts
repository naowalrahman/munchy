import {
  emptyNutrients,
  nutrientKeys,
  type NutrientKey,
  type Nutrients,
  type Portion,
  type Recipe,
  type Food,
  type Serving,
} from "./model";
export const nutrients: Record<NutrientKey, { label: string; unit: string; group: string }> = {
  calories: { label: "Energy", unit: "kcal", group: "Energy & macros" },
  protein: { label: "Protein", unit: "g", group: "Energy & macros" },
  carbohydrate: { label: "Carbohydrate", unit: "g", group: "Energy & macros" },
  fat: { label: "Fat", unit: "g", group: "Energy & macros" },
  fiber: { label: "Fiber", unit: "g", group: "Carbohydrates" },
  sugar: { label: "Total sugar", unit: "g", group: "Carbohydrates" },
  added_sugars: { label: "Added sugars", unit: "g", group: "Carbohydrates" },
  saturated_fat: { label: "Saturated fat", unit: "g", group: "Fats" },
  trans_fat: { label: "Trans fat", unit: "g", group: "Fats" },
  polyunsaturated_fat: { label: "Polyunsaturated fat", unit: "g", group: "Fats" },
  monounsaturated_fat: { label: "Monounsaturated fat", unit: "g", group: "Fats" },
  cholesterol: { label: "Cholesterol", unit: "mg", group: "Fats" },
  sodium: { label: "Sodium", unit: "mg", group: "Minerals" },
  potassium: { label: "Potassium", unit: "mg", group: "Minerals" },
  calcium: { label: "Calcium", unit: "mg", group: "Minerals" },
  iron: { label: "Iron", unit: "mg", group: "Minerals" },
  vitamin_a: { label: "Vitamin A", unit: "µg", group: "Vitamins" },
  vitamin_c: { label: "Vitamin C", unit: "mg", group: "Vitamins" },
  vitamin_d: { label: "Vitamin D", unit: "µg", group: "Vitamins" },
};
export function scale(values: Nutrients, factor: number): Nutrients {
  return Object.fromEntries(nutrientKeys.map((k) => [k, values[k] === null ? null : values[k] * factor])) as Nutrients;
}
export function portionNutrition(p: Portion) {
  const serving = p.food.servings.find((s) => s.id === p.servingId);
  if (!serving) throw new Error("This serving no longer exists. Choose another serving.");
  return scale(serving.nutrients, p.factor);
}
export function totalNutrition(portions: Portion[]) {
  const total = emptyNutrients();
  const coverage = Object.fromEntries(nutrientKeys.map((k) => [k, 0])) as Record<NutrientKey, number>;
  for (const p of portions) {
    const n = portionNutrition(p);
    for (const k of nutrientKeys)
      if (n[k] !== null) {
        total[k] = (total[k] ?? 0) + n[k];
        coverage[k]++;
      }
  }
  return { total, coverage, count: portions.length };
}
export function recipeFood(recipe: Recipe): Food {
  const { total, coverage, count } = totalNutrition(recipe.ingredients);
  for (const k of nutrientKeys) if (coverage[k] < count) total[k] = null;
  const servings: Serving[] = [
    {
      id: "portion",
      label: "1 recipe serving",
      amount: 1,
      unit: "portion" as const,
      nutrients: scale(total, 1 / recipe.servings),
    },
  ];
  if (recipe.cookedGrams)
    servings.push({
      id: "weight",
      label: "100 g, prepared",
      amount: 100,
      unit: "g",
      nutrients: scale(total, 100 / recipe.cookedGrams),
    });
  return {
    id: `recipe:${recipe.id}`,
    name: recipe.name,
    source: "recipe",
    fetchedAt: recipe.updatedAt,
    cacheUntil: Number.MAX_SAFE_INTEGER,
    servings,
  };
}
export const formatNumber = (value: number | null, decimals = 1) =>
  value === null ? "—" : Intl.NumberFormat(undefined, { maximumFractionDigits: decimals }).format(value);
