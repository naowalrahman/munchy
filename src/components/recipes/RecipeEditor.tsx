"use client";
import { useState } from "react";
import type { Portion, Recipe } from "@/utils/model";
import { recipeSchema } from "@/utils/model";
import { recipeFood, formatNumber, portionNutrition } from "@/utils/nutrition";
import { upsert } from "@/utils/db/client";
import { useStore } from "../shell/Store";
import { Modal } from "../ui/Modal";
import { FoodPicker } from "../foods/FoodPicker";
import { PortionEditor } from "../foods/PortionEditor";
import { NutrientTable } from "../diary/NutrientTable";
export function RecipeEditor({ recipe, onClose }: { recipe?: Recipe; onClose: () => void }) {
  const { run } = useStore();
  const [ingredients, setIngredients] = useState<Portion[]>(recipe?.ingredients ?? []);
  const [picker, setPicker] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [servings, setServings] = useState(String(recipe?.servings ?? 4));
  const [grams, setGrams] = useState(String(recipe?.cookedGrams ?? ""));
  const [error, setError] = useState("");
  return (
    <Modal title={recipe ? "Edit recipe" : "Create a recipe"} wide onClose={onClose}>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          try {
            if (ingredients.some((p) => p.food.source === "fatsecret" && p.food.cacheUntil <= Date.now()))
              throw new Error("Refresh expired FatSecret ingredients before saving.");
            const next = recipeSchema.parse({
              id: recipe?.id ?? crypto.randomUUID(),
              name: String(f.get("name")).trim(),
              servings: Number(servings),
              cookedGrams: grams ? Number(grams) : null,
              ingredients,
              instructions: f.get("instructions"),
              tags: f.get("tags"),
              updatedAt: Date.now(),
            });
            await run([upsert("recipes", next.id, next)], "Recipe saved");
            onClose();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not save recipe.");
          }
        }}
      >
        <label>
          Recipe name
          <input
            name="name"
            defaultValue={recipe?.name}
            required
            autoFocus
            placeholder="e.g. Sunday lentil soup"
            maxLength={200}
          />
        </label>
        <div className="portion-fields">
          <label>
            Servings per batch
            <input
              type="number"
              min="0.01"
              step="any"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              required
            />
          </label>
          <label>
            Prepared batch weight, g (optional)
            <input type="number" min="0.01" step="any" value={grams} onChange={(e) => setGrams(e.target.value)} />
          </label>
        </div>
        <p className="muted">
          Weigh the finished recipe to log it in grams. Cooking changes weight, so ingredient weights are not assumed to
          equal the final yield.
        </p>
        <div className="section-head">
          <h3>Ingredients</h3>
          <button type="button" onClick={() => setPicker(true)}>
            + Add ingredient
          </button>
        </div>
        {ingredients.map((p, i) => (
          <div className="recipe-ingredient" key={i}>
            <button className="entry-main" type="button" onClick={() => setEditing(i)}>
              <strong>{p.food.name}</strong>
              <small>
                {p.quantity}{" "}
                {p.unit === "serving" ? `× ${p.food.servings.find((s) => s.id === p.servingId)?.label}` : p.unit}
              </small>
            </button>
            <span>{formatNumber(portionNutrition(p).calories, 0)} kcal</span>
            <button
              type="button"
              aria-label={`Remove ingredient ${i + 1}`}
              onClick={() => setIngredients(ingredients.filter((_, j) => i !== j))}
            >
              ×
            </button>
          </div>
        ))}
        <label>
          Method & notes
          <textarea
            name="instructions"
            defaultValue={recipe?.instructions}
            rows={5}
            placeholder="Preparation, cooking, storage, substitutions…"
          />
        </label>
        <label>
          Tags
          <input name="tags" defaultValue={recipe?.tags} placeholder="Breakfast, batch cooking, vegetarian" />
        </label>
        {ingredients.length > 0 && Number(servings) > 0 && (
          <>
            <h3>Per serving</h3>
            <NutrientTable portions={ingredients} divisor={Number(servings)} />
          </>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary" disabled={!ingredients.length}>
          Save recipe
        </button>
      </form>
      {picker && (
        <FoodPicker
          onClose={() => setPicker(false)}
          onPick={(p) => {
            setIngredients([...ingredients, p]);
          }}
        />
      )}
      {editing !== null && (
        <Modal title="Ingredient amount" onClose={() => setEditing(null)}>
          <PortionEditor
            food={ingredients[editing].food}
            initial={ingredients[editing]}
            label="Update ingredient"
            onSave={(p) => {
              setIngredients(ingredients.map((v, i) => (i === editing ? p : v)));
              setEditing(null);
            }}
          />
        </Modal>
      )}
    </Modal>
  );
}
export { recipeFood };
