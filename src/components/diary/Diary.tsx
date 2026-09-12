"use client";
import { useState } from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { useStore } from "../shell/Store";
import { today, shiftDate, shortDateLabel, relativeDayLabel } from "@/utils/dates";
import { dayFor, logEntries, entryStatement, newEntry } from "@/utils/db/operations";
import type { Entry, Portion } from "@/utils/model";
import { suggestions } from "@/utils/suggestions";
import { FoodPicker } from "../foods/FoodPicker";
import { DailyTotals } from "./DailyTotals";
import { MobileTotals } from "./MobileTotals";
import { EntryEditor } from "./EntryEditor";
import { MealSettings } from "./MealSettings";
import { MealSection } from "./MealSection";
import { DayNotes } from "./DayNotes";
export function Diary() {
  const { data, run, notify } = useStore();
  const [date, setDate] = useState(today);
  const [meal, setMeal] = useState<string | null>(null);
  const [edit, setEdit] = useState<Entry | null>(null);
  const [mealsOpen, setMealsOpen] = useState(false);
  const [removed, setRemoved] = useState<Entry | null>(null);
  const day = dayFor(data, date);
  const entries = data.entries.filter((e) => e.date === date).sort((a, b) => a.createdAt - b.createdAt);
  async function add(p: Portion, target: string) {
    await run(logEntries(data, [newEntry(p, date, target)]), "");
  }
  async function copyPrevious() {
    const from = data.entries.filter((e) => e.date === shiftDate(date, -1));
    if (!from.length) {
      notify("Yesterday has no foods to copy.");
      return;
    }
    const meals = [...new Set([...day.meals, ...from.map((e) => e.meal)])];
    const next = { ...day, meals };
    const withDay = { ...data, days: [...data.days.filter((d) => d.date !== date), next] };
    await run(
      logEntries(
        withDay,
        from.map((e) => ({ ...e, id: crypto.randomUUID(), date, createdAt: Date.now() }))
      ),
      "Yesterday's foods copied"
    );
  }
  const title = relativeDayLabel(date);
  return (
    <>
      <div className="day-head">
        <button aria-label="Previous day" onClick={() => setDate(shiftDate(date, -1))}>
          <LuChevronLeft />
        </button>
        <h1 className="day-title">
          {title}
          <small>{shortDateLabel(date)}</small>
          <input
            type="date"
            aria-label="Choose a diary date"
            max={today()}
            value={date}
            onChange={(e) => {
              if (e.target.value && e.target.value <= today()) setDate(e.target.value);
            }}
          />
        </h1>
        <button aria-label="Next day" disabled={date >= today()} onClick={() => setDate(shiftDate(date, 1))}>
          <LuChevronRight />
        </button>
        {date !== today() && (
          <button className="text-button today-jump" onClick={() => setDate(today())}>
            Back to today
          </button>
        )}
      </div>
      <div className="diary-layout">
        <MobileTotals entries={entries} />
        <section className="diary-meals">
          {!entries.length && (
            <p className="empty-day">Nothing logged for {title.toLowerCase()}. Add a food to any meal below.</p>
          )}
          {day.meals.map((name) => (
            <MealSection
              key={name}
              name={name}
              items={entries.filter((e) => e.meal === name)}
              suggested={suggestions(data, name, date)}
              onAdd={() => setMeal(name)}
              onLog={(p) => add(p, name)}
              onEdit={setEdit}
              onRemoved={setRemoved}
            />
          ))}
          {removed && (
            <div className="undo-bar">
              Removed {removed.food.name}
              <button
                onClick={() =>
                  void run([entryStatement(removed)], "Food restored")
                    .then(() => setRemoved(null))
                    .catch(() => {})
                }
              >
                Undo
              </button>
            </div>
          )}
          <div className="diary-tools">
            <button className="text-button" onClick={() => void copyPrevious().catch((e) => notify(e.message))}>
              Copy yesterday&rsquo;s foods
            </button>
            <button className="text-button" onClick={() => setMealsOpen(true)}>
              Edit meals
            </button>
          </div>
          <DayNotes day={day} />
        </section>
        <DailyTotals entries={entries} day={day} title={title} />
      </div>
      {meal && <FoodPicker meal={meal} onClose={() => setMeal(null)} onPick={(p) => add(p, meal)} />}
      {edit && <EntryEditor entry={edit} onClose={() => setEdit(null)} onRemoved={setRemoved} />}
      {mealsOpen && <MealSettings day={day} onClose={() => setMealsOpen(false)} />}
    </>
  );
}
