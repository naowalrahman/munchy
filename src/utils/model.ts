import { z } from "zod";
export const nutrientKeys = [
  "calories",
  "protein",
  "carbohydrate",
  "fat",
  "fiber",
  "sugar",
  "added_sugars",
  "saturated_fat",
  "trans_fat",
  "polyunsaturated_fat",
  "monounsaturated_fat",
  "cholesterol",
  "sodium",
  "potassium",
  "calcium",
  "iron",
  "vitamin_a",
  "vitamin_c",
  "vitamin_d",
] as const;
export type NutrientKey = (typeof nutrientKeys)[number];
export const nutrientsSchema = z.record(z.enum(nutrientKeys), z.number().finite().nonnegative().nullable());
export type Nutrients = z.infer<typeof nutrientsSchema>;
export const servingSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  amount: z.number().positive(),
  unit: z.enum(["g", "ml", "portion"]),
  nutrients: nutrientsSchema,
});
export type Serving = z.infer<typeof servingSchema>;
export const foodSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  brand: z.string().optional(),
  source: z.enum(["custom", "fatsecret", "recipe"]),
  url: z.string().optional(),
  fetchedAt: z.number(),
  cacheUntil: z.number(),
  servings: z.array(servingSchema).min(1),
});
export type Food = z.infer<typeof foodSchema>;
export const portionSchema = z.object({
  food: foodSchema,
  servingId: z.string(),
  quantity: z.number().positive().max(100000),
  unit: z.string(),
  factor: z.number().positive().max(100000),
});
export type Portion = z.infer<typeof portionSchema>;
export const entrySchema = portionSchema.extend({
  id: z.string(),
  date: z.iso.date(),
  meal: z.string().min(1),
  createdAt: z.number(),
});
export type Entry = z.infer<typeof entrySchema>;
export const recipeSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  servings: z.number().positive(),
  cookedGrams: z.number().positive().nullable(),
  ingredients: z.array(portionSchema).min(1),
  instructions: z.string(),
  tags: z.string(),
  updatedAt: z.number(),
});
export type Recipe = z.infer<typeof recipeSchema>;
export const daySchema = z.object({
  date: z.iso.date(),
  meals: z
    .array(z.string().min(1).max(40))
    .min(1)
    .max(12)
    .refine((v) => new Set(v.map((s) => s.toLowerCase())).size === v.length, "Meal names must be unique"),
  water: z.number().nonnegative(),
  weight: z.number().positive().nullable(),
  note: z.string(),
  complete: z.boolean(),
});
export type Day = z.infer<typeof daySchema>;
export const settingsSchema = z.object({
  defaultMeals: z.array(z.string().min(1).max(40)).min(1).max(12),
  goals: z.record(z.string(), z.number().positive()),
  proxyUrl: z.string(),
  proxyToken: z.string(),
  driveClientId: z.string().default(""),
  searchAgain: z.boolean().default(false),
});
export type Settings = z.infer<typeof settingsSchema>;
export interface Snapshot {
  entries: Entry[];
  foods: Food[];
  recipes: Recipe[];
  days: Day[];
  settings: Settings;
  favorites: string[];
}
export const defaultSettings: Settings = {
  defaultMeals: ["Breakfast", "Lunch", "Dinner", "Snacks"],
  goals: {},
  proxyUrl: "",
  proxyToken: "",
  driveClientId: "",
  searchAgain: false,
};
export const emptyNutrients = (): Nutrients => Object.fromEntries(nutrientKeys.map((k) => [k, null])) as Nutrients;
