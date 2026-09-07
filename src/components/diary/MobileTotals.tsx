import type { Entry } from "@/utils/model";
import { formatNumber, totalNutrition } from "@/utils/nutrition";
import { useStore } from "../shell/Store";

export function MobileTotals({ entries }: { entries: Entry[] }) {
  const { data } = useStore();
  const { total } = totalNutrition(entries);
  const goal = data.settings.goals.calories;
  const calories = total.calories ?? 0;
  const share = goal ? Math.min(1, calories / goal) : 0;
  return (
    <a className="totals-strip" href="#daily-nutrients" aria-label="Today's totals. Jump to nutrition facts">
      <div>
        <strong>{formatNumber(total.calories, 0)}</strong>
        <span>{goal ? `of ${formatNumber(goal, 0)} kcal` : "kcal"}</span>
      </div>
      {(
        [
          ["protein", "Protein"],
          ["carbohydrate", "Carbs"],
          ["fat", "Fat"],
        ] as const
      ).map(([key, label]) => (
        <div key={key}>
          <strong>
            {formatNumber(total[key])}
            <small> g</small>
          </strong>
          <span>{label}</span>
        </div>
      ))}
      {goal ? (
        <div className={`bar ${calories > goal ? "over" : ""}`} aria-hidden="true">
          <span style={{ width: `${share * 100}%` }} />
        </div>
      ) : null}
    </a>
  );
}
