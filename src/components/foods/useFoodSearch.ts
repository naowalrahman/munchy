"use client";

import { useRef, useState } from "react";
import { errorMessage } from "@/utils/errors";
import { fetchFood, searchFoods } from "@/utils/food/api";
import type { SearchResult } from "@/utils/food/normalize";
import type { Food, Settings } from "@/utils/model";

const pageSize = 20;

export interface FoodSearch {
  query: string;
  results: SearchResult[];
  page: number;
  hasNext: boolean;
  busy: boolean;
  error: string;
  cancel: () => void;
  /** Replaces the query and clears everything derived from the previous one. */
  reset: (query?: string) => void;
  search: (page?: number) => Promise<void>;
  load: (id: string) => Promise<Food | null>;
}

/** FatSecret search and detail lookups; starting a new request or calling `cancel` drops the one in flight. */
export function useFoodSearch(settings: Settings): FoodSearch {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef<AbortController | null>(null);

  function cancel() {
    inFlight.current?.abort();
    inFlight.current = null;
    setBusy(false);
  }

  async function request<T>(load: (signal: AbortSignal) => Promise<T>, failure: string): Promise<T | null> {
    cancel();
    const controller = new AbortController();
    inFlight.current = controller;
    setBusy(true);
    setError("");

    try {
      const result = await load(controller.signal);
      return controller.signal.aborted ? null : result;
    } catch (e) {
      if (!controller.signal.aborted) setError(errorMessage(e, failure));
      return null;
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return {
    query,
    results,
    page,
    hasNext: (page + 1) * pageSize < total,
    busy,
    error,
    cancel,
    reset(next = "") {
      cancel();
      setQuery(next);
      setResults([]);
      setTotal(0);
      setPage(0);
      setError("");
    },
    async search(nextPage = 0) {
      const q = query.trim();
      if (q.length < 2) return setError("Type at least two characters.");
      const result = await request((signal) => searchFoods(settings, q, nextPage, signal), "Search failed.");
      if (!result) return;
      setResults(result.foods);
      setTotal(result.total);
      setPage(nextPage);
    },
    load: (id) => request((signal) => fetchFood(settings, id, signal), "Could not load food."),
  };
}
