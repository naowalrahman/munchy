"use server";

import { OpenFoodFacts } from "@openfoodfacts/openfoodfacts-nodejs";

export interface Nutrient {
  name: string;
  amount: number;
  unit: string;
}

export interface FoodSearchResult {
  fdcId: number;
  description: string;
  brandName?: string;
  brandOwner?: string;
  dataType: string;
  servingSize?: number;
  servingSizeUnit?: string;
}

export interface NutritionalData {
  fdcId: number;
  description: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;

  // Energy
  calories: number; // kcal

  // Macronutrients
  protein: Nutrient | null;
  carbohydrates: Nutrient | null;
  totalFat: Nutrient | null;
  fiber: Nutrient | null;
  sugars: Nutrient | null;

  // Micronutrients
  sodium: Nutrient | null;
  potassium: Nutrient | null;
  calcium: Nutrient | null;
  iron: Nutrient | null;
  vitaminC: Nutrient | null;
  vitaminA: Nutrient | null;
}

interface USDAFoodSearchResponse {
  foods: Array<{
    fdcId: number;
    description: string;
    brandName?: string;
    brandOwner?: string;
    dataType: string;
    servingSize?: number;
    servingSizeUnit?: string;
  }>;
  totalHits: number;
  currentPage: number;
  totalPages: number;
}

interface USDAFoodDetailsResponse {
  fdcId: number;
  description: string;
  brandName?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: Array<{
    // Foundation Foods structure
    nutrient?: {
      id: number;
      name: string;
      unitName: string;
    };
    // SR Legacy / other food types structure
    nutrientId?: number;
    nutrientNumber?: string;
    nutrientName?: string;
    unitName?: string;
    amount: number;
  }>;
}

const NUTRIENT_IDS = {
  ENERGY_KCAL: 1008, // Energy (kcal)
  ENERGY_KJ: 1062, // Energy (kJ) - fallback
  PROTEIN: 1003, // Protein
  CARBOHYDRATES: 1005, // Carbohydrate, by difference
  TOTAL_FAT: 1004, // Total lipid (fat)
  FIBER: 1079, // Fiber, total dietary
  SUGARS: 2000, // Sugars, total including NLEA
  SODIUM: 1093, // Sodium, Na
  POTASSIUM: 1092, // Potassium, K
  CALCIUM: 1087, // Calcium, Ca
  IRON: 1089, // Iron, Fe
  VITAMIN_C: 1162, // Vitamin C, total ascorbic acid
  VITAMIN_A: 1106, // Vitamin A, RAE
} as const;

function getApiKey(): string {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    throw new Error("USDA_API_KEY is not configured in environment variables");
  }
  return apiKey;
}

function findNutrient(foodNutrients: USDAFoodDetailsResponse["foodNutrients"], nutrientId: number): Nutrient | null {
  const nutrient = foodNutrients.find((fn) => {
    // Try Foundation Foods structure first
    if (fn.nutrient?.id === nutrientId) return true;
    // Try SR Legacy structure
    if (fn.nutrientId === nutrientId) return true;
    // Try nutrientNumber (may be string)
    if (fn.nutrientNumber && parseInt(fn.nutrientNumber) === nutrientId) return true;
    return false;
  });

  if (!nutrient) return null;

  return {
    name: nutrient.nutrient?.name || nutrient.nutrientName || "Unknown",
    amount: nutrient.amount,
    unit: nutrient.nutrient?.unitName || nutrient.unitName || "",
  };
}

function extractCalories(foodNutrients: USDAFoodDetailsResponse["foodNutrients"]): number {
  // First try to get kcal directly
  const kcalNutrient = foodNutrients.find((fn) => {
    if (fn.nutrient?.id === NUTRIENT_IDS.ENERGY_KCAL) return true;
    if (fn.nutrientId === NUTRIENT_IDS.ENERGY_KCAL) return true;
    if (fn.nutrientNumber && parseInt(fn.nutrientNumber) === NUTRIENT_IDS.ENERGY_KCAL) return true;
    return false;
  });

  if (kcalNutrient) {
    return kcalNutrient.amount;
  }

  // Fallback: convert from kJ if available
  const kjNutrient = foodNutrients.find((fn) => {
    if (fn.nutrient?.id === NUTRIENT_IDS.ENERGY_KJ) return true;
    if (fn.nutrientId === NUTRIENT_IDS.ENERGY_KJ) return true;
    if (fn.nutrientNumber && parseInt(fn.nutrientNumber) === NUTRIENT_IDS.ENERGY_KJ) return true;
    return false;
  });

  if (kjNutrient) {
    // Convert kJ to kcal (1 kcal = 4.184 kJ)
    return kjNutrient.amount / 4.184;
  }

  return 0;
}

