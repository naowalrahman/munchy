"use client";

import { LuCopy, LuPlus, LuStar, LuTrash2 } from "react-icons/lu";
import { removeEntry, setFavorite } from "@/utils/db/operations";
import type { Entry, Portion } from "@/utils/model";
import { formatNumber, portionLabel, portionNutrition, totalNutrition } from "@/utils/nutrition";
import { useStore } from "../shell/Store";

export function MealSection({
  name,
  items,
  suggested,
  onAdd,
  onLog,
  onEdit,
  onRemoved,
}: {
  name: string;
  items: Entry[];
  suggested: Entry[];
  onAdd: () => void;
  onLog: (p: Portion) => void;
  onEdit: (entry: Entry) => void;
  onRemoved: (entry: Entry) => void;
}) {
  const { data, run, busy } = useStore();
  const { total } = totalNutrition(items);

  return (
    <section className="meal-section">
      <header className="meal-header">
        <h3>{name}</h3>
        {items.length > 0 && (
          <b>
            {formatNumber(total.calories, 0)}
            <small> kcal</small>
          </b>
        )}
      </header>
      {items.map((entry) => {
        const n = portionNutrition(entry);
        const favorite = data.favorites.includes(entry.food.id);

        return (
          <div className="entry" key={entry.id}>
            <button className="entry-main" onClick={() => onEdit(entry)}>
              <strong>{entry.food.name}</strong>
              <small>
                {portionLabel(entry)}
                {entry.food.brand ? `, ${entry.food.brand}` : ""}
              </small>
            </button>
            <span className="entry-protein">{formatNumber(n.protein)} g protein</span>
            <b>
              {formatNumber(n.calories, 0)}
              <small> kcal</small>
            </b>
            <span className="entry-actions">
              <button
                className={`icon-button ${favorite ? "favorited" : ""}`}
                aria-label={`${favorite ? "Unfavorite" : "Favorite"} ${entry.food.name}`}
                onClick={() =>
                  void run(
                    () => [setFavorite(entry.food.id, !favorite)],
                    favorite ? "Removed from favorites" : "Added to favorites"
                  )
                }
              >
                <LuStar />
              </button>
              <button
                className="icon-button"
                aria-label={`Duplicate ${entry.food.name}`}
                disabled={busy}
                onClick={() => onLog(entry)}
              >
                <LuCopy />
              </button>
              <button
                className="icon-button"
                aria-label={`Delete ${entry.food.name}`}
                onClick={() =>
                  void run(() => [removeEntry(entry.id)], "Food removed").then((ok) => {
                    if (ok) onRemoved(entry);
                  })
                }
              >
                <LuTrash2 />
              </button>
            </span>
          </div>
        );
      })}
      <div className="meal-foot">
        <button className="text-button" onClick={onAdd} aria-label={`Add food to ${name}`}>
          <LuPlus /> Add food
        </button>
        {!!suggested.length && (
          <>
            <small>Usuals</small>
            {suggested.map((s) => (
              <button key={s.food.id} className="usual" disabled={busy} onClick={() => onLog(s)}>
                + {s.food.name}
              </button>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
