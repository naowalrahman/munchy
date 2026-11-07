import {
  type Entry,
  emptyNutrients,
  type Food,
  type NutrientKey,
  type Nutrients,
  nutrientKeys,
  type Portion,
  type Recipe,
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

export function portionLabel(p: Portion) {
  const amount = formatNumber(p.quantity, 2);
  if (p.unit !== "serving") return `${amount} ${p.unit}`;

  return `${amount} × ${p.food.servings.find((s) => s.id === p.servingId)?.label}`;
}

export function totalNutrition(portions: Portion[]) {
  const total = emptyNutrients();
  const coverage = Object.fromEntries(nutrientKeys.map((k) => [k, 0])) as Record<NutrientKey, number>;
  let count = 0;

  for (const p of portions) {
    const n = portionNutrition(p);
    const reporting = p.food.nutritionCoverage;
    count += reporting?.count ?? 1;

    for (const k of nutrientKeys)
      if (n[k] !== null) {
        total[k] = (total[k] ?? 0) + n[k];
        coverage[k] += reporting?.reported[k] ?? 1;
      }
  }

  return { total, coverage, count };
}

export interface SourceFood {
  id: string;
  name: string;
  value: number;
  meals: Set<string>;
  partial: boolean;
}

/** Splits entries into per-food contributions to one nutrient, plus the portions that don't report it. */
export function nutrientSources(entries: Entry[], key: NutrientKey) {
  const foods = new Map<string, SourceFood>();
  const missing: Entry[] = [];
  let total: number | null = null;

  for (const entry of entries) {
    const value = portionNutrition(entry)[key];

    if (value === null) {
      missing.push(entry);
      continue;
    }

    total = (total ?? 0) + value;

    const food = foods.get(entry.food.id) ?? {
      id: entry.food.id,
      name: entry.food.name,
      value: 0,
      meals: new Set(),
      partial: false,
    };

    const reporting = entry.food.nutritionCoverage;
    food.partial ||= reporting !== undefined && reporting.reported[key] < reporting.count;
    food.value += value;
    food.meals.add(entry.meal);
    foods.set(entry.food.id, food);
  }

  const all = [...foods.values()];

  return {
    total,
    missing,
    ranked: all.filter((f) => f.value > 0).sort((a, b) => b.value - a.value),
    zero: all.filter((f) => f.value === 0),
  };
}

export function recipeFood(recipe: Recipe): Food {
  const { total, coverage, count } = totalNutrition(recipe.ingredients);

  const servings: Food["servings"] = [
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
    nutritionCoverage: { count, reported: coverage },
    servings,
  };
}

export const formatNumber = (value: number | null, decimals = 1) =>
  value === null ? "—" : Intl.NumberFormat(undefined, { maximumFractionDigits: decimals }).format(value);
