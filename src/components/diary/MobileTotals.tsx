import type { Entry } from "@/utils/model";
import { formatNumber, totalNutrition } from "@/utils/nutrition";

export function MobileTotals({ entries }: { entries: Entry[] }) {
  const { total } = totalNutrition(entries);
  return (
    <a className="mobile-totals" href="#daily-nutrients" aria-label="Daily totals. Jump to all nutrients">
      {(
        [
          ["calories", "kcal"],
          ["protein", "Protein"],
          ["carbohydrate", "Carbs"],
          ["fat", "Fat"],
        ] as const
      ).map(([key, label]) => (
        <span key={key} className={key}>
          <strong>
            {formatNumber(total[key], key === "calories" ? 0 : 1)}
            {key !== "calories" && <small> g</small>}
          </strong>
          <span>{label}</span>
        </span>
      ))}
    </a>
  );
}
