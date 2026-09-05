import type { Statement } from "./schema";
import { upsert } from "./client";
import {
  entrySchema,
  daySchema,
  foodSchema,
  type Entry,
  type Food,
  type Snapshot,
  type Day,
  type Portion,
} from "../model";
import { validLogDate } from "../dates";
export const entryStatement = (entry: Entry): Statement => ({
  sql: "INSERT OR REPLACE INTO entries(id,date,meal,food_id,payload) VALUES(?,?,?,?,?)",
  params: [entry.id, entry.date, entry.meal, entry.food.id, JSON.stringify(entrySchema.parse(entry))],
});
export function dayFor(data: Snapshot, date: string): Day {
  validLogDate(date);
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
export function cacheFood(food: Food): Statement[] {
  foodSchema.parse(food);
  if (food.source === "fatsecret" && food.cacheUntil <= Date.now()) return [];
  return [
    {
      sql: "INSERT OR REPLACE INTO foods(id,last_logged,payload) VALUES(?,?,?)",
      params: [food.id, Date.now(), JSON.stringify(food)],
    },
    { sql: "DELETE FROM foods WHERE id NOT IN (SELECT id FROM foods ORDER BY last_logged DESC, rowid DESC LIMIT 200)" },
  ];
}
export function logEntries(data: Snapshot, entries: Entry[]): Statement[] {
  const statements: Statement[] = [];
  const days = new Map<string, Day>();
  for (const entry of entries) {
    validLogDate(entry.date);
    const day = days.get(entry.date) ?? dayFor(data, entry.date);
    if (!day.meals.includes(entry.meal)) throw new Error("Choose an existing meal.");
    if (entry.food.source === "fatsecret" && entry.food.cacheUntil <= Date.now())
      throw new Error("Refresh this food before logging. Offline storage needs FatSecret caching permission.");
    days.set(entry.date, day);
    statements.push(entryStatement(entry), ...cacheFood(entry.food));
  }
  for (const day of days.values()) statements.push(upsert("days", day.date, day));
  return statements;
}
export function saveDay(data: Snapshot, day: Day) {
  validLogDate(day.date);
  daySchema.parse(day);
  if (new Set(day.meals.map((m) => m.toLowerCase())).size !== day.meals.length)
    throw new Error("Meal names must be unique.");
  const lost = data.entries.filter((e) => e.date === day.date && !day.meals.includes(e.meal));
  if (lost.length) throw new Error("Move foods out of a meal before removing it.");
  return upsert("days", day.date, day);
}

export function newEntry(portion: Portion, date: string, meal: string): Entry {
  return { ...portion, id: crypto.randomUUID(), date, meal, createdAt: Date.now() };
}
