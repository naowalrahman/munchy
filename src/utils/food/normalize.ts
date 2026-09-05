import { z } from "zod";
import { emptyNutrients, foodSchema, nutrientKeys, type Food, type Serving } from "../model";
const record = z.record(z.string(), z.unknown());
const list = (value: unknown) => (value === undefined ? [] : Array.isArray(value) ? value : [value]);
const numeric = (v: unknown) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
export function normalizeFood(raw: unknown, cacheSeconds = 0): Food {
  const root = record.parse(raw);
  const food = record.parse(root.food);
  const servings = list(record.parse(food.servings).serving).map((rawServing): Serving => {
    const s = record.parse(rawServing);
    const n = emptyNutrients();
    for (const k of nutrientKeys) n[k] = numeric(s[k]);
    const metric = numeric(s.metric_serving_amount);
    const unit = String(s.metric_serving_unit);
    return {
      id: String(s.serving_id),
      label: String(s.serving_description),
      amount: metric && ["g", "ml", "oz"].includes(unit) ? metric * (unit === "oz" ? 28.349523125 : 1) : 1,
      unit: metric && ["g", "ml", "oz"].includes(unit) ? (unit === "ml" ? "ml" : "g") : "portion",
      nutrients: n,
    };
  });
  return foodSchema.parse({
    id: `fs:${food.food_id}`,
    name: food.food_name,
    brand: food.brand_name,
    source: "fatsecret",
    url: food.food_url,
    fetchedAt: Date.now(),
    cacheUntil: Date.now() + cacheSeconds * 1000,
    servings,
  });
}
export interface SearchResult {
  id: string;
  name: string;
  brand?: string;
  description: string;
}
export function normalizeSearch(raw: unknown): { foods: SearchResult[]; total: number } {
  const root = record.parse(raw);
  const data = record.parse(root.foods ?? {});
  return {
    foods: list(data.food).map((f) => {
      const r = record.parse(f);
      return {
        id: `fs:${r.food_id}`,
        name: String(r.food_name),
        brand: r.brand_name ? String(r.brand_name) : undefined,
        description: String(r.food_description ?? ""),
      };
    }),
    total: Number(data.total_results ?? 0),
  };
}
