"use client";
import type { Entry, Day } from "@/utils/model";
import { totalNutrition, formatNumber } from "@/utils/nutrition";
import { useStore } from "../shell/Store";
import { upsert } from "@/utils/db/client";
import { GoalBar, NutrientTable } from "./NutrientTable";
export function DailyTotals({ entries, day, title }: { entries: Entry[]; day: Day; title: string }) {
  const { data, run } = useStore();
  const { total } = totalNutrition(entries);
  const goal = data.settings.goals.calories;
  return (
    <aside className="facts" id="daily-nutrients">
      <h2>Nutrition facts</h2>
      <p className="muted">
        {title}, {entries.length === 1 ? "1 food" : `${entries.length} foods`}
      </p>
      <div className="facts-energy">
        <span>Calories</span>
        <strong>
          {formatNumber(total.calories, 0)}
          {goal && <small> of {formatNumber(goal, 0)}</small>}
        </strong>
      </div>
      {goal && total.calories !== null && <GoalBar value={total.calories} goal={goal} label="Calories" />}
      <div className="macro-summary">
        {(["protein", "carbohydrate", "fat"] as const).map((k) => (
          <div key={k}>
            <strong>
              {formatNumber(total[k])}
              <small> g</small>
            </strong>
            <span>{k === "carbohydrate" ? "Carbs" : k[0].toUpperCase() + k.slice(1)}</span>
          </div>
        ))}
      </div>
      <div className="water-row">
        <div>
          <strong>{formatNumber(day.water)} ml</strong>
          <small>Water</small>
        </div>
        <button
          onClick={() =>
            void run(
              [upsert("days", day.date, { ...day, water: Math.max(0, day.water - 250) })],
              "Water updated"
            ).catch(() => {})
          }
          aria-label="Remove 250 ml water"
        >
          −
        </button>
        <button
          onClick={() =>
            void run([upsert("days", day.date, { ...day, water: day.water + 250 })], "250 ml water added").catch(
              () => {}
            )
          }
        >
          + 250 ml
        </button>
      </div>
      <NutrientTable portions={entries} goals={data.settings.goals} />
      <p className="fine-print">A dash means no food reported it. Totals include known values only.</p>
    </aside>
  );
}
