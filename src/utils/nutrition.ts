import type { NutritionalData } from "@/app/actions/food";
import type { FavoritedFood } from "@/components/food-search/types";

const UNIT_MAP: Record<string, string> = {
  g: "g",
  gram: "g",
  grams: "g",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  pound: "lb",
  pounds: "lb",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  cup: "cup",
  cups: "cup",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  piece: "piece",
  pieces: "piece",
  slice: "slice",
  slices: "slice",
};

export function normalizeUnit(unit: string): string {
  return UNIT_MAP[unit.toLowerCase().trim()] || unit.toLowerCase().trim();
}

export function getNutritionMultiplier(
  servingAmount: number,
  servingUnit: string,
  servingSize: number | undefined,
  servingSizeUnit: string | undefined
): number {
  const effectiveSize = servingSize || 100;
  const sizeUnit = normalizeUnit(servingSizeUnit || "g");
  const currentUnit = normalizeUnit(servingUnit);

  if (effectiveSize <= 0 || currentUnit === "serving") return servingAmount;
  if (currentUnit === sizeUnit) return servingAmount / effectiveSize;
  return servingAmount;
}

export function toFavoritedFoodFromNutrition(
  nutrition: NutritionalData,
  barcode?: string | null
): FavoritedFood {
  return {
    fdcId: nutrition.fdcId,
    description: nutrition.description,
    brandName: nutrition.brandName,
    servingSize: nutrition.servingSize,
    servingSizeUnit: nutrition.servingSizeUnit,
    barcode: barcode ?? undefined,
    nutrientCache: nutrition,
  };
}
