"use client";

import { Box, VStack, HStack, Text, Input, Button, Spinner, IconButton } from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { IoSearch, IoTrash, IoAdd } from "react-icons/io5";
import type { RecipeIngredient } from "@/app/actions/recipes";
import type { FoodSearchResult, NutritionalData } from "@/app/actions/food";
import { searchFoods, getFoodNutrition } from "@/app/actions/food";
import { toaster } from "@/components/ui/toaster";
import { ServingSizeControl } from "@/components/dashboard/ServingSizeControl";

interface RecipeIngredientBuilderProps {
  ingredients: RecipeIngredient[];
  onChange: (ingredients: RecipeIngredient[]) => void;
}

const normalizeUnit = (unit: string): string => {
  const unitMap: Record<string, string> = {
    g: "g",
    gram: "g",
    grams: "g",
    oz: "oz",
    cup: "cup",
    cups: "cup",
    tbsp: "tbsp",
    tsp: "tsp",
    serving: "serving",
  };
  return unitMap[unit.toLowerCase().trim()] || unit.toLowerCase().trim();
};

function computeNutrition(
  nutritionData: NutritionalData,
  servingAmount: number,
  servingUnit: string
): { calories: number; protein: number; carbohydrates: number; total_fat: number } {
  const servingSize = nutritionData.servingSize || 100;
  const servingSizeUnit = normalizeUnit(nutritionData.servingSizeUnit || "g");
  const unit = normalizeUnit(servingUnit);

  let multiplier = servingAmount;
  if (servingSize > 0) {
    if (unit === "serving") {
      multiplier = servingAmount;
    } else if (unit === servingSizeUnit) {
      multiplier = servingAmount / servingSize;
    }
  }

  return {
    calories: nutritionData.calories * multiplier,
    protein: nutritionData.protein ? nutritionData.protein.amount * multiplier : 0,
    carbohydrates: nutritionData.carbohydrates ? nutritionData.carbohydrates.amount * multiplier : 0,
    total_fat: nutritionData.totalFat ? nutritionData.totalFat.amount * multiplier : 0,
  };
}

export function RecipeIngredientBuilder({ ingredients, onChange }: RecipeIngredientBuilderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<NutritionalData | null>(null);
  const [pendingAmount, setPendingAmount] = useState(1);
  const [pendingUnit, setPendingUnit] = useState("serving");
  const [isLoadingNutrition, setIsLoadingNutrition] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchFoods(searchQuery, 15);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleFoodClick = async (food: FoodSearchResult) => {
    setIsLoadingNutrition(true);
    try {
      const nutritionData = await getFoodNutrition(food.fdcId);
      setSelectedFood(nutritionData);
      setPendingAmount(1);
      setPendingUnit(nutritionData.servingSizeUnit || "g");
    } catch (error) {
      toaster.create({
        title: "Failed to load nutrition",
        description: error instanceof Error ? error.message : "Could not load food details",
        type: "error",
      });
    } finally {
      setIsLoadingNutrition(false);
    }
  };

  const handleAddIngredient = () => {
    if (!selectedFood) return;
    const nut = computeNutrition(selectedFood, pendingAmount, pendingUnit);
    const newIng: RecipeIngredient = {
      food_fdc_id: selectedFood.fdcId,
      food_description: selectedFood.description,
      serving_amount: pendingAmount,
      serving_unit: pendingUnit,
      calories: nut.calories,
      protein: nut.protein,
      carbohydrates: nut.carbohydrates,
      total_fat: nut.total_fat,
      sort_order: ingredients.length,
    };
    onChange([...ingredients, newIng]);
    setSelectedFood(null);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveIngredient = (index: number) => {
    const next = ingredients.filter((_, i) => i !== index).map((ing, i) => ({ ...ing, sort_order: i }));
    onChange(next);
  };

  return (
    <VStack align="stretch" gap={4}>
      <Text fontWeight="medium" color="text.default">
        Ingredients
      </Text>

      <Box position="relative">
        <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="text.muted" zIndex={1}>
          <IoSearch size={18} />
        </Box>
        <Input
          placeholder="Search foods to add..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          pl={10}
          bg="background.subtle"
          borderColor="border.default"
        />
      </Box>

      {isSearching && (
        <HStack justify="center" py={4}>
          <Spinner size="sm" colorPalette="brand" />
        </HStack>
      )}

      {!isSearching && searchResults.length > 0 && (
        <Box maxH="200px" overflowY="auto" borderRadius="md" borderWidth="1px" borderColor="border.default">
          {searchResults.map((food) => (
            <Box
              key={food.fdcId}
              p={3}
              cursor="pointer"
              _hover={{ bg: "background.subtle" }}
              borderBottomWidth="1px"
              borderColor="border.muted"
              onClick={() => handleFoodClick(food)}
            >
              <Text fontSize="sm" fontWeight="medium">
                {food.description}
              </Text>
              {food.brandName && (
                <Text fontSize="xs" color="text.muted">
                  {food.brandName}
                </Text>
              )}
            </Box>
          ))}
        </Box>
      )}

      {selectedFood && (
        <Box p={4} bg="background.subtle" borderRadius="md" borderWidth="1px" borderColor="border.default">
          <Text fontWeight="medium" mb={2}>
            {selectedFood.description}
          </Text>
          <ServingSizeControl
            defaultAmount={pendingAmount}
            defaultUnit={pendingUnit}
            servingSize={selectedFood.servingSize}
            servingSizeUnit={selectedFood.servingSizeUnit}
            onChange={(amount, unit) => {
              setPendingAmount(amount);
              setPendingUnit(unit);
            }}
          />
          <Button
            size="sm"
            colorPalette="brand"
            mt={3}
            onClick={handleAddIngredient}
            disabled={isLoadingNutrition}
          >
            <IoAdd />
            Add to recipe
          </Button>
        </Box>
      )}

      {ingredients.length > 0 && (
        <VStack align="stretch" gap={2}>
          {ingredients.map((ing, i) => (
            <HStack
              key={i}
              justify="space-between"
              p={3}
              bg="background.panel"
              borderRadius="md"
              borderWidth="1px"
              borderColor="border.muted"
            >
              <Box flex="1" minW={0}>
                <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
                  {ing.food_description}
                </Text>
                <Text fontSize="xs" color="text.muted">
                  {ing.serving_amount} {ing.serving_unit} · {ing.calories.toFixed(0)} cal
                </Text>
              </Box>
              <IconButton
                aria-label="Remove ingredient"
                size="sm"
                variant="ghost"
                colorPalette="red"
                onClick={() => handleRemoveIngredient(i)}
              >
                <IoTrash />
              </IconButton>
            </HStack>
          ))}
        </VStack>
      )}
    </VStack>
  );
}
