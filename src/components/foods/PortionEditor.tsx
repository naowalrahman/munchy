"use client";
import { useState } from "react";
import type { Food, Portion } from "@/utils/model";
import { parseQuantity, portionFactor, unitOptions } from "@/utils/units";
import { formatNumber, scale } from "@/utils/nutrition";
export function PortionEditor({
  food,
  initial,
  onSave,
  label = "Log food",
}: {
  food: Food;
  initial?: Portion;
  onSave: (p: Portion) => Promise<void> | void;
  label?: string;
}) {
  const [servingId, setServing] = useState(initial?.servingId ?? food.servings[0].id);
  const [quantity, setQuantity] = useState(String(initial?.quantity ?? 1));
  const [unit, setUnit] = useState(initial?.unit ?? "serving");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const serving = food.servings.find((s) => s.id === servingId) ?? food.servings[0];
  let factor = 0;
  try {
    factor = portionFactor(parseQuantity(quantity), unit, serving);
  } catch {}
  const n = scale(serving.nutrients, factor);
  return (
    <form
      className="portion-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
          const amount = parseQuantity(quantity);
          await onSave({
            food,
            servingId: serving.id,
            quantity: amount,
            unit,
            factor: portionFactor(amount, unit, serving),
          });
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not save.");
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
        <b>{formatNumber(factor ? n.calories : null, 0)} kcal</b>
        <span>{formatNumber(factor ? n.protein : null)} g protein</span>
        <span>{formatNumber(factor ? n.carbohydrate : null)} g carbs</span>
        <span>{formatNumber(factor ? n.fat : null)} g fat</span>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="primary full" disabled={busy || !factor}>
        {busy ? "Saving…" : label}
      </button>
    </form>
  );
}
