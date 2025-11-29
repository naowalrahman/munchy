'use server';

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

interface OpenFoodFactsResponse {
    code: string;
    status: number;
    status_verbose: string;
    product?: OpenFoodFactsProduct;
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
 * Look up a food product by barcode using the Open Food Facts API
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

    const url = `https://world.openfoodfacts.org/api/v2/product/${cleanBarcode}.json`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Munchy - Food Tracking App',
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error(`Open Food Facts API error: ${response.status} ${response.statusText}`);
        }

        const data: OpenFoodFactsResponse = await response.json();

        if (data.status === 0 || !data.product) {
            throw new Error('Product not found. Try searching by name instead.');
        }

        const product = data.product;
        const nutriments = product.nutriments || {};

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
        let servingSize: number | undefined;
        let servingSizeUnit: string | undefined;
        
        if (product.serving_quantity) {
            servingSize = product.serving_quantity;
            servingSizeUnit = 'g';
        } else if (product.serving_size) {
            // Try to extract number and unit from serving size string
            const match = product.serving_size.match(/^([\d.]+)\s*(\w+)?/);
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

        // Helper function to adjust nutrient values for serving size
        const adjustNutrientValue = (value: number | undefined): number | undefined => {
            if (value === undefined || value === null) return undefined;
            return value * servingSizeMultiplier;
        };

        // Get calories - prefer per-serving value if available, otherwise use per-100g and adjust
        let calories: number;
        if (nutriments['energy-kcal_serving'] !== undefined) {
            // Use per-serving value directly if available
            calories = nutriments['energy-kcal_serving'];
        } else {
            // Use per-100g value and adjust for serving size
            const caloriesPer100g = nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'] ?? 0;
            calories = caloriesPer100g * servingSizeMultiplier;
        }

        // Build nutritional data matching the NutritionalData interface
        // Values are adjusted to per-serving size to match USDA API behavior
        return {
            fdcId: barcodeToId(cleanBarcode),
            description: product.product_name || `Product (${cleanBarcode})`,
            brandName: product.brands,
            servingSize: effectiveServingSize,
            servingSizeUnit: effectiveServingSizeUnit,

            // Energy (adjusted for serving size)
            calories,

            // Macronutrients (adjusted for serving size)
            protein: createNutrient('Protein', adjustNutrientValue(nutriments.proteins_100g ?? nutriments.proteins), 'g'),
            carbohydrates: createNutrient('Carbohydrates', adjustNutrientValue(nutriments.carbohydrates_100g ?? nutriments.carbohydrates), 'g'),
            totalFat: createNutrient('Total Fat', adjustNutrientValue(nutriments.fat_100g ?? nutriments.fat), 'g'),
            fiber: createNutrient('Fiber', adjustNutrientValue(nutriments.fiber_100g ?? nutriments.fiber), 'g'),
            sugars: createNutrient('Sugars', adjustNutrientValue(nutriments.sugars_100g ?? nutriments.sugars), 'g'),

            // Micronutrients (adjusted for serving size)
            // Sodium: Open Food Facts stores in g, convert to mg for consistency
            sodium: createNutrient(
                'Sodium',
                nutriments.sodium_100g !== undefined 
                    ? adjustNutrientValue(nutriments.sodium_100g * 1000)
                    : adjustNutrientValue(nutriments.sodium ? nutriments.sodium * 1000 : undefined),
                'mg'
            ),
            potassium: createNutrient('Potassium', adjustNutrientValue(nutriments.potassium_100g ?? nutriments.potassium), 'mg'),
            calcium: createNutrient('Calcium', adjustNutrientValue(nutriments.calcium_100g ?? nutriments.calcium), 'mg'),
            iron: createNutrient('Iron', adjustNutrientValue(nutriments.iron_100g ?? nutriments.iron), 'mg'),
            vitaminC: createNutrient('Vitamin C', adjustNutrientValue(nutriments['vitamin-c_100g'] ?? nutriments['vitamin-c']), 'mg'),
            vitaminA: createNutrient('Vitamin A', adjustNutrientValue(nutriments['vitamin-a_100g'] ?? nutriments['vitamin-a']), 'µg'),
        };
    } catch (error) {
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Failed to look up barcode: Unknown error');
    }
}
