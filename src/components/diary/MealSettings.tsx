"use client";
import { useState } from "react";
import type { Day } from "@/utils/model";
import { useStore } from "../shell/Store";
import { Modal } from "../ui/Modal";
import { upsert } from "@/utils/db/client";
import { entryStatement } from "@/utils/db/operations";
export function MealSettings({ day, onClose }: { day: Day; onClose: () => void }) {
  const { data, run } = useStore();
  const [meals, setMeals] = useState(day.meals.map((name) => ({ original: name, name })));
  const [future, setFuture] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal title="Meals for this day" onClose={onClose}>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const names = meals.map((m) => m.name.trim());
          if (names.some((n) => !n) || new Set(names.map((n) => n.toLowerCase())).size !== names.length) {
            setError("Give each meal a unique name.");
            return;
          }
          const updates = data.entries
            .filter((e) => e.date === day.date)
            .map((e) => {
              const match = meals.find((m) => m.original === e.meal);
              if (!match) throw new Error("Move foods before removing their meal.");
              return entryStatement({ ...e, meal: match.name.trim() });
            });
          try {
            await run(
              [
                ...updates,
                upsert("days", day.date, { ...day, meals: names }),
                ...(future ? [upsert("settings", "main", { ...data.settings, defaultMeals: names })] : []),
              ],
              "Meals updated"
            );
            onClose();
          } catch (e) {
            setError(String(e));
          }
        }}
      >
        {meals.map((m, i) => (
          <div className="meal-name-row" key={i}>
            <input
              aria-label={`Meal ${i + 1} name`}
              maxLength={40}
              value={m.name}
              onChange={(e) => setMeals(meals.map((v, j) => (j === i ? { ...v, name: e.target.value } : v)))}
            />
            <button
              type="button"
              aria-label={`Move meal ${i + 1} up`}
              disabled={!i}
              onClick={() => {
                const next = [...meals];
                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                setMeals(next);
              }}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Remove meal ${i + 1}`}
              disabled={meals.length === 1 || data.entries.some((e) => e.date === day.date && e.meal === m.original)}
              onClick={() => setMeals(meals.filter((_, j) => i !== j))}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          disabled={meals.length >= 12}
          onClick={() => setMeals([...meals, { original: "", name: "" }])}
        >
          Add meal
        </button>
        <label className="check-label">
          <input type="checkbox" checked={future} onChange={(e) => setFuture(e.target.checked)} />
          Also use these as my defaults for new days
        </label>
        <p className="muted">Existing days retain their own meals. Renaming a meal moves its foods with it.</p>
        {error && <p role="alert">{error}</p>}
        <button className="primary">Save meals</button>
      </form>
    </Modal>
  );
}