export async function searchFoods(query: string, pageSize: number = 25): Promise<FoodSearchResult[]> {
  if (!query || query.trim().length === 0) {
    throw new Error("Search query cannot be empty");
  }

  const apiKey = getApiKey();
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: query.trim(),
        pageSize: Math.min(pageSize, 200),
      }),
    });

    if (!response.ok) {
      throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
    }

    const data: USDAFoodSearchResponse = await response.json();

    return data.foods.map((food) => ({
      fdcId: food.fdcId,
      description: food.description,
      brandName: food.brandName,
      brandOwner: food.brandOwner,
      dataType: food.dataType,
      servingSize: food.servingSize,
      servingSizeUnit: food.servingSizeUnit,
    }));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to search foods: ${error.message}`);
    }
    throw new Error("Failed to search foods: Unknown error");
  }
}

export async function getFoodNutrition(fdcId: number): Promise<NutritionalData> {
  if (!fdcId || fdcId <= 0) {
    throw new Error("Invalid FDC ID");
  }

  const apiKey = getApiKey();
  const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${apiKey}&format=full`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          `Food with FDC ID ${fdcId} not found. This food may not have detailed nutritional data available.`
        );
      }
      if (response.status === 400) {
        throw new Error(`Invalid request for FDC ID ${fdcId}. Please try a different food.`);
      }
      throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
    }

    const data: USDAFoodDetailsResponse = await response.json();

    if (!data.foodNutrients || data.foodNutrients.length === 0) {
      throw new Error(`No nutritional data available for this food (FDC ID: ${fdcId})`);
    }

    const servingSizeMultiplier = data.servingSize ? data.servingSize / 100 : 1.0;

    const adjustNutrient = (nutrient: Nutrient | null): Nutrient | null => {
      if (!nutrient) return null;
      return {
        ...nutrient,
        amount: nutrient.amount * servingSizeMultiplier,
      };
    };

    return {
      fdcId: data.fdcId,
      description: data.description,
      brandName: data.brandName,
      servingSize: data.servingSize,
      servingSizeUnit: data.servingSizeUnit,
      calories: extractCalories(data.foodNutrients) * servingSizeMultiplier,
      protein: adjustNutrient(findNutrient(data.foodNutrients, NUTRIENT_IDS.PROTEIN)),
      carbohydrates: adjustNutrient(findNutrient(data.foodNutrients, NUTRIENT_IDS.CARBOHYDRATES)),
      totalFat: adjustNutrient(findNutrient(data.foodNutrients, NUTRIENT_IDS.TOTAL_FAT)),
      fiber: adjustNutrient(findNutrient(data.foodNutrients, NUTRIENT_IDS.FIBER)),
      sugars: adjustNutrient(findNutrient(data.foodNutrients, NUTRIENT_IDS.SUGARS)),
      sodium: adjustNutrient(findNutrient(data.foodNutrients, NUTRIENT_IDS.SODIUM)),
      potassium: adjustNutrient(findNutrient(data.foodNutrients, NUTRIENT_IDS.POTASSIUM)),
      calcium: adjustNutrient(findNutrient(data.foodNutrients, NUTRIENT_IDS.CALCIUM)),
      iron: adjustNutrient(findNutrient(data.foodNutrients, NUTRIENT_IDS.IRON)),
      vitaminC: adjustNutrient(findNutrient(data.foodNutrients, NUTRIENT_IDS.VITAMIN_C)),
      vitaminA: adjustNutrient(findNutrient(data.foodNutrients, NUTRIENT_IDS.VITAMIN_A)),
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error; // Re-throw the error with its original message
    }
    throw new Error("Failed to get food nutrition: Unknown error");
  }
}

interface OFFProductData {
  product_name?: string;
  brands?: string;
  serving_size?: string;
  serving_quantity?: string | number;
  serving_quantity_unit?: string;
  nutriments?: Record<string, number | undefined>;
}

