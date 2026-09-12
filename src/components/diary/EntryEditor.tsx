"use client";
import { useState } from "react";
import { LuCopy, LuStar, LuTrash2 } from "react-icons/lu";
import type { Entry } from "@/utils/model";
import { useStore } from "../shell/Store";
import { Modal } from "../ui/Modal";
import { PortionEditor } from "../foods/PortionEditor";
import { dayFor, entryStatement, logEntries, newEntry } from "@/utils/db/operations";
import { today } from "@/utils/dates";
import { upsert } from "@/utils/db/client";
export function EntryEditor({
  entry,
  onClose,
  onRemoved,
}: {
  entry: Entry;
  onClose: () => void;
  onRemoved?: (entry: Entry) => void;
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
              if (e.target.value && e.target.value <= today()) {
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
          await run([entryStatement({ ...entry, ...p, date, meal }), upsert("days", date, day)], "Food updated");
          onClose();
        }}
      />
      <div className="entry-tools">
        <button
          className={`small ${favorite ? "favorited" : ""}`}
          disabled={busy}
          onClick={() =>
            void run(
              [
                {
                  sql: favorite ? "DELETE FROM favorites WHERE id=?" : "INSERT OR IGNORE INTO favorites(id) VALUES(?)",
                  params: [entry.food.id],
                },
              ],
              favorite ? "Removed from favorites" : "Added to favorites"
            ).catch(() => {})
          }
        >
          <LuStar /> {favorite ? "Favorited" : "Favorite"}
        </button>
        <button
          className="small"
          disabled={busy}
          onClick={() =>
            void run(logEntries(data, [newEntry(entry, entry.date, entry.meal)]), "")
              .then(onClose)
              .catch(() => {})
          }
        >
          <LuCopy /> Duplicate
        </button>
        <button
          className="small danger"
          disabled={busy}
          onClick={() =>
            void run([{ sql: "DELETE FROM entries WHERE id=?", params: [entry.id] }], "Food removed")
              .then(() => {
                onRemoved?.(entry);
                onClose();
              })
              .catch(() => {})
          }
        >
          <LuTrash2 /> Remove
        </button>
      </div>
    </Modal>
  );
}
