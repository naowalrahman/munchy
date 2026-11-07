"use client";

import { useState } from "react";
import { LuCopy, LuStar, LuTrash2 } from "react-icons/lu";
import { isLogDate, today } from "@/utils/dates";
import { dayFor, logEntries, removeEntry, saveDay, saveEntry, setFavorite } from "@/utils/db/operations";
import type { Entry } from "@/utils/model";
import { PortionEditor } from "../foods/PortionEditor";
import { useStore } from "../shell/Store";
import { Modal } from "../ui/Modal";

export function EntryEditor({
  entry,
  onClose,
  onRemoved,
}: {
  entry: Entry;
  onClose: () => void;
  onRemoved: (entry: Entry) => void;
}) {
  const { data, run, busy } = useStore();
  const [date, setDate] = useState(entry.date);
  const [meal, setMeal] = useState(entry.meal);

  const day = dayFor(data, date);
  const favorite = data.favorites.includes(entry.food.id);

  return (
    <Modal title="Edit food" onClose={onClose}>
      <div className="portion-fields">
        <label>
          Date
          <input
            type="date"
            max={today()}
            value={date}
            onChange={(e) => {
              if (isLogDate(e.target.value)) {
                setDate(e.target.value);
                setMeal(dayFor(data, e.target.value).meals[0]);
              }
            }}
          />
        </label>
        <label>
          Meal
          <select value={meal} onChange={(e) => setMeal(e.target.value)}>
            {day.meals.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
      </div>
      <PortionEditor
        food={entry.food}
        initial={entry}
        label="Save food"
        onSave={async (p) => {
          // Editing keeps the stored snapshot, so unlike logging it doesn't require the food to be storable now.
          if (await run(() => [saveEntry({ ...entry, ...p, date, meal }), saveDay(day)], "Food updated")) onClose();
        }}
      />
      <div className="entry-tools">
        <button
          className={`small ${favorite ? "favorited" : ""}`}
          disabled={busy}
          onClick={() =>
            void run(
              () => [setFavorite(entry.food.id, !favorite)],
              favorite ? "Removed from favorites" : "Added to favorites"
            )
          }
        >
          <LuStar /> {favorite ? "Favorited" : "Favorite"}
        </button>
        <button
          className="small"
          disabled={busy}
          onClick={() =>
            void run(() => logEntries(dayFor(data, entry.date), [{ portion: entry, meal: entry.meal }])).then((ok) => {
              if (ok) onClose();
            })
          }
        >
          <LuCopy /> Duplicate
        </button>
        <button
          className="small danger"
          disabled={busy}
          onClick={() =>
            void run(() => [removeEntry(entry.id)], "Food removed").then((ok) => {
              if (!ok) return;
              onRemoved(entry);
              onClose();
            })
          }
        >
          <LuTrash2 /> Remove
        </button>
      </div>
    </Modal>
  );
}
