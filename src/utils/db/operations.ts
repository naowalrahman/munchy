import { validLogDate } from "../dates";
import {
  type Day,
  daySchema,
  type Entry,
  entrySchema,
  type Food,
  foodSchema,
  isStorable,
  type Portion,
  type Recipe,
  recipeSchema,
  type Settings,
  type Snapshot,
  settingsSchema,
} from "../model";
import type { Statement } from "./schema";

// Every write goes through these builders, which validate first so an invalid payload never reaches disk.
const put = (table: "recipes" | "days" | "settings", id: string, payload: unknown): Statement => ({
  sql: `INSERT OR REPLACE INTO ${table}(id,payload) VALUES(?,?)`,
  params: [id, JSON.stringify(payload)],
});

export const saveEntry = (entry: Entry): Statement => ({
  sql: "INSERT OR REPLACE INTO entries(id,date,meal,food_id,payload) VALUES(?,?,?,?,?)",
  params: [entry.id, entry.date, entry.meal, entry.food.id, JSON.stringify(entrySchema.parse(entry))],
});

export const removeEntry = (id: string): Statement => ({ sql: "DELETE FROM entries WHERE id=?", params: [id] });

export function saveDay(day: Day): Statement {
  validLogDate(day.date);
  return put("days", day.date, daySchema.parse(day));
}

export const saveSettings = (settings: Settings) => put("settings", "main", settingsSchema.parse(settings));

export const saveRecipe = (recipe: Recipe) => put("recipes", recipe.id, recipeSchema.parse(recipe));

export function copyRecipe(recipe: Recipe) {
  const suffix = " (copy)";
  const room = (recipeSchema.shape.name.maxLength ?? Number.POSITIVE_INFINITY) - suffix.length;

  return saveRecipe({ ...recipe, id: crypto.randomUUID(), name: `${recipe.name.slice(0, room)}${suffix}` });
}

export const removeRecipe = (id: string): Statement => ({ sql: "DELETE FROM recipes WHERE id=?", params: [id] });

export const setFavorite = (foodId: string, favorite: boolean): Statement => ({
  sql: favorite ? "INSERT OR IGNORE INTO favorites(id) VALUES(?)" : "DELETE FROM favorites WHERE id=?",
  params: [foodId],
});

const putFood = (food: Food, lastLogged: number): Statement => ({
  sql: "INSERT OR REPLACE INTO foods(id,last_logged,payload) VALUES(?,?,?)",
  params: [food.id, lastLogged, JSON.stringify(foodSchema.parse(food))],
});

const evictFoods: Statement = {
  sql: "DELETE FROM foods WHERE id NOT IN (SELECT id FROM foods ORDER BY last_logged DESC, rowid DESC LIMIT 200)",
};

/** Recipes are not cached: their food is derived from the recipes table. */
export const cacheFood = (food: Food): Statement[] =>
  food.source === "recipe" ? [] : [putFood(food, Date.now()), evictFoods];

export const restoreFoods = (foods: Food[]): Statement[] => [
  ...foods.filter((f) => f.source !== "recipe").map((f) => putFood(f, f.fetchedAt)),
  evictFoods,
];

export function dayFor(data: Snapshot, date: string): Day {
  return (
    data.days.find((d) => d.date === date) ?? {
      date,
      meals: [...data.settings.defaultMeals],
      water: 0,
      weight: null,
      note: "",
      complete: false,
    }
  );
}

/** Logs fresh entries into `day`, which may carry new meals; the day is saved with them. */
export function logEntries(day: Day, logs: { portion: Portion; meal: string }[]): Statement[] {
  const statements = logs.flatMap(({ portion, meal }) => {
    if (!day.meals.includes(meal)) throw new Error("Choose an existing meal.");
    if (!isStorable(portion.food))
      throw new Error("Refresh this food before logging. Offline storage needs FatSecret caching permission.");
    const entry = { ...portion, id: crypto.randomUUID(), date: day.date, meal, createdAt: Date.now() };

    return [saveEntry(entry), ...cacheFood(portion.food)];
  });

  return [...statements, saveDay(day)];
}
