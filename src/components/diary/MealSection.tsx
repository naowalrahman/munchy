"use client";
import { LuPlus, LuCopy, LuTrash2, LuStar } from "react-icons/lu";
import { useStore } from "../shell/Store";
import { formatNumber, portionNutrition, totalNutrition } from "@/utils/nutrition";
import type { Entry, Portion } from "@/utils/model";
export function portionLabel(p: Portion) {
  return `${p.quantity} ${
    p.unit === "serving" ? `× ${p.food.servings.find((s) => s.id === p.servingId)?.label}` : p.unit
  }`;
}
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
  onLog: (p: Portion) => Promise<void>;
  onEdit: (entry: Entry) => void;
  onRemoved: (entry: Entry) => void;
}) {
  const { data, run, notify, busy } = useStore();
  const { total } = totalNutrition(items);
  return (
    <section className="meal-section">
      <header className="meal-header">
        <h3>{name}</h3>
        {items.length > 0 && <span>{formatNumber(total.calories, 0)} kcal</span>}
        <button className="small" onClick={onAdd} aria-label={`Add food to ${name}`}>
          <LuPlus /> Add
        </button>
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
                    [
                      {
                        sql: favorite
                          ? "DELETE FROM favorites WHERE id=?"
                          : "INSERT OR IGNORE INTO favorites(id) VALUES(?)",
                        params: [entry.food.id],
                      },
                    ],
                    favorite ? "Removed from favorites" : "Added to favorites"
                  ).catch(() => {})
                }
              >
                <LuStar />
              </button>
              <button
                className="icon-button"
                aria-label={`Duplicate ${entry.food.name}`}
                disabled={busy}
                onClick={() => void onLog(entry).catch((e) => notify(e.message))}
              >
                <LuCopy />
              </button>
              <button
                className="icon-button"
                aria-label={`Delete ${entry.food.name}`}
                onClick={() =>
                  void run([{ sql: "DELETE FROM entries WHERE id=?", params: [entry.id] }], "Food removed")
                    .then(() => onRemoved(entry))
                    .catch(() => {})
                }
              >
                <LuTrash2 />
              </button>
            </span>
          </div>
        );
      })}
      {!items.length && !suggested.length && (
        <button className="empty-meal" onClick={onAdd}>
          Nothing logged yet
        </button>
      )}
      {!!suggested.length && (
        <div className="suggestions">
          <small>Usuals</small>
          {suggested.map((s) => (
            <button key={s.food.id} disabled={busy} onClick={() => void onLog(s).catch((e) => notify(e.message))}>
              + {s.food.name}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
