"use client";
import type { Entry, Day } from "@/utils/model";
import { totalNutrition, formatNumber } from "@/utils/nutrition";
import { useStore } from "../shell/Store";
import { upsert } from "@/utils/db/client";
import { NutrientTable } from "./NutrientTable";
export function DailyTotals({ entries, day }: { entries: Entry[]; day: Day }) {
  const { data, run } = useStore();
  const { total } = totalNutrition(entries);
  return (
    <aside className="daily-totals" id="daily-nutrients">
      <h2>Your day, in detail</h2>
      <div className="energy-total">
        <strong>{formatNumber(total.calories, 0)}</strong>
        <span>
          kcal logged
          {data.settings.goals.calories && <small>of {formatNumber(data.settings.goals.calories, 0)} kcal goal</small>}
        </span>
      </div>
      <div className="macro-summary">
        {(["protein", "carbohydrate", "fat"] as const).map((k) => (
          <div className={k} key={k}>
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
      <p className="fine-print">— means not reported. Partial totals include only known values.</p>
    </aside>
  );
}
