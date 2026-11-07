"use client";

import { type NutrientKey, nutrientKeys, type Portion, type Settings } from "@/utils/model";
import { formatNumber, nutrients, totalNutrition } from "@/utils/nutrition";

export function GoalBar({ value, goal, label }: { value: number; goal: number; label: string }) {
  const share = Math.min(1, value / goal);

  return (
    <div
      className={`bar ${value > goal ? "over" : ""}`}
      role="progressbar"
      aria-label={`${label} goal progress`}
      aria-valuemin={0}
      aria-valuemax={goal}
      aria-valuenow={Math.min(value, goal)}
    >
      <span style={{ width: `${share * 100}%` }} />
    </div>
  );
}

export function NutrientTable({
  portions,
  goals = {},
  divisor = 1,
  onSelect,
}: {
  portions: Portion[];
  goals?: Settings["goals"];
  divisor?: number;
  onSelect?: (key: NutrientKey) => void;
}) {
  const { total, coverage, count } = totalNutrition(portions);

  return (
    <div className="nutrient-table">
      {nutrientKeys.map((k, i) => {
        const meta = nutrients[k];
        const previous = nutrientKeys[i - 1];
        const value = total[k] === null ? null : total[k] / divisor;
        const Row = onSelect ? "button" : "div";

        return (
          <div key={k}>
            {(!previous || meta.group !== nutrients[previous].group) && <h3>{meta.group}</h3>}
            <Row
              className={`nutrient-row${onSelect ? " fact-button" : ""}`}
              onClick={onSelect ? () => onSelect(k) : undefined}
              type={onSelect ? "button" : undefined}
              aria-label={onSelect ? `View ${meta.label.toLowerCase()} food sources` : undefined}
            >
              <span className="nutrient-name">{meta.label}</span>
              <span className="nutrient-value">
                {formatNumber(value)} <small>{meta.unit}</small>
                {goals[k] && <small> of {formatNumber(goals[k])}</small>}
              </span>
              {count > 1 && coverage[k] < count && (
                <small className="nutrient-note">
                  {coverage[k]} of {count} foods report this
                </small>
              )}
            </Row>
            {goals[k] && value !== null && <GoalBar value={value} goal={goals[k]} label={meta.label} />}
          </div>
        );
      })}
    </div>
  );
}
