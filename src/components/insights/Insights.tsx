"use client";
import { useState } from "react";
import { useStore } from "../shell/Store";
import { today, shiftDate } from "@/utils/dates";
import { totalNutrition, nutrients, formatNumber, portionNutrition } from "@/utils/nutrition";
import { nutrientKeys, type NutrientKey } from "@/utils/model";
import { NutrientTable } from "../diary/NutrientTable";
export function Insights() {
  const { data } = useStore();
  const [start, setStart] = useState(() => shiftDate(today(), -6));
  const [end, setEnd] = useState(today);
  const [completeOnly, setCompleteOnly] = useState(false);
  const [selected, setSelected] = useState<NutrientKey>("calories");
  const [mode, setMode] = useState<"average" | "total">("average");
  const dateDays = data.days.filter((d) => d.date >= start && d.date <= end);
  const entries = data.entries.filter(
    (e) => e.date >= start && e.date <= end && (!completeOnly || dateDays.find((d) => d.date === e.date)?.complete)
  );
  const dates = [...new Set(entries.map((e) => e.date))].sort();
  const divisor = mode === "average" ? Math.max(1, dates.length) : 1;
  const { total, coverage, count } = totalNutrition(entries);
  const top = Object.values(
    entries.reduce<Record<string, { name: string; value: number }>>((acc, e) => {
      const value = portionNutrition(e)[selected];
      if (value !== null) {
        acc[e.food.id] ??= { name: e.food.name, value: 0 };
        acc[e.food.id].value += value;
      }
      return acc;
    }, {})
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const series = dates.map((date) => ({
    date,
    value: totalNutrition(entries.filter((e) => e.date === date)).total[selected],
  }));
  const max = Math.max(1, ...series.map((s) => s.value ?? 0));
  const meals = [...new Set(entries.map((e) => e.meal))];
  const knownCoverage = count
    ? Math.round((nutrientKeys.reduce((sum, k) => sum + coverage[k], 0) / (count * nutrientKeys.length)) * 100)
    : 0;
  const daysInRange =
    start <= end
      ? Math.round((new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86400000) + 1
      : 0;
  const weightDays = dateDays.filter((d) => d.weight !== null).sort((a, b) => a.date.localeCompare(b.date));
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
                if (e.target.value) setStart(e.target.value);
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
                if (e.target.value && e.target.value <= today()) setEnd(e.target.value);
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
          onChange={(e) => setMode(e.target.value as "average" | "total")}
        >
          <option value="average">Averages per logged day</option>
          <option value="total">Totals for the range</option>
        </select>
      </div>
      <div className="insight-strip">
        <div>
          <strong>
            {dates.length}
            <small> / {daysInRange}</small>
          </strong>
          <span>Days with food</span>
        </div>
        <div>
          <strong>{new Set(entries.map((e) => e.food.id)).size}</strong>
          <span>Different foods</span>
        </div>
        <div>
          <strong>{knownCoverage}%</strong>
          <span>Nutrient coverage</span>
        </div>
        <div>
          <strong>
            {formatNumber(total.protein === null ? null : total.protein / Math.max(1, dates.length))}
            <small> g</small>
          </strong>
          <span>Protein / logged day</span>
        </div>
      </div>
      {!entries.length && (
        <p className="empty-day">
          No foods logged in this range. Choose another range or start logging. Days without entries never count as
          zero.
        </p>
      )}
      <div className="insights-layout">
        <section>
          <div className="section-head">
            <h2>Per day</h2>
            <select
              aria-label="Chart nutrient"
              value={selected}
              onChange={(e) => setSelected(e.target.value as NutrientKey)}
            >
              {nutrientKeys.map((k) => (
                <option key={k} value={k}>
                  {nutrients[k].label}
                </option>
              ))}
            </select>
          </div>
          <p className="muted">
            {nutrients[selected].label} in {nutrients[selected].unit} for each logged day, from reported values only.
          </p>
          <div
            className="trend"
            role="img"
            aria-label={`${nutrients[selected].label} trend: ${series.map((s) => `${s.date}: ${formatNumber(s.value)}`).join(", ") || "No data"}`}
          >
            {series.map((s) => (
              <div className="trend-column" key={s.date}>
                <span>{formatNumber(s.value, 0)}</span>
                <div style={{ height: `${Math.max(2, ((s.value ?? 0) / max) * 160)}px` }} />
                <small>{s.date.slice(5)}</small>
              </div>
            ))}
          </div>
          <div className="section-head">
            <h2>Top sources</h2>
            <span className="muted">{nutrients[selected].label}</span>
          </div>
          {top.map((food, i) => (
            <div className="contributor" key={food.name + i}>
              <span>{food.name}</span>
              <b>
                {formatNumber(food.value)} {nutrients[selected].unit}
              </b>
              <div className="bar" aria-hidden="true">
                <span style={{ width: `${(food.value / (top[0].value || 1)) * 100}%` }} />
              </div>
            </div>
          ))}
          {!top.length && <p className="muted">No reported values for this nutrient yet.</p>}
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
                {meals.map((meal) => {
                  const portion = entries.filter((e) => e.meal === meal);
                  const n = totalNutrition(portion).total;
                  const d = new Set(portion.map((e) => e.date)).size;
                  return (
                    <tr key={meal}>
                      <th>{meal}</th>
                      <td>{d}</td>
                      {(["calories", "protein", "fiber"] as const).map((k) => (
                        <td key={k}>{formatNumber(n[k] === null ? null : n[k] / d)}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="fine-print">
            Averages use only the days that contain that meal. Renamed meals appear separately.
          </p>
          <h2 className="spaced-heading">Water, weight, and notes</h2>
          <p>
            {weightDays.length > 1
              ? `Weight change: ${formatNumber(weightDays.at(-1)!.weight! - weightDays[0].weight!)} kg across ${weightDays.length} measurements.`
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
                {dateDays
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((d) => (
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
            {mode === "average"
              ? `Average of ${dates.length} logged ${dates.length === 1 ? "day" : "days"}.`
              : `Total across ${dates.length} logged ${dates.length === 1 ? "day" : "days"}.`}{" "}
            Tap a nutrient to see its sources.
          </p>
          <NutrientTable
            portions={entries}
            goals={mode === "average" ? data.settings.goals : {}}
            divisor={divisor}
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
