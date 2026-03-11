export interface IngredientTotals {
  calories: number;
  protein: number;
  carbohydrates: number;
  total_fat: number;
}

export function aggregateIngredientTotals(
  ingredients: Array<{
    calories?: number;
    protein?: number | null;
    carbohydrates?: number | null;
    total_fat?: number | null;
  }>
): IngredientTotals {
  const initial: IngredientTotals = { calories: 0, protein: 0, carbohydrates: 0, total_fat: 0 };
  return ingredients.reduce<IngredientTotals>(
    (acc, ing) => ({
      calories: acc.calories + (ing.calories ?? 0),
      protein: acc.protein + (ing.protein ?? 0),
      carbohydrates: acc.carbohydrates + (ing.carbohydrates ?? 0),
      total_fat: acc.total_fat + (ing.total_fat ?? 0),
    }),
    initial
  );
}
