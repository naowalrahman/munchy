"use client";
import { useRef, useState, type KeyboardEvent } from "react";
import { Modal } from "../ui/Modal";
import { useStore } from "../shell/Store";
import type { Food, Portion } from "@/utils/model";
import { fetchFood, searchFoods } from "@/utils/food/api";
import type { SearchResult } from "@/utils/food/normalize";
import { recipeFood } from "@/utils/nutrition";
import { PortionEditor } from "./PortionEditor";
import { CustomFood } from "./CustomFood";
export function FoodPicker({
  meal,
  onClose,
  onPick,
}: {
  meal?: string;
  onClose: () => void;
  onPick: (portion: Portion) => Promise<void> | void;
}) {
  const { data } = useStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Food | null>(null);
  const [custom, setCustom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [active, setActive] = useState(-1);
  const abort = useRef<AbortController | null>(null);
  const seq = useRef(0);
  const local = [
    ...data.recipes.map(recipeFood),
    ...data.foods.filter((f) => f.source !== "recipe" && (f.source !== "fatsecret" || f.cacheUntil > Date.now())),
  ].sort((a, b) => Number(data.favorites.includes(b.id)) - Number(data.favorites.includes(a.id)));
  const term = query.trim().toLowerCase();
  const matches = term
    ? local.filter((f) => `${f.name} ${f.brand ?? ""}`.toLowerCase().includes(term)).slice(0, 8)
    : [];
  const showSuggestions = suggesting && matches.length > 0;
  async function search(nextPage = 0) {
    setSuggesting(false);
    if (query.trim().length < 2) {
      setError("Type at least two characters.");
      return;
    }
    const generation = ++seq.current;
    abort.current?.abort();
    abort.current = new AbortController();
    setBusy(true);
    setError("");
    try {
      const result = await searchFoods(data.settings, query.trim(), nextPage, abort.current.signal);
      if (generation === seq.current) {
        setResults(result.foods);
        setTotal(result.total);
        setPage(nextPage);
      }
    } catch (e) {
      if (generation === seq.current && !(e instanceof DOMException && e.name === "AbortError"))
        setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      if (generation === seq.current) setBusy(false);
    }
  }
  function pick(food: Food) {
    setSuggesting(false);
    setSelected(food);
  }
  function onSearchKey(e: KeyboardEvent<HTMLInputElement>) {
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
    } else if (e.key === "Enter" && showSuggestions && active >= 0) {
      e.preventDefault();
      pick(matches[active]);
    }
  }
  async function select(id: string) {
    setBusy(true);
    setError("");
    try {
      setSelected(await fetchFood(data.settings, id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load food.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={selected ? "How much?" : custom ? "New food" : meal ? `Add to ${meal}` : "Add an ingredient"}
      onClose={() => {
        abort.current?.abort();
        onClose();
      }}
    >
      {selected ? (
        <>
          <button className="text-button" onClick={() => setSelected(null)}>
            Back to foods
          </button>
          {selected.source === "fatsecret" && selected.cacheUntil <= Date.now() && (
            <p className="error">
              This food can be logged today but not kept for later. Your FatSecret plan allows search without storage.
            </p>
          )}
          <PortionEditor
            key={selected.id}
            food={selected}
            initial={
              [...data.entries]
                .filter((e) => e.food.id === selected.id && (!meal || e.meal === meal))
                .sort((a, b) => b.createdAt - a.createdAt)[0]
            }
            onSave={async (p) => {
              await onPick(p);
              if (!meal || !data.settings.searchAgain) return onClose();
              setSelected(null);
              setQuery("");
              setResults([]);
              setTotal(0);
              setPage(0);
              setError("");
              setActive(-1);
            }}
            label={meal ? `Log to ${meal}` : "Add ingredient"}
          />
        </>
      ) : custom ? (
        <>
          <button className="text-button" onClick={() => setCustom(false)}>
            Back to search
          </button>
          <CustomFood
            onSave={(food) => {
              setCustom(false);
              setSelected(food);
            }}
          />
        </>
      ) : (
        <>
          <form
            className="search-box"
            onSubmit={(e) => {
              e.preventDefault();
              void search();
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
                value={query}
                onChange={(e) => {
                  seq.current++;
                  abort.current?.abort();
                  setBusy(false);
                  setQuery(e.target.value);
                  setResults([]);
                  setTotal(0);
                  setSuggesting(true);
                  setActive(-1);
                }}
                onFocus={() => setSuggesting(true)}
                onBlur={() => setSuggesting(false)}
                onKeyDown={onSearchKey}
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
                      onClick={() => pick(food)}
                    >
                      <span>
                        <strong>{food.name}</strong>
                        <small>
                          {food.brand || (food.source === "recipe" ? "Your recipe" : "Saved on this device")}
                        </small>
                      </span>
                      <span className={data.favorites.includes(food.id) ? "star" : ""}>
                        {data.favorites.includes(food.id) ? "★" : "+"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="primary" disabled={busy}>
              Search
            </button>
          </form>
          {busy && (
            <p role="status" className="muted">
              Searching…
            </p>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {!!results.length && (
            <>
              <div className="result-head">
                <h3>Search results</h3>
              </div>
              <div className="food-results">
                {results.map((food) => (
                  <button disabled={busy} className="food-result" key={food.id} onClick={() => void select(food.id)}>
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
                <button className="small" disabled={!page || busy} onClick={() => void search(page - 1)}>
                  Previous
                </button>
                <span>Page {page + 1}</span>
                <button
                  className="small"
                  disabled={(page + 1) * 20 >= total || busy}
                  onClick={() => void search(page + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
          <div className="result-head">
            <h3>Recent foods and recipes</h3>
            <button className="text-button" onClick={() => setCustom(true)}>
              New food from a label
            </button>
          </div>
          <div className="food-results">
            {local.slice(0, 30).map((food) => (
              <button className="food-result" key={food.id} onClick={() => pick(food)}>
                <span>
                  <strong>{food.name}</strong>
                  <small>{food.brand || (food.source === "recipe" ? "Your recipe" : "Saved on this device")}</small>
                </span>
                <span className={data.favorites.includes(food.id) ? "star" : ""}>
                  {data.favorites.includes(food.id) ? "★" : "+"}
                </span>
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
      )}
    </Modal>
  );
}
