"use client";

import { useState } from "react";
import { today } from "@/utils/dates";
import { copyRecipe, dayFor, logEntries, removeRecipe, saveRecipe } from "@/utils/db/operations";
import type { Recipe } from "@/utils/model";
import { formatNumber, portionLabel, recipeFood } from "@/utils/nutrition";
import { PortionEditor } from "../foods/PortionEditor";
import { useStore } from "../shell/Store";
import { Modal } from "../ui/Modal";
import { RecipeEditor } from "./RecipeEditor";

export function Recipes() {
  const { data, run } = useStore();
  const day = dayFor(data, today());
  const [query, setQuery] = useState("");
  // `recipe: undefined` opens the editor on a new recipe.
  const [editor, setEditor] = useState<{ recipe: Recipe | undefined } | null>(null);
  const [logging, setLogging] = useState<Recipe | null>(null);
  const [detail, setDetail] = useState<Recipe | null>(null);
  const [meal, setMeal] = useState(day.meals[0]);
  const [removed, setRemoved] = useState<Recipe | null>(null);

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Recipes</h1>
          <p>Build a dish once, then log a serving or a weighed amount.</p>
        </div>
        <button className="primary" onClick={() => setEditor({ recipe: undefined })}>
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
            const n = recipeFood(r).servings[0].nutrients;

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
                  <button className="text-button" onClick={() => setEditor({ recipe: r })}>
                    Edit
                  </button>
                  <button className="text-button" onClick={() => void run(() => [copyRecipe(r)], "Recipe duplicated")}>
                    Duplicate
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      void run(() => [removeRecipe(r.id)], "Recipe removed").then((ok) => {
                        if (ok) setRemoved(r);
                      })
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
          <button className="primary" onClick={() => setEditor({ recipe: undefined })}>
            Create a recipe
          </button>
        </div>
      )}
      {removed && (
        <div className="undo-bar">
          Removed {removed.name}
          <button
            onClick={() =>
              void run(() => [saveRecipe(removed)], "Recipe restored").then((ok) => {
                if (ok) setRemoved(null);
              })
            }
          >
            Undo
          </button>
        </div>
      )}
      {editor && <RecipeEditor recipe={editor.recipe} onClose={() => setEditor(null)} />}
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
            onSave={async (portion) => {
              if (await run(() => logEntries(day, [{ portion, meal }]))) setLogging(null);
            }}
          />
        </Modal>
      )}
      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <p className="method">{detail.instructions || "No method written yet."}</p>
          <ul className="ingredient-list">
            {detail.ingredients.map((p, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: the same food can appear twice, so position is the identity
              <li key={i}>
                <span>{p.food.name}</span>
                <span>{portionLabel(p)}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => {
              setEditor({ recipe: detail });
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
