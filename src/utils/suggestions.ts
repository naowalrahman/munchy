import type { Entry, Food, Snapshot } from "./model";
export function suggestions(data: Snapshot, meal: string, date: string): Entry[] {
  const scores = new Map<string, { entry: Entry; score: number }>();
  for (const e of data.entries) {
    if (e.date > date || e.meal.toLowerCase() !== meal.toLowerCase()) continue;
    const available = e.food.source !== "fatsecret" || e.food.cacheUntil > Date.now();
    if (!available) continue;
    const age = Math.max(0, (new Date(date).getTime() - new Date(e.date).getTime()) / 86400000);
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
export function availableFood(food: Food) {
  return food.source !== "fatsecret" || food.cacheUntil > Date.now();
}
