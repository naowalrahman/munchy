import { describe, expect, test } from "bun:test";
import { getFoodNutrition } from "./food";

describe("Enhanced USDA Nutrient Parser", () => {
  test("should fetch and map micronutrients (Fiber, Sodium, Potassium, Vitamins) correctly", async () => {
    // We mock fetch to return a sample response with full nutrients
    const mockUSDA_Response = {
      fdcId: 12345,
      description: "Apple",
      servingSize: 100,
      servingSizeUnit: "g",
      foodNutrients: [
        { nutrientId: 1008, amount: 52 }, // Energy kcal
        { nutrientId: 1079, amount: 2.4 }, // Fiber
        { nutrientId: 1093, amount: 1 }, // Sodium
        { nutrientId: 1092, amount: 107 }, // Potassium
        { nutrientId: 1162, amount: 4.6 }, // Vitamin C
        { nutrientId: 1106, amount: 3 }, // Vitamin A
      ],
    };

    global.fetch = () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockUSDA_Response),
      }) as Promise<Response>;

    const originalApiKey = process.env.USDA_API_KEY;
    process.env.USDA_API_KEY = "test-key";

    try {
      const data = await getFoodNutrition(12345);

      expect(data.calories).toBe(52);
      expect(data.fiber?.amount).toBe(2.4);
      expect(data.sodium?.amount).toBe(1);
      expect(data.potassium?.amount).toBe(107);
      expect(data.vitaminC?.amount).toBe(4.6);
      expect(data.vitaminA?.amount).toBe(3);
    } finally {
      process.env.USDA_API_KEY = originalApiKey;
    }
  });
});
