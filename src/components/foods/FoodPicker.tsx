"use client";
import { useRef, useState } from "react";
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
  const abort = useRef<AbortController | null>(null);
  const seq = useRef(0);
  const local = [
    ...data.recipes.map(recipeFood),
    ...data.foods.filter((f) => f.source !== "recipe" && (f.source !== "fatsecret" || f.cacheUntil > Date.now())),
  ]
    .filter((f) => `${f.name} ${f.brand ?? ""}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(data.favorites.includes(b.id)) - Number(data.favorites.includes(a.id)));
  async function search(nextPage = 0) {
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
      title={
        selected ? "Choose your portion" : custom ? "Create a food" : meal ? `Add to ${meal}` : "Find an ingredient"
      }
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
              Your FatSecret account supports search, but has not enabled storage. Persistent logging requires storage
              permission or Premier Free approval.
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
              onClose();
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
            <input
              autoFocus
              aria-label="Search foods"
              placeholder="Food, brand, or recipe"
              value={query}
              onChange={(e) => {
                seq.current++;
                abort.current?.abort();
                setBusy(false);
                setQuery(e.target.value);
                setResults([]);
                setTotal(0);
              }}
            />
            <button className="primary" disabled={busy}>
              Search
            </button>
          </form>
          <div className="section-head">
            <p className="muted">Recent foods & your recipes</p>
            <button className="text-button" onClick={() => setCustom(true)}>
              Create food
            </button>
          </div>
          <div className="food-results">
            {local.slice(0, 30).map((food) => (
              <button className="food-result" key={food.id} onClick={() => setSelected(food)}>
                <span>
                  <strong>{food.name}</strong>
                  <small>{food.brand || (food.source === "recipe" ? "Your recipe" : "Saved on this device")}</small>
                </span>
                <span>{data.favorites.includes(food.id) ? "★" : "+"}</span>
              </button>
            ))}
          </div>
          {!local.length && (
            <p className="empty-small">
              Search FatSecret or create a food from its nutrition label. Logged foods will appear here.
            </p>
          )}
          {busy && <p role="status">Looking up food…</p>}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {!!results.length && (
            <>
              <h3>FatSecret results</h3>
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
              <div className="section-head">
                <button disabled={!page || busy} onClick={() => void search(page - 1)}>
                  Previous
                </button>
                <span>Page {page + 1}</span>
                <button disabled={(page + 1) * 20 >= total || busy} onClick={() => void search(page + 1)}>
                  Next
                </button>
              </div>
            </>
          )}
          <p className="attribution">
            Food search powered by{" "}
            <a href="https://www.fatsecret.com" target="_blank" rel="noreferrer">
              fatsecret
            </a>
          </p>
        </>
      )}
    </Modal>
  );
}