function barcodeToId(barcode: string): number {
  let hash = 0;
  for (let i = 0; i < barcode.length; i++) {
    const char = barcode.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Return negative to distinguish from USDA IDs
  return -Math.abs(hash);
}

export async function lookupBarcode(barcode: string): Promise<NutritionalData> {
  if (!barcode || barcode.trim().length === 0) {
    throw new Error("Barcode cannot be empty");
  }

  const cleanBarcode = barcode.replace(/[\s-]/g, "");

  try {
    const client = new OpenFoodFacts(fetch);
    const response = await client.getProductV2(cleanBarcode);

    if (response.error) {
      throw new Error(`Open Food Facts API error: ${response.error}`);
    }

    if (!response.data || response.data.status === 0 || !response.data.product) {
      throw new Error("Product not found. Try searching by name instead.");
    }

    const productData = response.data.product as unknown as OFFProductData;
    const nutriments = productData.nutriments || {};

    const createNutrient = (name: string, value: number | undefined, unit: string): Nutrient | null => {
      if (value === undefined || value === null) return null;
      return { name, amount: value, unit };
    };

    let servingSize: number | undefined;
    let servingSizeUnit: string | undefined;

    const servingQuantity = productData.serving_quantity;
    const servingSizeText = productData.serving_size;
    const servingQuantityUnit = productData.serving_quantity_unit;

    if (servingQuantity) {
      servingSize = parseFloat(String(servingQuantity));
      if (servingQuantityUnit) {
        servingSizeUnit = servingQuantityUnit;
      } else if (servingSizeText) {
        const match = servingSizeText.match(/^[\d.]+\s*(\w+)/);
        servingSizeUnit = match ? match[1] : "g";
      } else {
        servingSizeUnit = "g";
      }
    } else if (servingSizeText) {
      const match = servingSizeText.match(/^([\d.]+)\s*(\w+)?/);
      if (match) {
        servingSize = parseFloat(match[1]);
        servingSizeUnit = match[2] || "g";
      }
    }

    const effectiveServingSize = servingSize ?? 100;
    const effectiveServingSizeUnit = servingSizeUnit ?? "g";
    const servingSizeMultiplier = effectiveServingSize / 100;

    const getNutrientValue = (baseName: string, adjustForServing: boolean = true): number | undefined => {
      const servingValue = nutriments[`${baseName}_serving`];
      if (servingValue !== undefined && servingValue !== null) {
        return servingValue;
      }

      const per100gValue = nutriments[`${baseName}_100g`] ?? nutriments[baseName];
      if (per100gValue === undefined || per100gValue === null) {
        return undefined;
      }

      return adjustForServing ? per100gValue * servingSizeMultiplier : per100gValue;
    };

    const calories = getNutrientValue("energy-kcal") ?? 0;

    return {
      fdcId: barcodeToId(cleanBarcode),
      description: productData.product_name || `Product (${cleanBarcode})`,
      brandName: productData.brands,
      servingSize: effectiveServingSize,
      servingSizeUnit: effectiveServingSizeUnit,
      calories,
      protein: createNutrient("Protein", getNutrientValue("proteins"), "g"),
      carbohydrates: createNutrient("Carbohydrates", getNutrientValue("carbohydrates"), "g"),
      totalFat: createNutrient("Total Fat", getNutrientValue("fat"), "g"),
      fiber: createNutrient("Fiber", getNutrientValue("fiber"), "g"),
      sugars: createNutrient("Sugars", getNutrientValue("sugars"), "g"),
      sodium: createNutrient(
        "Sodium",
        (() => {
          const sodiumValue = getNutrientValue("sodium");
          return sodiumValue !== undefined ? sodiumValue * 1000 : undefined;
        })(),
        "mg"
      ),
      potassium: createNutrient("Potassium", getNutrientValue("potassium"), "mg"),
      calcium: createNutrient("Calcium", getNutrientValue("calcium"), "mg"),
      iron: createNutrient("Iron", getNutrientValue("iron"), "mg"),
      vitaminC: createNutrient("Vitamin C", getNutrientValue("vitamin-c"), "mg"),
      vitaminA: createNutrient("Vitamin A", getNutrientValue("vitamin-a"), "µg"),
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to look up barcode: Unknown error");
  }
}
