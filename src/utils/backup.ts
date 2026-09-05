import { z } from "zod";
import { daySchema, entrySchema, foodSchema, recipeSchema, settingsSchema, type Snapshot } from "./model";
import { entryStatement } from "./db/operations";
import { upsert } from "./db/client";
import { validLogDate } from "./dates";
import { portionFactor } from "./units";
import type { Statement } from "./db/schema";
const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  data: z.object({
    entries: z.array(entrySchema).max(500000),
    foods: z.array(foodSchema).max(200),
    recipes: z.array(recipeSchema).max(10000),
    days: z.array(daySchema).max(50000),
    settings: settingsSchema,
    favorites: z.array(z.string()).max(10000),
  }),
});
export function download(name: string, content: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportBackup(data: Snapshot) {
  return JSON.stringify(
    {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: { ...data, settings: { ...data.settings, proxyToken: "" } },
    },
    null,
    2
  );
}
export function importBackup(raw: unknown, current: Snapshot): Statement[] {
  const { data } = backupSchema.parse(raw);
  const ids = new Set<string>();
  for (const day of data.days) validLogDate(day.date);
  for (const recipe of data.recipes)
    for (const p of recipe.ingredients) {
      const serving = p.food.servings.find((s) => s.id === p.servingId);
      if (!serving || Math.abs(portionFactor(p.quantity, p.unit, serving) - p.factor) > 1e-8)
        throw new Error("Backup contains inconsistent ingredient units.");
    }
  for (const entry of data.entries) {
    if (ids.has(entry.id)) throw new Error("Backup contains duplicate entry IDs.");
    ids.add(entry.id);
    validLogDate(entry.date);
    const serving = entry.food.servings.find((s) => s.id === entry.servingId);
    if (!serving || Math.abs(portionFactor(entry.quantity, entry.unit, serving) - entry.factor) > 1e-8)
      throw new Error("Backup contains inconsistent food units.");
    const day = data.days.find((d) => d.date === entry.date);
    if (!day?.meals.includes(entry.meal))
      throw new Error("Backup contains food entries without a matching day and meal.");
    if (!entry.food.servings.some((s) => s.id === entry.servingId))
      throw new Error("Backup contains an invalid serving.");
  }
  return [
    ...data.entries.map(entryStatement),
    ...data.recipes.map((r) => upsert("recipes", r.id, r)),
    ...data.days.map((d) => {
      const retainedMeals = current.entries.filter((e) => e.date === d.date && !ids.has(e.id)).map((e) => e.meal);
      const meals = [...new Set([...d.meals, ...retainedMeals])];
      const merged = daySchema.parse({ ...d, meals });
      return upsert("days", d.date, merged);
    }),
    ...data.foods.map((f) => ({
      sql: "INSERT OR REPLACE INTO foods(id,last_logged,payload) VALUES(?,?,?)",
      params: [f.id, f.fetchedAt, JSON.stringify(f)],
    })),
    { sql: "DELETE FROM foods WHERE id NOT IN (SELECT id FROM foods ORDER BY last_logged DESC LIMIT 200)" },
    ...data.favorites.map((id) => ({ sql: "INSERT OR IGNORE INTO favorites(id) VALUES(?)", params: [id] })),
    upsert("settings", "main", {
      ...data.settings,
      proxyUrl: current.settings.proxyUrl,
      proxyToken: current.settings.proxyToken,
    }),
  ];
}
