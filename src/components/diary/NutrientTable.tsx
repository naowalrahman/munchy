import { nutrientKeys, type Portion, type NutrientKey } from "@/utils/model";
import { nutrients, totalNutrition, formatNumber } from "@/utils/nutrition";
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
  goals?: Record<string, number>;
  divisor?: number;
  onSelect?: (key: NutrientKey) => void;
}) {
  const { total, coverage, count } = totalNutrition(portions);
  return (
    <div className="nutrient-table">
      {nutrientKeys.map((k, i) => {
        const meta = nutrients[k];
        const value = total[k] === null ? null : total[k] / divisor;
        return (
          <div key={k}>
            {(i === 0 || meta.group !== nutrients[nutrientKeys[i - 1]].group) && <h3>{meta.group}</h3>}
            <div className="nutrient-row">
              <span className="nutrient-name">
                {onSelect ? (
                  <button className="text-button" onClick={() => onSelect(k)}>
                    {meta.label}
                  </button>
                ) : (
                  meta.label
                )}
              </span>
              <span className="nutrient-value">
                {formatNumber(value)} <small>{meta.unit}</small>
                {goals[k] && <small> of {formatNumber(goals[k])}</small>}
              </span>
              {count > 1 && coverage[k] < count && (
                <small className="nutrient-note">
                  {coverage[k]} of {count} foods report this
                </small>
              )}
            </div>
            {goals[k] && value !== null && <GoalBar value={value} goal={goals[k]} label={meta.label} />}
          </div>
        );
      })}
    </div>
  );
}
