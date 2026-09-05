"use client";
import { useState } from "react";
import type { Entry } from "@/utils/model";
import { useStore } from "../shell/Store";
import { Modal } from "../ui/Modal";
import { PortionEditor } from "../foods/PortionEditor";
import { NutrientTable } from "./NutrientTable";
import { dayFor, entryStatement } from "@/utils/db/operations";
import { today } from "@/utils/dates";
import { upsert } from "@/utils/db/client";
export function EntryEditor({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const { data, run } = useStore();
  const [date, setDate] = useState(entry.date);
  const [meal, setMeal] = useState(entry.meal);
  const day = dayFor(data, date);
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
      <NutrientTable portions={[entry]} />
    </Modal>
  );
}
