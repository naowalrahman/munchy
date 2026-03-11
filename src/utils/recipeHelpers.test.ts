import { describe, expect, test } from "bun:test";
import { aggregateIngredientTotals } from "./recipeHelpers";

describe("aggregateIngredientTotals", () => {
  test("sums calories, protein, carbs, and fat from ingredients", () => {
    const ingredients = [
      { calories: 100, protein: 5, carbohydrates: 10, total_fat: 2 },
      { calories: 50, protein: 2, carbohydrates: 8, total_fat: 1 },
    ];
    const result = aggregateIngredientTotals(ingredients);
    expect(result.calories).toBe(150);
    expect(result.protein).toBe(7);
    expect(result.carbohydrates).toBe(18);
    expect(result.total_fat).toBe(3);
  });

  test("handles null values as zero", () => {
    const ingredients = [
      { calories: 100, protein: null, carbohydrates: 10, total_fat: null },
      { calories: 50, protein: 5, carbohydrates: null, total_fat: 2 },
    ];
    const result = aggregateIngredientTotals(ingredients);
    expect(result.calories).toBe(150);
    expect(result.protein).toBe(5);
    expect(result.carbohydrates).toBe(10);
    expect(result.total_fat).toBe(2);
  });

  test("returns zeros for empty array", () => {
    const result = aggregateIngredientTotals([]);
    expect(result.calories).toBe(0);
    expect(result.protein).toBe(0);
    expect(result.carbohydrates).toBe(0);
    expect(result.total_fat).toBe(0);
  });
});
