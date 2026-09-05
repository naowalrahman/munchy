"use client";
import { useEffect, useState } from "react";
import { LuPlus, LuChevronLeft, LuChevronRight, LuSearch, LuCopy, LuTrash2, LuStar } from "react-icons/lu";
import { useStore } from "../shell/Store";
import { today, shiftDate, dateLabel } from "@/utils/dates";
import { dayFor, logEntries, entryStatement, newEntry } from "@/utils/db/operations";
import { upsert } from "@/utils/db/client";
import { formatNumber, portionNutrition, totalNutrition } from "@/utils/nutrition";
import type { Entry, Portion } from "@/utils/model";
import { suggestions } from "@/utils/suggestions";
import { FoodPicker } from "../foods/FoodPicker";
import { DailyTotals } from "./DailyTotals";
import { MobileTotals } from "./MobileTotals";
import { EntryEditor } from "./EntryEditor";
import { MealSettings } from "./MealSettings";
export function Diary() {
  const { data, run, notify, busy } = useStore();
  const [date, setDate] = useState(today);
  const [meal, setMeal] = useState<string | null>(null);
  const [edit, setEdit] = useState<Entry | null>(null);
  const [mealsOpen, setMealsOpen] = useState(false);
  const [removed, setRemoved] = useState<Entry | null>(null);
  const day = dayFor(data, date);
  const entries = data.entries.filter((e) => e.date === date).sort((a, b) => a.createdAt - b.createdAt);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setMeal(day.meals[0]);
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [day.meals]);
  async function add(p: Portion, target: string) {
    await run(logEntries(data, [newEntry(p, date, target)]), `Added ${p.food.name} to ${target}`);
  }
  async function copyPrevious() {
    const from = data.entries.filter((e) => e.date === shiftDate(date, -1));
    if (!from.length) {
      notify("The previous day has no foods to copy.");
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
      "Previous day copied"
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{date === today() ? "Today" : dateLabel(date)}</h1>
          <p>
            {dateLabel(date)}
            <span className="local-label">Saved on this device</span>
          </p>
        </div>
        <div className="date-controls">
          <button aria-label="Previous day" onClick={() => setDate(shiftDate(date, -1))}>
            <LuChevronLeft />
          </button>
          <input
            type="date"
            aria-label="Diary date"
            max={today()}
            value={date}
            onChange={(e) => {
              if (e.target.value && e.target.value <= today()) setDate(e.target.value);
            }}
          />
          <button aria-label="Next day" disabled={date >= today()} onClick={() => setDate(shiftDate(date, 1))}>
            <LuChevronRight />
          </button>
          {date !== today() && <button onClick={() => setDate(today())}>Today</button>}
        </div>
      </div>
      <button className="quick-search" onClick={() => setMeal(day.meals[0])}>
        <LuSearch />
        <span>Find a food. Make it a habit.</span>
        <kbd>⌘ K</kbd>
        <LuPlus />
      </button>
      <div className="diary-layout">
        <MobileTotals entries={entries} />
        <section className="diary-meals">
          <div className="section-head">
            <h2>Your food diary</h2>
            <div className="inline-actions">
              <button className="text-button" onClick={() => void copyPrevious().catch((e) => notify(e.message))}>
                <LuCopy /> Copy yesterday
              </button>
              <button className="text-button" onClick={() => setMealsOpen(true)}>
                Edit meals
              </button>
            </div>
          </div>
          {!entries.length && (
            <div className="welcome-note">
              <h3>A little attention to what you eat.</h3>
              <p>
                Start with your first food. Your favorites, usual portions, and meal suggestions will make the next log
                even faster.
              </p>
            </div>
          )}
          {day.meals.map((name) => {
            const items = entries.filter((e) => e.meal === name);
            const { total } = totalNutrition(items);
            const suggested = suggestions(data, name, date);
            return (
              <section className="meal-section" key={name}>
                <header className="meal-header">
                  <h3>{name}</h3>
                  <span>{formatNumber(total.calories, 0)} kcal</span>
                  <button onClick={() => setMeal(name)} aria-label={`Add food to ${name}`}>
                    <LuPlus /> Add food
                  </button>
                </header>
                {items.map((entry) => {
                  const n = portionNutrition(entry);
                  const favorite = data.favorites.includes(entry.food.id);
                  return (
                    <div className="entry" key={entry.id}>
                      <button className="entry-main" onClick={() => setEdit(entry)}>
                        <strong>{entry.food.name}</strong>
                        <small>
                          {entry.quantity}{" "}
                          {entry.unit === "serving"
                            ? `× ${entry.food.servings.find((s) => s.id === entry.servingId)?.label}`
                            : entry.unit}
                          {entry.food.brand ? ` · ${entry.food.brand}` : ""}
                        </small>
                      </button>
                      <span className="entry-protein">
                        {formatNumber(n.protein)} g <small>protein</small>
                      </span>
                      <b>
                        {formatNumber(n.calories, 0)}
                        <small> kcal</small>
                      </b>
                      <button
                        className={`icon-button ${favorite ? "favorited" : ""}`}
                        aria-label={`${favorite ? "Unfavorite" : "Favorite"} ${entry.food.name}`}
                        onClick={() =>
                          void run(
                            [
                              {
                                sql: favorite
                                  ? "DELETE FROM favorites WHERE id=?"
                                  : "INSERT OR IGNORE INTO favorites(id) VALUES(?)",
                                params: [entry.food.id],
                              },
                            ],
                            "Favorites updated"
                          ).catch(() => {})
                        }
                      >
                        <LuStar />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Duplicate ${entry.food.name}`}
                        disabled={busy}
                        onClick={() => void add(entry, name).catch((e) => notify(e.message))}
                      >
                        <LuCopy />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Delete ${entry.food.name}`}
                        onClick={() =>
                          void run([{ sql: "DELETE FROM entries WHERE id=?", params: [entry.id] }], "Food removed")
                            .then(() => setRemoved(entry))
                            .catch(() => {})
                        }
                      >
                        <LuTrash2 />
                      </button>
                    </div>
                  );
                })}
                {!items.length && (
                  <button className="empty-meal" onClick={() => setMeal(name)}>
                    Add your first food to {name.toLowerCase()}
                  </button>
                )}
                {!!suggested.length && (
                  <div className="suggestions">
                    <small>Your usuals</small>
                    {suggested.map((s) => (
                      <button
                        key={s.food.id}
                        disabled={busy}
                        onClick={() => void add(s, name).catch((e) => notify(e.message))}
                      >
                        + {s.food.name}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
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
          <form
            key={date}
            className="day-notes"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run(
                [
                  upsert("days", date, {
                    ...day,
                    note: String(f.get("note")),
                    weight: f.get("weight") ? Number(f.get("weight")) : null,
                    complete: f.get("complete") === "on",
                  }),
                ],
                "Day details saved"
              ).catch(() => {});
            }}
          >
            <h3>A note about your day</h3>
            <textarea
              name="note"
              defaultValue={day.note}
              placeholder="Appetite, energy, digestion, training…"
              rows={3}
            />
            <div className="section-head">
              <label>
                Weight (kg)
                <input
                  className="weight-input"
                  type="number"
                  name="weight"
                  min="1"
                  step="0.1"
                  defaultValue={day.weight ?? ""}
                />
              </label>
              <label className="check-label">
                <input type="checkbox" name="complete" defaultChecked={day.complete} />
                Day fully logged
              </label>
              <button>Save details</button>
            </div>
          </form>
        </section>
        <DailyTotals entries={entries} day={day} />
      </div>
      {meal && <FoodPicker meal={meal} onClose={() => setMeal(null)} onPick={(p) => add(p, meal)} />}
      {edit && <EntryEditor entry={edit} onClose={() => setEdit(null)} />}
      {mealsOpen && <MealSettings day={day} onClose={() => setMealsOpen(false)} />}
    </>
  );
}
