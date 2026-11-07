"use client";

import { useState } from "react";
import { saveDay, saveEntry, saveSettings } from "@/utils/db/operations";
import { type Day, issueText, mealsSchema } from "@/utils/model";
import { useStore } from "../shell/Store";
import { Modal } from "../ui/Modal";

export function MealSettings({ day, onClose }: { day: Day; onClose: () => void }) {
  const { data, run } = useStore();
  const [meals, setMeals] = useState(day.meals.map((name) => ({ original: name, name })));
  const [future, setFuture] = useState(false);
  const [error, setError] = useState("");

  const dayEntries = data.entries.filter((e) => e.date === day.date);

  return (
    <Modal title="Meals for this day" onClose={onClose}>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const parsed = mealsSchema.safeParse(meals.map((m) => m.name.trim()));
          if (!parsed.success) return setError(issueText(parsed.error));
          const names = parsed.data;
          // Meals holding foods can't be removed, so every entry's meal has a (possibly renamed) match.
          const renamed = new Map(meals.map((m) => [m.original, m.name.trim()]));

          const saved = await run(
            () => [
              ...dayEntries.map((entry) => saveEntry({ ...entry, meal: renamed.get(entry.meal) ?? entry.meal })),
              saveDay({ ...day, meals: names }),
              ...(future ? [saveSettings({ ...data.settings, defaultMeals: names })] : []),
            ],
            "Meals updated"
          );

          if (saved) onClose();
        }}
      >
        {meals.map((m, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: names are being edited, so the position is the only stable identity
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
                next.splice(i - 1, 0, ...next.splice(i, 1));
                setMeals(next);
              }}
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Remove meal ${i + 1}`}
              disabled={meals.length === 1 || dayEntries.some((e) => e.meal === m.original)}
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
