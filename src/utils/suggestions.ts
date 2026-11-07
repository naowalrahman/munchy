import { daysBetween } from "./dates";
import { type Entry, isStorable, type Snapshot } from "./model";

/** Foods most often logged to this meal, weighted toward recent days. */
export function suggestions(data: Snapshot, meal: string, date: string): Entry[] {
  const scores = new Map<string, { entry: Entry; score: number }>();

  for (const e of data.entries) {
    if (e.date > date || e.meal.toLowerCase() !== meal.toLowerCase() || !isStorable(e.food)) continue;
    const age = Math.max(0, daysBetween(e.date, date));
    const old = scores.get(e.food.id);
    scores.set(e.food.id, {
      entry: old && old.entry.createdAt > e.createdAt ? old.entry : e,
      score: (old?.score ?? 0) + 1 / (1 + age / 14),
    });
  }

  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => s.entry);
}

/** The most recent portion of a food, optionally within one meal, to prefill the next one. */
export function lastPortion(data: Snapshot, foodId: string, meal?: string | undefined): Entry | undefined {
  let latest: Entry | undefined;
  for (const e of data.entries)
    if (e.food.id === foodId && (!meal || e.meal === meal) && (!latest || e.createdAt > latest.createdAt)) latest = e;

  return latest;
}
