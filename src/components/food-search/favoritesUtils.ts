import type { NutritionalData } from "@/app/actions/food";
import type { FavoritedFood } from "./types";

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
