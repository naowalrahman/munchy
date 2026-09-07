"use client";
import type { Day } from "@/utils/model";
import { useStore } from "../shell/Store";
import { upsert } from "@/utils/db/client";
import { formatNumber } from "@/utils/nutrition";
export function DayNotes({ day }: { day: Day }) {
  const { run } = useStore();
  const summary = [
    day.weight !== null ? `${formatNumber(day.weight)} kg` : "",
    day.complete ? "fully logged" : "",
    day.note ? "note added" : "",
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <details className="day-notes" open={Boolean(day.note)}>
      <summary>
        Weight and notes
        <span>{summary || "Nothing recorded"}</span>
      </summary>
      <form
        key={day.date}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void run(
            [
              upsert("days", day.date, {
                ...day,
                note: String(f.get("note")),
                weight: f.get("weight") ? Number(f.get("weight")) : null,
                complete: f.get("complete") === "on",
              }),
            ],
            "Day details saved"
          ).catch(() => {});
        }}
      >
        <textarea
          name="note"
          aria-label="Note about your day"
          defaultValue={day.note}
          placeholder="Appetite, energy, digestion, training…"
          rows={2}
        />
        <div className="day-notes-row">
          <label>
            Weight, kg
            <input
              className="weight-input"
              type="number"
              name="weight"
              min="1"
              step="0.1"
              defaultValue={day.weight ?? ""}
            />
          </label>
          <label className="check-label">
            <input type="checkbox" name="complete" defaultChecked={day.complete} />
            Day fully logged
          </label>
          <button>Save</button>
        </div>
      </form>
    </details>
  );
}
