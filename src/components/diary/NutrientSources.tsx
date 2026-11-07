"use client";

import { shortDateLabel } from "@/utils/dates";
import type { Entry, NutrientKey } from "@/utils/model";
import { formatNumber, nutrientSources, nutrients, portionLabel } from "@/utils/nutrition";
import { Modal } from "../ui/Modal";
import { NutrientSelect } from "../ui/NutrientSelect";

export function NutrientSources({
  entries,
  date,
  selected,
  onSelect,
  onClose,
}: {
  entries: Entry[];
  date: string;
  selected: NutrientKey;
  onSelect: (key: NutrientKey) => void;
  onClose: () => void;
}) {
  const meta = nutrients[selected];
  const { total, missing, ranked, zero } = nutrientSources(entries, selected);

  return (
    <Modal title={`${meta.label} sources`} onClose={onClose}>
      <div className="nutrient-sources">
        <div className="source-controls">
          <p className="muted">{shortDateLabel(date)}</p>
          <label htmlFor="source-nutrient">
            Nutrient
            <NutrientSelect id="source-nutrient" value={selected} onChange={onSelect} />
          </label>
        </div>
        <div className="source-total">
          <span>Day’s reported total</span>
          <strong>
            {formatNumber(total)} <small>{meta.unit}</small>
          </strong>
          <p>
            {entries.length - missing.length} of {entries.length} logged portions report this nutrient
          </p>
          {(ranked.some((food) => food.partial) || zero.some((food) => food.partial)) && (
            <p>Partial recipe values include known ingredients only. The actual total may be higher.</p>
          )}
        </div>
        {total !== null && ranked.length > 0 && (
          <>
            <div className="source-list-heading">
              <h3>Food contributions</h3>
              <span>Share of reported total</span>
            </div>
            <ol className="source-list">
              {ranked.map((food, i) => {
                const share = (food.value / total) * 100;

                return (
                  <li key={food.id}>
                    <span className="source-rank" aria-hidden="true">
                      {i + 1}
                    </span>
                    <div className="source-food">
                      <strong>{food.name}</strong>
                      <small>{[...food.meals].join(" · ")}</small>
                      {food.partial && <small>Partial ingredient data</small>}
                    </div>
                    <div className="source-amount">
                      <strong>
                        {formatNumber(food.value)} <small>{meta.unit}</small>
                      </strong>
                      <span>{share < 0.1 ? "<0.1" : formatNumber(share)}%</span>
                    </div>
                    <div className="source-bar" aria-hidden="true">
                      <span style={{ width: `${share}%` }} />
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        )}
        {!entries.length ? (
          <p className="source-empty">No foods logged for this day yet.</p>
        ) : total === null ? (
          <p className="source-empty">
            None of this day’s foods report {meta.label.toLowerCase()}. Missing values are not zero.
          </p>
        ) : total === 0 ? (
          <p className="source-empty">
            The foods with reported values contribute 0 {meta.unit} of {meta.label.toLowerCase()}.
          </p>
        ) : null}
        {zero.length > 0 && (
          <details className="source-other">
            <summary>
              Reported zero · {zero.length} {zero.length === 1 ? "food" : "foods"}
            </summary>
            <ul>
              {zero.map((food) => (
                <li key={food.id}>
                  {food.name}
                  <small>{[...food.meals].join(" · ")}</small>
                  {food.partial && <small>Partial ingredient data</small>}
                </li>
              ))}
            </ul>
          </details>
        )}
        {missing.length > 0 && (
          <details className="source-other" open>
            <summary>
              Not reported · {missing.length} {missing.length === 1 ? "portion" : "portions"}
            </summary>
            <p>These portions are excluded. The actual total may be higher.</p>
            <ul>
              {missing.map((entry) => (
                <li key={entry.id}>
                  {entry.food.name}
                  <small>
                    {entry.meal} · {portionLabel(entry)}
                  </small>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Modal>
  );
}
