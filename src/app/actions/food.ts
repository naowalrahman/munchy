'use server';

import { OpenFoodFacts } from '@openfoodfacts/openfoodfacts-nodejs';

/**
 * USDA FoodData Central API Server Actions
 * 
 * These server functions provide access to the USDA FoodData Central API
 * for searching foods and retrieving nutritional information.
 */

// ============================================================================
// TypeScript Types
// ============================================================================

/**
 * Individual nutrient information
 */
export interface Nutrient {
    name: string;
    amount: number;
    unit: string;
}

/**
 * Simplified food search result
 */
export interface FoodSearchResult {
    fdcId: number;
    description: string;
    brandName?: string;
    brandOwner?: string;
    dataType: string;
    servingSize?: number;
    servingSizeUnit?: string;
}

/**
 * Comprehensive nutritional data for a food item
 */
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

/**
 * Raw USDA API response for food search
 */
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

/**
 * Raw USDA API response for food details
 */
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

// ============================================================================
// USDA Nutrient ID Mapping
// ============================================================================

const NUTRIENT_IDS = {
    ENERGY_KCAL: 1008,      // Energy (kcal)
    ENERGY_KJ: 1062,        // Energy (kJ) - fallback
    PROTEIN: 1003,          // Protein
    CARBOHYDRATES: 1005,    // Carbohydrate, by difference
    TOTAL_FAT: 1004,        // Total lipid (fat)
    FIBER: 1079,            // Fiber, total dietary
    SUGARS: 2000,           // Sugars, total including NLEA
    SODIUM: 1093,           // Sodium, Na
    POTASSIUM: 1092,        // Potassium, K
    CALCIUM: 1087,          // Calcium, Ca
    IRON: 1089,             // Iron, Fe
    VITAMIN_C: 1162,        // Vitamin C, total ascorbic acid
    VITAMIN_A: 1106,        // Vitamin A, RAE
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get API key from environment variables
 */
function getApiKey(): string {
    const apiKey = process.env.USDA_API_KEY;
    if (!apiKey) {
        throw new Error('USDA_API_KEY is not configured in environment variables');
    }
    return apiKey;
}

/**
 * Find a nutrient by ID in the food nutrients array
 */
function findNutrient(
    foodNutrients: USDAFoodDetailsResponse['foodNutrients'],
    nutrientId: number
): Nutrient | null {
    const nutrient = foodNutrients.find(fn => {
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
        name: nutrient.nutrient?.name || nutrient.nutrientName || 'Unknown',
        amount: nutrient.amount,
        unit: nutrient.nutrient?.unitName || nutrient.unitName || '',
    };
}

/**
 * Extract calories, ensuring they are in kcal format
 */
function extractCalories(foodNutrients: USDAFoodDetailsResponse['foodNutrients']): number {
    // First try to get kcal directly
    const kcalNutrient = foodNutrients.find(fn => {
        if (fn.nutrient?.id === NUTRIENT_IDS.ENERGY_KCAL) return true;
        if (fn.nutrientId === NUTRIENT_IDS.ENERGY_KCAL) return true;
        if (fn.nutrientNumber && parseInt(fn.nutrientNumber) === NUTRIENT_IDS.ENERGY_KCAL) return true;
        return false;
    });

    if (kcalNutrient) {
        return kcalNutrient.amount;
    }

    // Fallback: convert from kJ if available
    const kjNutrient = foodNutrients.find(fn => {
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

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Search for foods in the USDA FoodData Central database
 * 
 * @param query - Search term (e.g., "chicken breast", "apple")
 * @param pageSize - Number of results to return (default: 25, max: 200)
 * @returns Array of food search results
 */
export async function searchFoods(
    query: string,
    pageSize: number = 25
): Promise<FoodSearchResult[]> {
    if (!query || query.trim().length === 0) {
        throw new Error('Search query cannot be empty');
    }

    const apiKey = getApiKey();
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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

        return data.foods.map(food => ({
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
        throw new Error('Failed to search foods: Unknown error');
    }
}

/**
 * Get detailed nutritional information for a specific food
 * 
 * @param fdcId - FoodData Central ID
 * @returns Detailed nutritional data including macros and micros
 */
export async function getFoodNutrition(fdcId: number): Promise<NutritionalData> {
    if (!fdcId || fdcId <= 0) {
        throw new Error('Invalid FDC ID');
    }

    const apiKey = getApiKey();
    // Use the single food endpoint with GET to ensure compatibility with all food types
    const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${apiKey}&format=full`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            // Add cache control to ensure fresh data
            cache: 'no-store',
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Food with FDC ID ${fdcId} not found. This food may not have detailed nutritional data available.`);
            }
            if (response.status === 400) {
                throw new Error(`Invalid request for FDC ID ${fdcId}. Please try a different food.`);
            }
            throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
        }

        const data: USDAFoodDetailsResponse = await response.json();

        // Validate that we have food nutrients
        if (!data.foodNutrients || data.foodNutrients.length === 0) {
            throw new Error(`No nutritional data available for this food (FDC ID: ${fdcId})`);
        }

        // Calculate adjustment factor for serving size
        // USDA API returns nutrient values per 100 units, so we need to adjust based on serving size
        const servingSizeMultiplier = data.servingSize ? data.servingSize / 100 : 1.0;

        // Helper function to adjust nutrient object (handles null case)
        const adjustNutrient = (nutrient: Nutrient | null): Nutrient | null => {
            if (!nutrient) return null;
            return {
                ...nutrient,
                amount: nutrient.amount * servingSizeMultiplier,
            };
        };

        // Build the nutritional data object
        return {
            fdcId: data.fdcId,
            description: data.description,
            brandName: data.brandName,
            servingSize: data.servingSize,
            servingSizeUnit: data.servingSizeUnit,

            // Energy (ensure it's in kcal, adjusted for serving size)
            calories: extractCalories(data.foodNutrients) * servingSizeMultiplier,

            // Macronutrients (adjusted for serving size)
            protein: adjustNutrient(findNutrient(data.foodNutrients, NUTRIENT_IDS.PROTEIN)),
            carbohydrates: adjustNutrient(findNutrient(data.foodNutrients, NUTRIENT_IDS.CARBOHYDRATES)),
            totalFat: adjustNutrient(findNutrient(data.foodNutrients, NUTRIENT_IDS.TOTAL_FAT)),
            fiber: adjustNutrient(findNutrient(data.foodNutrients, NUTRIENT_IDS.FIBER)),
            sugars: adjustNutrient(findNutrient(data.foodNutrients, NUTRIENT_IDS.SUGARS)),

            // Micronutrients (adjusted for serving size)
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
        throw new Error('Failed to get food nutrition: Unknown error');
    }
}

// ============================================================================
// Open Food Facts API Types
// ============================================================================

// Open Food Facts product structure (for reference)
// The SDK handles the API response structure, but we access product fields directly
interface OpenFoodFactsProduct {
    code: string;
    product_name?: string;
    brands?: string;
    serving_size?: string;
    serving_quantity?: number;
    nutriments?: {
        'energy-kcal_100g'?: number;
        'energy-kcal'?: number;
        'energy-kcal_serving'?: number;
        proteins_100g?: number;
        proteins?: number;
        carbohydrates_100g?: number;
        carbohydrates?: number;
        fat_100g?: number;
        fat?: number;
        fiber_100g?: number;
        fiber?: number;
        sugars_100g?: number;
        sugars?: number;
        sodium_100g?: number;
        sodium?: number;
        potassium_100g?: number;
        potassium?: number;
        calcium_100g?: number;
        calcium?: number;
        iron_100g?: number;
        iron?: number;
        'vitamin-c_100g'?: number;
        'vitamin-c'?: number;
        'vitamin-a_100g'?: number;
        'vitamin-a'?: number;
    };
}

// ============================================================================
// Barcode Lookup Server Action
// ============================================================================

/**
 * Generate a stable numeric ID from a barcode string
 * Uses a negative number to distinguish from USDA fdcIds
 */
function barcodeToId(barcode: string): number {
    let hash = 0;
    for (let i = 0; i < barcode.length; i++) {
        const char = barcode.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Return negative to distinguish from USDA IDs
    return -Math.abs(hash);
}

/**
 * Look up a food product by barcode using the Open Food Facts API v2
 * 
 * Uses the @openfoodfacts/openfoodfacts-nodejs SDK which implements the official API v2.
 * API documentation: https://openfoodfacts.github.io/openfoodfacts-server/api/ref-v2/#get-/api/v2/product/-code-
 * 
 * @param barcode - UPC/EAN barcode string (e.g., "0049000006346")
 * @returns Nutritional data in the same format as USDA API
 */
export async function lookupBarcode(barcode: string): Promise<NutritionalData> {
    if (!barcode || barcode.trim().length === 0) {
        throw new Error('Barcode cannot be empty');
    }

    // Clean the barcode (remove any spaces or dashes)
    const cleanBarcode = barcode.replace(/[\s-]/g, '');

    try {
        // Initialize Open Food Facts client
        const client = new OpenFoodFacts(fetch);
        
        // Fetch product data using the SDK (v2 API for nutriments compatibility)
        // According to API v2 docs: https://openfoodfacts.github.io/openfoodfacts-server/api/ref-v2/#get-/api/v2/product/-code-
        const response = await client.getProductV2(cleanBarcode);

        if (response.error) {
            throw new Error(`Open Food Facts API error: ${response.error}`);
        }

        // Check response status (status: 0 = not found, status: 1 = found)
        if (!response.data || response.data.status === 0 || !response.data.product) {
            throw new Error('Product not found. Try searching by name instead.');
        }

        // Access product fields according to API v2 structure
        // The product object contains: product_name, brands, serving_size, serving_quantity, nutriments, etc.
        // Type assertion needed because SDK types use complex unions that don't expose all fields
        // but the actual API response includes all these fields according to the API v2 documentation
        const product = response.data.product;
        const productData = product as any;
        const nutriments = productData.nutriments || {};

        // Helper to create a nutrient object
        const createNutrient = (
            name: string,
            value: number | undefined,
            unit: string
        ): Nutrient | null => {
            if (value === undefined || value === null) return null;
            return { name, amount: value, unit };
        };

        // Parse serving size from string (e.g., "30g" or "1 cup (240ml)")
        // According to API v2: serving_quantity is a string (normalized, e.g., "15"), 
        // serving_size is a string (free text, e.g., "15g"), serving_quantity_unit may exist
        let servingSize: number | undefined;
        let servingSizeUnit: string | undefined;
        
        const servingQuantity = productData.serving_quantity;
        const servingSizeText = productData.serving_size;
        const servingQuantityUnit = productData.serving_quantity_unit;
        
        if (servingQuantity) {
            // serving_quantity is normalized (e.g., "15"), unit may be in serving_quantity_unit
            servingSize = parseFloat(servingQuantity);
            // Try serving_quantity_unit first, then extract from serving_size if available
            if (servingQuantityUnit) {
                servingSizeUnit = servingQuantityUnit;
            } else if (servingSizeText) {
                // Extract unit from serving_size string (e.g., "15g" -> "g")
                const match = servingSizeText.match(/^[\d.]+\s*(\w+)/);
                servingSizeUnit = match ? match[1] : 'g';
            } else {
                servingSizeUnit = 'g'; // Default to grams
            }
        } else if (servingSizeText) {
            // Try to extract number and unit from serving size string (e.g., "30g" or "1 cup (240ml)")
            const match = servingSizeText.match(/^([\d.]+)\s*(\w+)?/);
            if (match) {
                servingSize = parseFloat(match[1]);
                servingSizeUnit = match[2] || 'g';
            }
        }

        // Determine the serving size to use (default to 100g if not found)
        const effectiveServingSize = servingSize ?? 100;
        const effectiveServingSizeUnit = servingSizeUnit ?? 'g';

        // Calculate adjustment factor for serving size
        // Open Food Facts returns values per 100g, so we need to adjust based on serving size
        // This matches the behavior of getFoodNutrition for USDA foods
        const servingSizeMultiplier = effectiveServingSize / 100;

        // Helper function to get nutrient value, preferring _serving if available, otherwise _100g adjusted
        const getNutrientValue = (
            baseName: string,
            adjustForServing: boolean = true
        ): number | undefined => {
            // Prefer per-serving value if available (already calculated for serving size)
            const servingValue = nutriments[`${baseName}_serving`];
            if (servingValue !== undefined && servingValue !== null) {
                return servingValue;
            }
            
            // Fallback to per-100g value and adjust for serving size
            const per100gValue = nutriments[`${baseName}_100g`] ?? nutriments[baseName];
            if (per100gValue === undefined || per100gValue === null) {
                return undefined;
            }
            
            return adjustForServing ? per100gValue * servingSizeMultiplier : per100gValue;
        };

        // Get calories - prefer per-serving value if available, otherwise use per-100g and adjust
        const calories = getNutrientValue('energy-kcal') ?? 0;

        // Build nutritional data matching the NutritionalData interface
        // Values are adjusted to per-serving size to match USDA API behavior
        // According to API v2 structure: product_name and brands are in product_base/product_tags
        return {
            fdcId: barcodeToId(cleanBarcode),
            description: productData.product_name || `Product (${cleanBarcode})`,
            brandName: productData.brands,
            servingSize: effectiveServingSize,
            servingSizeUnit: effectiveServingSizeUnit,

            // Energy (adjusted for serving size)
            calories,

            // Macronutrients (prefer _serving values when available, otherwise _100g adjusted)
            protein: createNutrient('Protein', getNutrientValue('proteins'), 'g'),
            carbohydrates: createNutrient('Carbohydrates', getNutrientValue('carbohydrates'), 'g'),
            totalFat: createNutrient('Total Fat', getNutrientValue('fat'), 'g'),
            fiber: createNutrient('Fiber', getNutrientValue('fiber'), 'g'),
            sugars: createNutrient('Sugars', getNutrientValue('sugars'), 'g'),

            // Micronutrients (prefer _serving values when available, otherwise _100g adjusted)
            // Sodium: Open Food Facts stores in g, convert to mg for consistency
            sodium: createNutrient(
                'Sodium',
                (() => {
                    const sodiumValue = getNutrientValue('sodium');
                    return sodiumValue !== undefined ? sodiumValue * 1000 : undefined;
                })(),
                'mg'
            ),
            potassium: createNutrient('Potassium', getNutrientValue('potassium'), 'mg'),
            calcium: createNutrient('Calcium', getNutrientValue('calcium'), 'mg'),
            iron: createNutrient('Iron', getNutrientValue('iron'), 'mg'),
            vitaminC: createNutrient('Vitamin C', getNutrientValue('vitamin-c'), 'mg'),
            vitaminA: createNutrient('Vitamin A', getNutrientValue('vitamin-a'), 'µg'),
        };
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Failed to look up barcode: Unknown error');
    }
}
