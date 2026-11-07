import { daysBetween } from "./dates";
import { type Entry, type NutrientKey, nutrientKeys, type Snapshot } from "./model";
import { nutrientSources, totalNutrition } from "./nutrition";

function group(entries: Entry[], key: (e: Entry) => string) {
  const groups = new Map<string, Entry[]>();

  for (const e of entries) {
    const list = groups.get(key(e));
    if (list) list.push(e);
    else groups.set(key(e), [e]);
  }

  return groups;
}

const perDay = (value: number | null, days: number) => (value === null ? null : value / Math.max(1, days));

/** Everything the Insights page shows for a date range; days without entries never count as zero. */
export function insights(
  data: Snapshot,
  range: { start: string; end: string; completeOnly: boolean },
  key: NutrientKey
) {
  const { start, end, completeOnly } = range;
  const days = data.days.filter((d) => d.date >= start && d.date <= end).sort((a, b) => b.date.localeCompare(a.date));
  const complete = new Set(days.filter((d) => d.complete).map((d) => d.date));

  const entries = data.entries.filter(
    (e) => e.date >= start && e.date <= end && (!completeOnly || complete.has(e.date))
  );

  const byDate = group(entries, (e) => e.date);
  const dates = [...byDate.keys()].sort();
  const { total, coverage, count } = totalNutrition(entries);
  const sources = nutrientSources(entries, key);
  const weights = days.flatMap((d) => (d.weight === null ? [] : [d.weight])).reverse();
  const [firstWeight, ...laterWeights] = weights;
  const lastWeight = laterWeights.at(-1);

  return {
    entries,
    days,
    dates,
    rangeDays: start <= end ? daysBetween(start, end) + 1 : 0,
    foodCount: new Set(entries.map((e) => e.food.id)).size,
    coverage: count
      ? Math.round((nutrientKeys.reduce((sum, k) => sum + coverage[k], 0) / (count * nutrientKeys.length)) * 100)
      : 0,
    proteinPerDay: perDay(total.protein, dates.length),
    series: dates.map((date) => ({ date, value: totalNutrition(byDate.get(date) ?? []).total[key] })),
    top: [...sources.ranked, ...sources.zero].slice(0, 8),
    meals: [...group(entries, (e) => e.meal)].map(([meal, list]) => {
      const n = totalNutrition(list).total;
      const loggedDays = new Set(list.map((e) => e.date)).size;

      return {
        meal,
        loggedDays,
        values: {
          calories: perDay(n.calories, loggedDays),
          protein: perDay(n.protein, loggedDays),
          fiber: perDay(n.fiber, loggedDays),
        },
      };
    }),
    weightChange:
      firstWeight !== undefined && lastWeight !== undefined
        ? { change: lastWeight - firstWeight, measurements: weights.length }
        : null,
  };
}
