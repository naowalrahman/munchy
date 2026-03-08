import { useState, useCallback } from "react";
import type { FavoritedFood } from "./types";
import type { NutritionalData } from "@/app/actions/food";

const STORAGE_KEY = "munchy_favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoritedFood[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const isFavorited = useCallback((fdcId: number) => favorites.some((f) => f.fdcId === fdcId), [favorites]);

  const getFavorite = useCallback((fdcId: number) => favorites.find((f) => f.fdcId === fdcId), [favorites]);

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

  const updateFavoriteCache = useCallback((fdcId: number, cache: NutritionalData) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.fdcId === fdcId);
      if (!exists) return prev;

      const next = prev.map((f) => (f.fdcId === fdcId ? { ...f, nutrientCache: cache } : f));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  return { favorites, isFavorited, getFavorite, toggleFavorite, updateFavoriteCache };
}
