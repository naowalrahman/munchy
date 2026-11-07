"use client";

import { type KeyboardEvent, useState } from "react";
import type { Food } from "@/utils/model";
import type { FoodSearch } from "./useFoodSearch";

function FoodRow({ food, favorite }: { food: Food; favorite: boolean }) {
  return (
    <>
      <span>
        <strong>{food.name}</strong>
        <small>{food.brand || (food.source === "recipe" ? "Your recipe" : "Saved on this device")}</small>
      </span>
      <span className={favorite ? "star" : ""}>{favorite ? "★" : "+"}</span>
    </>
  );
}

/** Search box with on-device suggestions, FatSecret results, and the recent foods list. */
export function SearchPanel({
  search,
  local,
  favorites,
  onPick,
  onCustom,
  onScan,
}: {
  search: FoodSearch;
  local: Food[];
  favorites: Set<string>;
  onPick: (food: Food) => void;
  onCustom: () => void;
  onScan: () => void;
}) {
  const [suggesting, setSuggesting] = useState(false);
  const [active, setActive] = useState(-1);

  const term = search.query.trim().toLowerCase();

  const matches = term
    ? local.filter((f) => `${f.name} ${f.brand ?? ""}`.toLowerCase().includes(term)).slice(0, 8)
    : [];

  const showSuggestions = suggesting && matches.length > 0;

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape" && showSuggestions) {
      e.preventDefault();
      e.stopPropagation();
      setSuggesting(false);

      return;
    }

    if (!matches.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSuggesting(true);
      setActive((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSuggesting(true);
      setActive((i) => (i <= 0 ? matches.length : i) - 1);
    } else if (e.key === "Enter" && showSuggestions && matches[active]) {
      e.preventDefault();
      onPick(matches[active]);
    }
  }

  return (
    <>
      <form
        className="search-box"
        onSubmit={(e) => {
          e.preventDefault();
          setSuggesting(false);
          void search.search();
        }}
      >
        <div className="search-field">
          <input
            autoFocus
            role="combobox"
            aria-label="Search foods"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            aria-controls="recent-suggestions"
            aria-activedescendant={showSuggestions && active >= 0 ? `recent-suggestion-${active}` : undefined}
            placeholder="Search foods and brands"
            value={search.query}
            onChange={(e) => {
              search.reset(e.target.value);
              setSuggesting(true);
              setActive(-1);
            }}
            onFocus={() => setSuggesting(true)}
            onBlur={() => setSuggesting(false)}
            onKeyDown={onKey}
          />
          {showSuggestions && (
            <div className="search-suggest" id="recent-suggestions" role="listbox" aria-label="Recent foods">
              {matches.map((food, i) => (
                <button
                  type="button"
                  role="option"
                  id={`recent-suggestion-${i}`}
                  aria-selected={i === active}
                  className={i === active ? "food-result active" : "food-result"}
                  key={food.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => onPick(food)}
                >
                  <FoodRow food={food} favorite={favorites.has(food.id)} />
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="primary" disabled={search.busy}>
          Search
        </button>
      </form>
      {search.busy && (
        <p role="status" className="muted">
          Searching…
        </p>
      )}
      {search.error && (
        <p role="alert" className="error">
          {search.error}
        </p>
      )}
      {!!search.results.length && (
        <>
          <div className="result-head">
            <h3>Search results</h3>
          </div>
          <div className="food-results">
            {search.results.map((food) => (
              <button
                disabled={search.busy}
                className="food-result"
                key={food.id}
                onClick={() =>
                  void search.load(food.id).then((loaded) => {
                    if (loaded) onPick(loaded);
                  })
                }
              >
                <span>
                  <strong>{food.name}</strong>
                  <small>{food.brand}</small>
                  <small>{food.description}</small>
                </span>
                <span>+</span>
              </button>
            ))}
          </div>
          <div className="pager">
            <button
              className="small"
              disabled={!search.page || search.busy}
              onClick={() => void search.search(search.page - 1)}
            >
              Previous
            </button>
            <span>Page {search.page + 1}</span>
            <button
              className="small"
              disabled={!search.hasNext || search.busy}
              onClick={() => void search.search(search.page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
      <div className="result-head food-picker-head">
        <h3>Recent foods and recipes</h3>
        <div className="food-picker-actions">
          <button className="text-button" onClick={onCustom}>
            New food
          </button>
          <button className="text-button" onClick={onScan}>
            Scan
          </button>
        </div>
      </div>
      <div className="food-results">
        {local.slice(0, 30).map((food) => (
          <button className="food-result" key={food.id} onClick={() => onPick(food)}>
            <FoodRow food={food} favorite={favorites.has(food.id)} />
          </button>
        ))}
      </div>
      {!local.length && (
        <p className="empty-small">Foods you log will show up here. Search above or add one from its label.</p>
      )}
      <p className="attribution">
        Search results by{" "}
        <a href="https://www.fatsecret.com" target="_blank" rel="noreferrer">
          fatsecret
        </a>
      </p>
    </>
  );
}
