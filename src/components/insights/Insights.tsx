"use client";

import { useState } from "react";
import { isLogDate, shiftDate, today } from "@/utils/dates";
import { insights } from "@/utils/insights";
import type { NutrientKey } from "@/utils/model";
import { formatNumber, nutrients } from "@/utils/nutrition";
import { NutrientTable } from "../diary/NutrientTable";
import { useStore } from "../shell/Store";
import { NutrientSelect } from "../ui/NutrientSelect";

const modes = { average: "Averages per logged day", total: "Totals for the range" } as const;
const mealColumns = ["calories", "protein", "fiber"] as const;

export function Insights() {
  const { data } = useStore();
  const [start, setStart] = useState(() => shiftDate(today(), -6));
  const [end, setEnd] = useState(today);
  const [completeOnly, setCompleteOnly] = useState(false);
  const [selected, setSelected] = useState<NutrientKey>("calories");
  const [mode, setMode] = useState<keyof typeof modes>("average");

  const view = insights(data, { start, end, completeOnly }, selected);
  const meta = nutrients[selected];
  const max = Math.max(1, ...view.series.map((s) => s.value ?? 0));
  const logged = `${view.dates.length} logged ${view.dates.length === 1 ? "day" : "days"}`;

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Insights</h1>
          <p>Nutrients and patterns across a range of days.</p>
        </div>
        <div className="range-controls">
          <label>
            From
            <input
              type="date"
              value={start}
              max={end}
              onChange={(e) => {
                if (isLogDate(e.target.value)) setStart(e.target.value);
              }}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={end}
              min={start}
              max={today()}
              onChange={(e) => {
                if (isLogDate(e.target.value)) setEnd(e.target.value);
              }}
            />
          </label>
        </div>
      </div>
      <div className="insight-controls">
        <div className="segmented">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              aria-pressed={start === shiftDate(today(), 1 - days) && end === today()}
              onClick={() => {
                setStart(shiftDate(today(), 1 - days));
                setEnd(today());
              }}
            >
              {days} days
            </button>
          ))}
        </div>
        <label className="check-label">
          <input type="checkbox" checked={completeOnly} onChange={(e) => setCompleteOnly(e.target.checked)} />
          Only fully logged days
        </label>
        <select
          aria-label="Nutrition aggregation"
          value={mode}
          onChange={(e) => setMode(e.target.value === "total" ? "total" : "average")}
        >
          {Object.entries(modes).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="insight-strip">
        <div>
          <strong>
            {view.dates.length}
            <small> / {view.rangeDays}</small>
          </strong>
          <span>Days with food</span>
        </div>
        <div>
          <strong>{view.foodCount}</strong>
          <span>Different foods</span>
        </div>
        <div>
          <strong>{view.coverage}%</strong>
          <span>Nutrient coverage</span>
        </div>
        <div>
          <strong>
            {formatNumber(view.proteinPerDay)}
            <small> g</small>
          </strong>
          <span>Protein / logged day</span>
        </div>
      </div>
      {!view.entries.length && (
        <p className="empty-day">
          No foods logged in this range. Choose another range or start logging. Days without entries never count as
          zero.
        </p>
      )}
      <div className="insights-layout">
        <section>
          <div className="section-head">
            <h2>Per day</h2>
            <NutrientSelect label="Chart nutrient" value={selected} onChange={setSelected} />
          </div>
          <p className="muted">
            {meta.label} in {meta.unit} for each logged day, from reported values only.
          </p>
          <div
            className="trend"
            role="img"
            aria-label={`${meta.label} trend: ${view.series.map((s) => `${s.date}: ${formatNumber(s.value)}`).join(", ") || "No data"}`}
          >
            {view.series.map((s) => (
              <div className="trend-column" key={s.date}>
                <span>{formatNumber(s.value, 0)}</span>
                <div style={{ height: `${Math.max(2, ((s.value ?? 0) / max) * 160)}px` }} />
                <small>{s.date.slice(5)}</small>
              </div>
            ))}
          </div>
          <div className="section-head">
            <h2>Top sources</h2>
            <span className="muted">{meta.label}</span>
          </div>
          {view.top.map((food) => (
            <div className="contributor" key={food.id}>
              <span>{food.name}</span>
              <b>
                {formatNumber(food.value)} {meta.unit}
              </b>
              <div className="bar" aria-hidden="true">
                <span style={{ width: `${(food.value / (view.top[0]?.value || 1)) * 100}%` }} />
              </div>
            </div>
          ))}
          {!view.top.length && <p className="muted">No reported values for this nutrient yet.</p>}
          <h2 className="spaced-heading">Meal patterns</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Meal</th>
                  <th>Logged days</th>
                  <th>Avg kcal</th>
                  <th>Protein, g</th>
                  <th>Fiber, g</th>
                </tr>
              </thead>
              <tbody>
                {view.meals.map(({ meal, loggedDays, values }) => (
                  <tr key={meal}>
                    <th>{meal}</th>
                    <td>{loggedDays}</td>
                    {mealColumns.map((k) => (
                      <td key={k}>{formatNumber(values[k])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fine-print">
            Averages use only the days that contain that meal. Renamed meals appear separately.
          </p>
          <h2 className="spaced-heading">Water, weight, and notes</h2>
          <p>
            {view.weightChange
              ? `Weight change: ${formatNumber(view.weightChange.change)} kg across ${view.weightChange.measurements} measurements.`
              : "Log at least two weights in the diary to see a change."}
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Water, ml</th>
                  <th>Weight, kg</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {view.days.map((d) => (
                  <tr key={d.date}>
                    <th>
                      {d.date}
                      {d.complete ? " ✓" : ""}
                    </th>
                    <td>{formatNumber(d.water)}</td>
                    <td>{formatNumber(d.weight)}</td>
                    <td>{d.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="facts">
          <h2>Nutrition facts</h2>
          <p className="muted">
            {mode === "average" ? `Average of ${logged}.` : `Total across ${logged}.`} Tap a nutrient to see its
            sources.
          </p>
          <NutrientTable
            portions={view.entries}
            goals={mode === "average" ? data.settings.goals : {}}
            divisor={mode === "average" ? Math.max(1, view.dates.length) : 1}
            onSelect={setSelected}
          />
          <p className="fine-print">
            Coverage counts reported nutrient fields, not diet quality. Missing values can understate totals. Targets
            are set in Settings.
          </p>
        </aside>
      </div>
    </>
  );
}
