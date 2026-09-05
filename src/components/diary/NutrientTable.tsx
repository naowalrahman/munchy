import { nutrientKeys, type Portion, type NutrientKey } from "@/utils/model";
import { nutrients, totalNutrition, formatNumber } from "@/utils/nutrition";
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
              <span>
                {onSelect ? (
                  <button className="text-button" onClick={() => onSelect(k)}>
                    {meta.label}
                  </button>
                ) : (
                  meta.label
                )}
                <small>{count && coverage[k] < count ? `${coverage[k]}/${count} foods report this` : ""}</small>
              </span>
              <span className="nutrient-value">
                {formatNumber(value)} <small>{meta.unit}</small>
                {goals[k] && <small> / {formatNumber(goals[k])}</small>}
              </span>
            </div>
            {goals[k] && value !== null && (
              <progress value={Math.min(value, goals[k])} max={goals[k]} aria-label={`${meta.label} goal progress`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
