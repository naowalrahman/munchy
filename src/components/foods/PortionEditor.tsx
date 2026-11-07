"use client";

import { useState } from "react";
import { type Food, nutrientKeys, type Portion, type Serving } from "@/utils/model";
import { formatNumber, portionLabel, portionNutrition } from "@/utils/nutrition";
import { parseQuantity, portionFactor, unitOptions } from "@/utils/units";
import { NutrientTable } from "../diary/NutrientTable";

/** The portion described by the form, or null while the amount or unit is invalid. */
function readPortion(food: Food, serving: Serving, text: string, unit: string): Portion | null {
  try {
    const quantity = parseQuantity(text);
    return { food, servingId: serving.id, quantity, unit, factor: portionFactor(quantity, unit, serving) };
  } catch {
    return null;
  }
}

export function PortionEditor({
  food,
  initial,
  onSave,
  label = "Log food",
}: {
  food: Food;
  initial?: Portion | undefined;
  onSave: (p: Portion) => Promise<void> | void;
  label?: string;
}) {
  const [servingId, setServing] = useState(initial?.servingId ?? food.servings[0].id);
  const [quantity, setQuantity] = useState(String(initial?.quantity ?? 1));
  const [unit, setUnit] = useState(initial?.unit ?? "serving");
  const [busy, setBusy] = useState(false);

  const serving = food.servings.find((s) => s.id === servingId) ?? food.servings[0];
  const portion = readPortion(food, serving, quantity, unit);
  const n = portion && portionNutrition(portion);

  return (
    <form
      className="portion-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!portion) return;
        setBusy(true);

        try {
          await onSave(portion);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>{food.name}</h3>
      {food.brand && <p className="muted">{food.brand}</p>}
      <label>
        Serving
        <select
          value={servingId}
          onChange={(e) => {
            setServing(e.target.value);
            setUnit("serving");
          }}
        >
          {food.servings.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <div className="portion-fields">
        <label>
          Amount
          <input
            autoFocus
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onFocus={(e) => e.target.select()}
            aria-label="Food amount"
          />
        </label>
        <label>
          Unit
          <select value={unit} onChange={(e) => setUnit(e.target.value)}>
            {unitOptions(serving).map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="portion-presets">
        {["1/4", "1/2", "1", "2"].map((q) => (
          <button type="button" key={q} onClick={() => setQuantity(q)}>
            {q}
          </button>
        ))}
      </div>
      <div className="macro-line">
        <b>{formatNumber(n?.calories ?? null, 0)} kcal</b>
        <span>{formatNumber(n?.protein ?? null)} g protein</span>
        <span>{formatNumber(n?.carbohydrate ?? null)} g carbs</span>
        <span>{formatNumber(n?.fat ?? null)} g fat</span>
      </div>
      <button className="primary full" disabled={busy || !portion}>
        {busy ? "Saving…" : label}
      </button>
      {portion && n && (
        <details className="portion-facts" open>
          <summary>
            Full nutrition
            <span>{portionLabel(portion)}</span>
          </summary>
          <NutrientTable portions={[portion]} />
          {nutrientKeys.some((k) => n[k] === null) && (
            <p className="fine-print">A dash means this food does not report it.</p>
          )}
        </details>
      )}
    </form>
  );
}
