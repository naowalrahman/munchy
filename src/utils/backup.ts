import { z } from "zod";
import { validLogDate } from "./dates";
import { restoreFoods, saveDay, saveEntry, saveRecipe, saveSettings, setFavorite } from "./db/operations";
import type { Statement } from "./db/schema";
import {
  daySchema,
  entrySchema,
  foodSchema,
  nutrientKeys,
  type Portion,
  recipeSchema,
  type Snapshot,
  settingsSchema,
} from "./model";
import { portionNutrition } from "./nutrition";
import { portionFactor } from "./units";

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

export type Backup = z.infer<typeof backupSchema>["data"];

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

export function exportCsv(data: Snapshot) {
  const cell = (value: string | number) => {
    const text = String(value);
    return `"${/^[=+@-]/.test(text) ? "'" : ""}${text.replaceAll('"', '""')}"`;
  };

  const rows = [
    ["Date", "Meal", "Food", "Quantity", "Unit", ...nutrientKeys],
    ...data.entries.map((e) => {
      const n = portionNutrition(e);
      return [e.date, e.meal, e.food.name, e.quantity, e.unit, ...nutrientKeys.map((k) => n[k] ?? "")];
    }),
  ];

  return rows.map((r) => r.map(cell).join(",")).join("\n");
}

function consistent(p: Portion) {
  const serving = p.food.servings.find((s) => s.id === p.servingId);
  return serving !== undefined && Math.abs(portionFactor(p.quantity, p.unit, serving) - p.factor) <= 1e-8;
}

/** Validates a backup file, including the invariants its schema can't express. */
export function parseBackup(raw: unknown): Backup {
  const { data } = backupSchema.parse(raw);
  const days = new Map(data.days.map((d) => [d.date, d]));
  for (const day of data.days) validLogDate(day.date);
  for (const recipe of data.recipes)
    if (!recipe.ingredients.every(consistent)) throw new Error("Backup contains inconsistent ingredient units.");
  const ids = new Set<string>();

  for (const entry of data.entries) {
    if (ids.has(entry.id)) throw new Error("Backup contains duplicate entry IDs.");
    ids.add(entry.id);
    validLogDate(entry.date);
    if (!consistent(entry)) throw new Error("Backup contains inconsistent food units.");
    if (!days.get(entry.date)?.meals.includes(entry.meal))
      throw new Error("Backup contains food entries without a matching day and meal.");
  }

  return data;
}

/** Merges a backup into the current diary: matching records are replaced, everything else stays. */
export function importStatements(backup: Backup, current: Snapshot): Statement[] {
  const imported = new Set(backup.entries.map((e) => e.id));
  const retained = new Map<string, Set<string>>();
  for (const e of current.entries)
    if (!imported.has(e.id)) retained.set(e.date, (retained.get(e.date) ?? new Set()).add(e.meal));

  return [
    ...backup.entries.map(saveEntry),
    ...backup.recipes.map(saveRecipe),
    ...backup.days.map((d) =>
      saveDay({ ...d, meals: [...d.meals, ...[...(retained.get(d.date) ?? [])].filter((m) => !d.meals.includes(m))] })
    ),
    ...restoreFoods(backup.foods),
    ...backup.favorites.map((id) => setFavorite(id, true)),
    saveSettings({
      ...backup.settings,
      proxyUrl: current.settings.proxyUrl,
      proxyToken: current.settings.proxyToken,
      driveClientId: current.settings.driveClientId,
    }),
  ];
}
