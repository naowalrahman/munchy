"use client";

import { useState } from "react";
import { saveDay } from "@/utils/db/operations";
import type { Day, Entry, NutrientKey } from "@/utils/model";
import { formatNumber, totalNutrition } from "@/utils/nutrition";
import { useStore } from "../shell/Store";
import { NutrientSources } from "./NutrientSources";
import { GoalBar, NutrientTable } from "./NutrientTable";

export function DailyTotals({ entries, day, title }: { entries: Entry[]; day: Day; title: string }) {
  const { data, run } = useStore();
  const [selected, setSelected] = useState<NutrientKey | null>(null);

  const { total } = totalNutrition(entries);
  const setWater = (water: number, message: string) => void run(() => [saveDay({ ...day, water })], message);
  const goal = data.settings.goals.calories;

  return (
    <aside className="facts" id="daily-nutrients">
      <h2>Nutrition facts</h2>
      <p className="muted">
        {title}, {entries.length === 1 ? "1 food" : `${entries.length} foods`}
      </p>
      <button
        className="facts-energy fact-button"
        onClick={() => setSelected("calories")}
        aria-label="View calorie food sources"
        aria-haspopup="dialog"
      >
        <span>Calories</span>
        <strong>
          {formatNumber(total.calories, 0)}
          {goal && <small> of {formatNumber(goal, 0)}</small>}
        </strong>
      </button>
      {goal && total.calories !== null && <GoalBar value={total.calories} goal={goal} label="Calories" />}
      <div className="macro-summary">
        {(["protein", "carbohydrate", "fat"] as const).map((k) => (
          <button
            className="fact-button"
            key={k}
            onClick={() => setSelected(k)}
            aria-label={`View ${k} food sources`}
            aria-haspopup="dialog"
          >
            <strong>
              {formatNumber(total[k])}
              <small> g</small>
            </strong>
            <span>{k === "carbohydrate" ? "Carbs" : k.charAt(0).toUpperCase() + k.slice(1)}</span>
          </button>
        ))}
      </div>
      <div className="water-row">
        <div>
          <strong>{formatNumber(day.water)} ml</strong>
          <small>Water</small>
        </div>
        <button
          onClick={() => setWater(Math.max(0, day.water - 250), "Water updated")}
          aria-label="Remove 250 ml water"
        >
          −
        </button>
        <button onClick={() => setWater(day.water + 250, "250 ml water added")}>+ 250 ml</button>
      </div>
      <p className="facts-hint">Tap any nutrient to see its food sources.</p>
      <NutrientTable portions={entries} goals={data.settings.goals} onSelect={setSelected} />
      <p className="fine-print">A dash means no food reported it. Totals include known values only.</p>
      {selected && (
        <NutrientSources
          entries={entries}
          date={day.date}
          selected={selected}
          onSelect={setSelected}
          onClose={() => setSelected(null)}
        />
      )}
    </aside>
  );
}
