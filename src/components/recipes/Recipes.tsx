"use client";
import { useState } from "react";
import type { Recipe } from "@/utils/model";
import { useStore } from "../shell/Store";
import { RecipeEditor } from "./RecipeEditor";
import { recipeFood, formatNumber } from "@/utils/nutrition";
import { Modal } from "../ui/Modal";
import { PortionEditor } from "../foods/PortionEditor";
import { dayFor, logEntries } from "@/utils/db/operations";
import { upsert } from "@/utils/db/client";
import { today } from "@/utils/dates";
import { portionLabel } from "../diary/MealSection";
export function Recipes() {
  const { data, run } = useStore();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Recipe | null | undefined>();
  const [logging, setLogging] = useState<Recipe | null>(null);
  const [detail, setDetail] = useState<Recipe | null>(null);
  const [meal, setMeal] = useState(data.settings.defaultMeals[0]);
  const [removed, setRemoved] = useState<Recipe | null>(null);
  const day = dayFor(data, today());
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Recipes</h1>
          <p>Build a dish once, then log a serving or a weighed amount.</p>
        </div>
        <button className="primary" onClick={() => setEditing(null)}>
          New recipe
        </button>
      </div>
      <input
        className="wide-input"
        aria-label="Filter recipes"
        placeholder="Find by name, ingredient, or tag"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="recipe-list">
        {data.recipes
          .filter((r) =>
            `${r.name} ${r.tags} ${r.ingredients.map((p) => p.food.name).join(" ")}`
              .toLowerCase()
              .includes(query.toLowerCase())
          )
          .map((r) => {
            const food = recipeFood(r);
            const n = food.servings[0].nutrients;
            return (
              <article className="recipe-row" key={r.id}>
                <div>
                  <button className="recipe-title" onClick={() => setDetail(r)}>
                    {r.name}
                  </button>
                  <p className="recipe-meta">
                    {r.servings} servings, {r.ingredients.length} ingredients
                    {r.cookedGrams ? `, ${formatNumber(r.cookedGrams, 0)} g cooked` : ""}
                    {r.tags ? `. ${r.tags}` : ""}
                  </p>
                  <div className="recipe-macros">
                    <b>{formatNumber(n.calories, 0)} kcal</b>
                    <span>{formatNumber(n.protein)} g protein</span>
                    <span className="muted">per serving</span>
                  </div>
                </div>
                <div className="recipe-actions">
                  <button className="primary small" onClick={() => setLogging(r)}>
                    Log a serving
                  </button>
                  <button className="text-button" onClick={() => setEditing(r)}>
                    Edit
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      const id = crypto.randomUUID();
                      void run(
                        [upsert("recipes", id, { ...r, id, name: `${r.name} (copy)` })],
                        "Recipe duplicated"
                      ).catch(() => {});
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      void run([{ sql: "DELETE FROM recipes WHERE id=?", params: [r.id] }], "Recipe removed")
                        .then(() => setRemoved(r))
                        .catch(() => {})
                    }
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
      </div>
      {!data.recipes.length && (
        <div className="empty-state">
          <h2>No recipes yet</h2>
          <p>
            Add ingredients with their real portions and the number of servings. Munchy works out the nutrition per
            serving, so logging a repeat meal takes one tap.
          </p>
          <button className="primary" onClick={() => setEditing(null)}>
            Create a recipe
          </button>
        </div>
      )}
      {removed && (
        <div className="undo-bar">
          Removed {removed.name}
          <button
            onClick={() =>
              void run([upsert("recipes", removed.id, removed)], "Recipe restored")
                .then(() => setRemoved(null))
                .catch(() => {})
            }
          >
            Undo
          </button>
        </div>
      )}
      {editing !== undefined && <RecipeEditor recipe={editing ?? undefined} onClose={() => setEditing(undefined)} />}
      {logging && (
        <Modal title="Log to today" onClose={() => setLogging(null)}>
          <label>
            Meal
            <select value={meal} onChange={(e) => setMeal(e.target.value)}>
              {day.meals.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <PortionEditor
            food={recipeFood(logging)}
            onSave={async (p) => {
              await run(
                logEntries(data, [
                  {
                    ...p,
                    id: crypto.randomUUID(),
                    date: today(),
                    meal: day.meals.includes(meal) ? meal : day.meals[0],
                    createdAt: Date.now(),
                  },
                ]),
                "Recipe logged"
              );
              setLogging(null);
            }}
          />
        </Modal>
      )}
      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <p className="method">{detail.instructions || "No method written yet."}</p>
          <ul className="ingredient-list">
            {detail.ingredients.map((p, i) => (
              <li key={i}>
                <span>{p.food.name}</span>
                <span>{portionLabel(p)}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => {
              setEditing(detail);
              setDetail(null);
            }}
          >
            Edit recipe
          </button>
        </Modal>
      )}
    </>
  );
}
