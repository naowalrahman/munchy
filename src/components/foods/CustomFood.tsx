"use client";

import { useState } from "react";
import { errorMessage } from "@/utils/errors";
import { emptyNutrients, type Food, nutrientKeys, servingSchema } from "@/utils/model";
import { nutrients } from "@/utils/nutrition";

export function CustomFood({ onSave }: { onSave: (food: Food) => void }) {
  const [error, setError] = useState("");

  return (
    <form
      className="form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);

        try {
          const n = emptyNutrients();

          for (const k of nutrientKeys) {
            const value = String(f.get(k) ?? "");
            n[k] = value === "" ? null : Number(value);
          }

          const amount = Number(f.get("amount"));
          if (!amount || amount <= 0) throw new Error("Enter the label serving amount.");
          const unit = servingSchema.shape.unit.parse(f.get("unit"));
          onSave({
            id: `custom:${crypto.randomUUID()}`,
            name: String(f.get("name")).trim(),
            brand: String(f.get("brand")).trim(),
            source: "custom",
            fetchedAt: Date.now(),
            cacheUntil: Number.MAX_SAFE_INTEGER,
            servings: [
              {
                id: "label",
                label: `${amount} ${unit}`,
                amount,
                unit,
                nutrients: n,
              },
            ],
          });
        } catch (e) {
          setError(errorMessage(e, "Could not create this food."));
        }
      }}
    >
      <label>
        Food name
        <input name="name" required maxLength={200} autoFocus placeholder="e.g. My sourdough bread" />
      </label>
      <label>
        Brand (optional)
        <input name="brand" />
      </label>
      <div className="portion-fields">
        <label>
          Label serving amount
          <input name="amount" type="number" min="0.01" step="any" defaultValue="100" required />
        </label>
        <label>
          Label unit
          <select name="unit">
            <option>g</option>
            <option>ml</option>
            <option>portion</option>
          </select>
        </label>
      </div>
      <p className="muted">Enter nutrients for this serving. Leave unlisted nutrients blank.</p>
      <div className="nutrient-inputs">
        {nutrientKeys.map((k) => (
          <label key={k}>
            {nutrients[k].label} ({nutrients[k].unit})
            <input name={k} type="number" min="0" step="any" inputMode="decimal" />
          </label>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      <button className="primary">Use this food</button>
    </form>
  );
}
