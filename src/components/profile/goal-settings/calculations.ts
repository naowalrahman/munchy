import { ACTIVITY_MULTIPLIERS } from "./constants";
import { ActivityLevel, MacroBreakdown, Sex, WeightGoal } from "./types";

/**
 * Calculate BMR using Mifflin-St Jeor Equation
 */
export function calculateBMR(weight_kg: number, height_cm: number, age: number, sex: Sex): number {
  // BMR = 10W + 6.25H - 5A + S
  // where S = 5 for men, -161 for women
  const sexOffset = sex === "male" ? 5 : -161;
  return 10 * weight_kg + 6.25 * height_cm - 5 * age + sexOffset;
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
export function calculateTDEE(bmr: number, activity_level: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activity_level];
}

/**
 * Calculate calorie goal based on weight goal
 */
export function calculateCalorieGoal(tdee: number, weight_goal: WeightGoal): number {
  switch (weight_goal) {
    case "lose":
      // 500 calorie deficit for ~1 lb/week weight loss
      return Math.round(tdee - 500);
    case "gain":
      // 300-500 calorie surplus for weight gain
      return Math.round(tdee + 400);
    case "maintain":
    default:
      return Math.round(tdee);
  }
}

/**
 * Calculate macronutrient goals based on calorie goal
 * Standard macro split: 30% protein, 40% carbs, 30% fat
 */
export function calculateMacros(calorieGoal: number): MacroBreakdown {
  // Protein: 30% of calories, 4 calories per gram
  const proteinCalories = calorieGoal * 0.3;
  const protein = Math.round(proteinCalories / 4);

  // Carbs: 40% of calories, 4 calories per gram
  const carbCalories = calorieGoal * 0.4;
  const carbs = Math.round(carbCalories / 4);

  // Fat: 30% of calories, 9 calories per gram
  const fatCalories = calorieGoal * 0.3;
  const fat = Math.round(fatCalories / 9);

  return { protein, carbs, fat };
}
