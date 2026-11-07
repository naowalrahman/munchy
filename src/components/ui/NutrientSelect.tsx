"use client";

import { type NutrientKey, nutrientKeys } from "@/utils/model";
import { nutrients } from "@/utils/nutrition";

export function NutrientSelect({
  value,
  onChange,
  id,
  label,
}: {
  value: NutrientKey;
  onChange: (key: NutrientKey) => void;
  /** Pair with a `<label htmlFor>`, or give an accessible `label` instead. */
  id?: string | undefined;
  label?: string | undefined;
}) {
  return (
    <select
      id={id}
      aria-label={label}
      value={value}
      onChange={(e) => {
        const key = nutrientKeys.find((k) => k === e.target.value);
        if (key) onChange(key);
      }}
    >
      {nutrientKeys.map((k) => (
        <option key={k} value={k}>
          {nutrients[k].label}
        </option>
      ))}
    </select>
  );
}
