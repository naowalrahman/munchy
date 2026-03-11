"use client";

import { Box, Button, HStack, Input, Text, VStack, Spinner } from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { getRecipes, logRecipeToMeal } from "@/app/actions/recipes";
import type { Recipe } from "@/app/actions/recipes";
import { toaster } from "@/components/ui/toaster";

interface RecipesSectionProps {
  mealName: string;
  selectedDate: string;
  onRecipeAdded: () => void;
  onClose: () => void;
}

export function RecipesSection({ mealName, selectedDate, onRecipeAdded, onClose }: RecipesSectionProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [servingsInput, setServingsInput] = useState("1");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    getRecipes()
      .then((res) => {
        if (res.success && res.data) setRecipes(res.data);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const servings = (() => {
    const n = parseFloat(servingsInput);
    return !isNaN(n) && n > 0 ? n : 1;
  })();

  const handleAdd = async () => {
    if (!selectedRecipe) return;
    setIsSaving(true);
    try {
      const res = await logRecipeToMeal({
        recipe_id: selectedRecipe.id,
        meal_name: mealName,
        date: selectedDate,
        servings_multiplier: servings,
      });
      if (res.success) {
        toaster.create({ title: "Recipe added", type: "success" });
        onRecipeAdded();
        onClose();
      } else {
        toaster.create({ title: "Failed to add recipe", description: res.error, type: "error" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const perServing =
    selectedRecipe && selectedRecipe.servings > 0
      ? {
          calories: (selectedRecipe.calories / selectedRecipe.servings) * servings,
          protein: selectedRecipe.protein != null ? (selectedRecipe.protein / selectedRecipe.servings) * servings : 0,
          carbs:
            selectedRecipe.carbohydrates != null
              ? (selectedRecipe.carbohydrates / selectedRecipe.servings) * servings
              : 0,
          fat:
            selectedRecipe.total_fat != null ? (selectedRecipe.total_fat / selectedRecipe.servings) * servings : 0,
        }
      : null;

  if (isLoading) {
    return (
      <HStack justify="center" py={8}>
        <Spinner colorPalette="brand" />
      </HStack>
    );
  }

  if (recipes.length === 0) {
    return (
      <Text color="text.muted" fontSize="sm">
        No recipes yet. Create one from the Recipes page.
      </Text>
    );
  }

  return (
    <VStack align="stretch" gap={4}>
      <VStack align="stretch" gap={2} maxH="240px" overflowY="auto">
        {recipes.map((r) => (
          <Box
            key={r.id}
            p={3}
            borderRadius="md"
            borderWidth="1px"
            borderColor={selectedRecipe?.id === r.id ? "brand.500" : "border.default"}
            cursor="pointer"
            bg={selectedRecipe?.id === r.id ? "brand.subtle" : "background.subtle"}
            onClick={() => setSelectedRecipe(r)}
          >
            <Text fontWeight="medium">{r.name}</Text>
            <Text fontSize="xs" color="text.muted">
              {(r.calories / r.servings).toFixed(0)} cal/serving · {r.servings} servings
            </Text>
          </Box>
        ))}
      </VStack>

      {selectedRecipe && (
        <>
          <HStack align="center" gap={2}>
            <Text fontSize="sm" fontWeight="medium">
              Servings:
            </Text>
            <Input
              type="number"
              min={0.1}
              step="any"
              inputMode="decimal"
              w="80px"
              value={servingsInput}
              onChange={(e) => setServingsInput(e.target.value)}
            />
          </HStack>
          {perServing && (
            <Box p={2} bg="background.subtle" borderRadius="md" fontSize="sm" color="text.muted">
              Total: {perServing.calories.toFixed(0)} cal · P: {perServing.protein.toFixed(0)}g · C:{" "}
              {perServing.carbs.toFixed(0)}g · F: {perServing.fat.toFixed(0)}g
            </Box>
          )}
          <Button
            colorPalette="brand"
            w="full"
            onClick={handleAdd}
            disabled={servings <= 0 || isSaving}
            loading={isSaving}
          >
            Add Recipe to {mealName}
          </Button>
        </>
      )}
    </VStack>
  );
}
