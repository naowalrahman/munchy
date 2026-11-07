"use client";

import { useState } from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";
import { isLogDate, relativeDayLabel, shiftDate, shortDateLabel, today } from "@/utils/dates";
import { dayFor, logEntries, saveEntry } from "@/utils/db/operations";
import type { Entry, Portion } from "@/utils/model";
import { suggestions } from "@/utils/suggestions";
import { FoodPicker } from "../foods/FoodPicker";
import { useStore } from "../shell/Store";
import { DailyTotals } from "./DailyTotals";
import { DayNotes } from "./DayNotes";
import { EntryEditor } from "./EntryEditor";
import { MealSection } from "./MealSection";
import { MealSettings } from "./MealSettings";
import { MobileTotals } from "./MobileTotals";

export function Diary() {
  const { data, run, notify } = useStore();
  const [date, setDate] = useState(today);
  const [meal, setMeal] = useState<string | null>(null);
  const [edit, setEdit] = useState<Entry | null>(null);
  const [mealsOpen, setMealsOpen] = useState(false);
  const [removed, setRemoved] = useState<Entry | null>(null);

  const day = dayFor(data, date);
  const entries = data.entries.filter((e) => e.date === date).sort((a, b) => a.createdAt - b.createdAt);
  const log = (portion: Portion, target: string) => run(() => logEntries(day, [{ portion, meal: target }]));

  function copyPrevious() {
    const from = data.entries.filter((e) => e.date === shiftDate(date, -1));
    if (!from.length) return notify("Yesterday has no foods to copy.");
    const added = from.map((e) => e.meal).filter((m) => !day.meals.includes(m));
    void run(
      () =>
        logEntries(
          { ...day, meals: [...day.meals, ...new Set(added)] },
          from.map((e) => ({ portion: e, meal: e.meal }))
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
              if (isLogDate(e.target.value)) setDate(e.target.value);
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
            <p className="empty-day">You haven&rsquo;t logged anything yet&mdash;let&rsquo;s do it!</p>
          )}
          {day.meals.map((name) => (
            <MealSection
              key={name}
              name={name}
              items={entries.filter((e) => e.meal === name)}
              suggested={suggestions(data, name, date)}
              onAdd={() => setMeal(name)}
              onLog={(p) => void log(p, name)}
              onEdit={setEdit}
              onRemoved={setRemoved}
            />
          ))}
          {removed && (
            <div className="undo-bar">
              Removed {removed.food.name}
              <button
                onClick={() =>
                  void run(() => [saveEntry(removed)], "Food restored").then((ok) => {
                    if (ok) setRemoved(null);
                  })
                }
              >
                Undo
              </button>
            </div>
          )}
          <div className="diary-tools">
            <button className="text-button" onClick={copyPrevious}>
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
      {meal && <FoodPicker meal={meal} onClose={() => setMeal(null)} onPick={(p) => log(p, meal)} />}
      {edit && <EntryEditor entry={edit} onClose={() => setEdit(null)} onRemoved={setRemoved} />}
      {mealsOpen && <MealSettings day={day} onClose={() => setMealsOpen(false)} />}
    </>
  );
}
