import { useEffect, useState } from "react";
import type { FoodSearchResult } from "@/app/actions/food";
import { searchFoods } from "@/app/actions/food";
import { toaster } from "@/components/ui/toaster";
import type { InputMode } from "./types";

interface UseFoodSearchResult {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchResults: FoodSearchResult[];
  isSearching: boolean;
  resetSearch: () => void;
}

export function useFoodSearch(inputMode: InputMode): UseFoodSearchResult {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (inputMode !== "search") return;

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchFoods(searchQuery, 20);
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
        toaster.create({
          title: "Search failed",
          description: error instanceof Error ? error.message : "Failed to search foods",
          type: "error",
        });
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, inputMode]);

  const resetSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
  };

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    resetSearch,
  };
}
