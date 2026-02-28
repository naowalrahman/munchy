import { useState, useEffect, useCallback } from "react";
import type { FavoritedFood } from "./types";

const STORAGE_KEY = "munchy_favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoritedFood[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setFavorites(JSON.parse(stored));
    } catch {
      // ignore parse errors
    }
  }, []);

  const isFavorited = useCallback((fdcId: number) => favorites.some((f) => f.fdcId === fdcId), [favorites]);

  const toggleFavorite = useCallback((food: FavoritedFood) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.fdcId === food.fdcId);
      const next = exists ? prev.filter((f) => f.fdcId !== food.fdcId) : [...prev, food];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  return { favorites, isFavorited, toggleFavorite };
}
