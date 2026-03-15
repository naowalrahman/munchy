"use client";

import { Box, VStack, HStack, Text, Button, Heading, Spinner, useBreakpointValue } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoBarcodeOutline, IoClose, IoHeart, IoRestaurant, IoSearch } from "react-icons/io5";
import type { FoodSearchResult, NutritionalData } from "@/app/actions/food";
import { getFoodNutrition, lookupBarcode } from "@/app/actions/food";
import { logFoodEntry } from "@/app/actions/foodLog";
import { getNutritionMultiplier } from "@/utils/nutritionMultiplier";
import { toaster } from "@/components/ui/toaster";
import { NutritionFactsDrawer } from "../dashboard/NutritionFactsDrawer";
import { Recipe } from "@/app/actions/recipes";
import { FavoritesSection } from "./FavoritesSection";
import { RecipesSection } from "./RecipesSection";
import { ScanSection } from "./ScanSection";
import { SearchSection } from "./SearchSection";
import { StagedItemsCard } from "./StagedItemsCard";
import { useBarcodeScanner } from "./useBarcodeScanner";
import { useFavorites } from "./useFavorites";
import { useFoodSearch } from "./useFoodSearch";
import type { FavoritedFood, FoodSearchDialogProps, InputMode, StagedFood } from "./types";

const MotionBox = motion.create(Box);

export function FoodSearchDialog({
  isOpen,
  onClose,
  mealName,
  selectedDate,
  onFoodAdded,
  recipeMode = false,
  onRecipeItemsAdded,
}: FoodSearchDialogProps) {
  const [selectedFood, setSelectedFood] = useState<NutritionalData | null>(null);
  const [isNutritionDrawerOpen, setIsNutritionDrawerOpen] = useState(false);
  const [isLoadingNutrition, setIsLoadingNutrition] = useState(false);
  const [stagedItems, setStagedItems] = useState<StagedFood[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("search");
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [selectedRecipeGroupId, setSelectedRecipeGroupId] = useState<string | null>(null);
  const [selectedRecipeName, setSelectedRecipeName] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const { searchQuery, setSearchQuery, searchResults, isSearching, resetSearch } = useFoodSearch(inputMode);
  const { favorites, isFavorited, toggleFavorite, getFavorite, updateFavoriteCache } = useFavorites();

  // Used for conditional rendering and motion animations only
  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;

  const handleBarcodeNutritionLoaded = useCallback((nutritionData: NutritionalData, barcode: string) => {
    setSelectedFood(nutritionData);
    setScannedBarcode(barcode);
    setIsNutritionDrawerOpen(true);
  }, []);

  const { isScannerReady, scannerError, isStartingScanner, startScanner, resetScannerState } = useBarcodeScanner({
    isOpen,
    enabled: inputMode === "scan",
    onNutritionLoaded: handleBarcodeNutritionLoaded,
    setIsLoadingNutrition,
  });

  const openNutritionDrawer = async (fdcId: number, barcode: string | null) => {
    // Check cache first if it's favorited
    const favoritedItem = getFavorite(fdcId);
    if (favoritedItem?.nutrientCache) {
      setSelectedFood(favoritedItem.nutrientCache);
      setScannedBarcode(barcode);
      setIsNutritionDrawerOpen(true);
      return;
    }

    setIsLoadingNutrition(true);
    try {
      let nutritionData: NutritionalData;
      if (barcode) {
        nutritionData = await lookupBarcode(barcode);
        setScannedBarcode(barcode);
      } else {
        nutritionData = await getFoodNutrition(fdcId);
        setScannedBarcode(null);
      }
      
      // Update cache if favorited
      if (favoritedItem) {
        updateFavoriteCache(fdcId, nutritionData);
      }
      
      setSelectedFood(nutritionData);
      setIsNutritionDrawerOpen(true);
    } catch (error) {
      console.error("Error loading nutrition:", error);
      toaster.create({
        title: "Failed to load nutrition",
        description: error instanceof Error ? error.message : "Could not load nutrition information",
        type: "error",
      });
    } finally {
      setIsLoadingNutrition(false);
    }
  };

  const handleFoodClick = async (food: FoodSearchResult) => {
    await openNutritionDrawer(food.fdcId, null);
  };

  const handleFavoriteClick = async (food: FavoritedFood) => {
    await openNutritionDrawer(food.fdcId, food.barcode ?? null);
  };

  const handleToggleFavoriteFromSearch = (food: FoodSearchResult) => {
    toggleFavorite({
      fdcId: food.fdcId,
      description: food.description,
      brandName: food.brandName,
      servingSize: food.servingSize,
      servingSizeUnit: food.servingSizeUnit,
    });
  };

  const handleToggleFavoriteFromDrawer = () => {
    if (!selectedFood) return;
    toggleFavorite({
      fdcId: selectedFood.fdcId,
      description: selectedFood.description,
      brandName: selectedFood.brandName,
      servingSize: selectedFood.servingSize,
      servingSizeUnit: selectedFood.servingSizeUnit,
      barcode: scannedBarcode ?? undefined,
      nutrientCache: selectedFood,
    });
  };

  const stageFood = (servingAmount: number, servingUnit: string, nutritionData: NutritionalData) => {
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setStagedItems((prev) => [
      ...prev,
      { id, nutritionData, servingAmount, servingUnit, barcode: scannedBarcode || null },
    ]);

    toaster.create({
      title: "Staged item",
      description: `${nutritionData.description} added to pending list`,
      type: "success",
    });

    setScannedBarcode(null);
    setSelectedFood(null);
    setIsNutritionDrawerOpen(false);
  };

  const handleRemoveStaged = (id: string) => {
    setStagedItems((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      // Clear recipe info if no items left
      if (filtered.length === 0) {
        setSelectedRecipeGroupId(null);
        setSelectedRecipeName(null);
      }
      return filtered;
    });
  };

  const handleSaveAll = async () => {
    if (stagedItems.length === 0) return;
    setIsSaving(true);

    const savedIds = new Set<string>();
    // Generate a single recipe_group_id for all items if they came from a recipe
    const recipeGroupId = selectedRecipeGroupId || null;
    const recipeName = selectedRecipeName || null;

    try {
      for (const item of stagedItems) {
        const m = getNutritionMultiplier(item.servingAmount, item.servingUnit, item.nutritionData.servingSize, item.nutritionData.servingSizeUnit);

        const response = await logFoodEntry({
          meal_name: mealName,
          food_fdc_id: item.nutritionData.fdcId,
          food_description: item.nutritionData.description,
          serving_amount: item.servingAmount,
          serving_unit: item.servingUnit,
          calories: item.nutritionData.calories * m,
          protein: item.nutritionData.protein ? item.nutritionData.protein.amount * m : null,
          carbohydrates: item.nutritionData.carbohydrates ? item.nutritionData.carbohydrates.amount * m : null,
          date: selectedDate,
          total_fat: item.nutritionData.totalFat ? item.nutritionData.totalFat.amount * m : null,
          barcode: item.barcode,
          recipe_group_id: recipeGroupId,
          recipe_name: recipeName,
        });

        if (!response.success) {
          throw new Error(response.error || "Failed to save an item");
        }

        savedIds.add(item.id);
      }

      toaster.create({
        title: "Foods added",
        description: `${stagedItems.length} item(s) added to ${mealName}`,
        type: "success",
      });
      setStagedItems([]);
      setScannedBarcode(null);
      setSelectedRecipeGroupId(null);
      setSelectedRecipeName(null);
      onFoodAdded();
      onClose();
    } catch (error) {
      console.error("Error saving staged items:", error);

      if (savedIds.size > 0) {
        setStagedItems((prev) => prev.filter((item) => !savedIds.has(item.id)));
      }

      toaster.create({
        title: savedIds.size > 0 ? "Partially saved" : "Save failed",
        description:
          error instanceof Error
            ? error.message
            : savedIds.size > 0
              ? "Some items were saved before an error occurred."
              : "Could not save items",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDrawerClose = () => {
    setIsNutritionDrawerOpen(false);
    setSelectedFood(null);
    setScannedBarcode(null);
    if (inputMode === "scan" && isOpen) {
      startScanner();
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    resetSearch();
    setSelectedFood(null);
    setScannedBarcode(null);
    setIsNutritionDrawerOpen(false);
    setStagedItems([]);
    setInputMode("search");
    resetScannerState();
    setSelectedRecipeGroupId(null);
    setSelectedRecipeName(null);
    setSelectedRecipe(null);
    onClose();
  };

  const handleModeToggle = (newMode: InputMode) => {
    if (newMode === inputMode || isSaving) return;
    setInputMode(newMode);
    resetScannerState();
  };

  const headingText =
    inputMode === "search"
      ? "Search Foods"
      : inputMode === "scan"
        ? "Scan Barcode"
        : inputMode === "favorites"
          ? "Favorites"
          : "Recipes";

  const handleRecipeServingsConfirm: typeof stageFood = (servingAmount) => {
    if (!selectedRecipe) return;

    const scaleFactor = servingAmount / (selectedRecipe.servings || 1);
    const items = selectedRecipe.items || [];

    const stagedFromRecipe: StagedFood[] = items.map((item) => ({
      id: crypto.randomUUID(),
      nutritionData: {
        fdcId: item.food_fdc_id,
        description: item.food_description,
        servingSize: 100,
        servingSizeUnit: item.serving_unit,
        calories: item.calories * scaleFactor,
        protein: item.protein
          ? { name: "Protein", amount: item.protein * scaleFactor, unit: "g" }
          : null,
        carbohydrates: item.carbohydrates
          ? { name: "Carbohydrates", amount: item.carbohydrates * scaleFactor, unit: "g" }
          : null,
        totalFat: item.total_fat
          ? { name: "Total Fat", amount: item.total_fat * scaleFactor, unit: "g" }
          : null,
        fiber: item.fiber ? { name: "Fiber", amount: item.fiber * scaleFactor, unit: "g" } : null,
        sugars: item.sugars ? { name: "Sugars", amount: item.sugars * scaleFactor, unit: "g" } : null,
        sodium: item.sodium ? { name: "Sodium", amount: item.sodium * scaleFactor, unit: "mg" } : null,
        potassium: item.potassium ? { name: "Potassium", amount: item.potassium * scaleFactor, unit: "mg" } : null,
        calcium: item.calcium ? { name: "Calcium", amount: item.calcium * scaleFactor, unit: "mg" } : null,
        iron: item.iron ? { name: "Iron", amount: item.iron * scaleFactor, unit: "mg" } : null,
        vitaminC: item.vitamin_c ? { name: "Vitamin C", amount: item.vitamin_c * scaleFactor, unit: "mg" } : null,
        vitaminA: item.vitamin_a ? { name: "Vitamin A", amount: item.vitamin_a * scaleFactor, unit: "µg" } : null,
      } as NutritionalData,
      servingAmount: item.serving_amount * scaleFactor,
      servingUnit: item.serving_unit,
      barcode: item.barcode,
    }));

    if (recipeMode && onRecipeItemsAdded) {
      onRecipeItemsAdded(stagedFromRecipe);
      onClose();
    } else {
      setStagedItems((prev) => [...prev, ...stagedFromRecipe]);
      setSelectedRecipeGroupId(crypto.randomUUID());
      setSelectedRecipeName(selectedRecipe.name);
      toaster.create({
        title: "Recipe added",
        description: `${stagedFromRecipe.length} item(s) staged from "${selectedRecipe.name}"`,
        type: "success",
      });
    }

    setIsNutritionDrawerOpen(false);
    setSelectedFood(null);
    setSelectedRecipe(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && !isMobile && (
          <MotionBox
            position="fixed"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="blackAlpha.700"
            zIndex={999}
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <MotionBox
            position="fixed"
            top={{ base: 0, md: "10%" }}
            left={{ base: 0, md: "50%" }}
            right={{ base: 0, md: "auto" }}
            bottom={{ base: 0, md: "auto" }}
            w={{ base: "100vw", md: "600px" }}
            maxW={{ base: "100vw", md: "600px" }}
            h={{ base: "100dvh", md: "auto" }}
            maxH={{ base: "100dvh", md: "85vh" }}
            scale={1}
            bg="background.canvas"
            borderRadius={{ base: 0, md: "xl" }}
            borderWidth={{ base: 0, md: "1px" }}
            borderColor="border.default"
            boxShadow="2xl"
            zIndex={1000}
            p={{ base: 4, md: 6 }}
            initial={isMobile ? { opacity: 0, x: -64 } : { x: "-100vw", opacity: 0 }}
            animate={isMobile ? { opacity: 1, x: 0 } : { x: "-50%", opacity: 1 }}
            exit={isMobile ? { opacity: 0, x: -64 } : { x: "-100vw", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            overflowY="auto"
          >
            <VStack align="stretch" gap={{ base: 3, md: 4 }} h="full">
              <HStack justify="space-between" align="center">
                <Heading size={{ base: "md", md: "lg" }} color="text.default">
                  {headingText}
                </Heading>
                <Button onClick={handleClose} variant="ghost" size="sm" colorPalette="gray">
                  <IoClose size={24} />
                </Button>
              </HStack>

              <Text color="text.muted" fontSize="sm">
                Add to:{" "}
                <Text as="span" color="brand.500" fontWeight="semibold">
                  {mealName}
                </Text>
              </Text>

              <HStack gap={2}>
                <Button
                  flex={1}
                  variant={inputMode === "search" ? "solid" : "outline"}
                  colorPalette={inputMode === "search" ? "brand" : "gray"}
                  onClick={() => handleModeToggle("search")}
                  size={{ base: "sm", md: "md" }}
                >
                  <IoSearch size={18} />
                  <Text ml={2}>Search</Text>
                </Button>
                <Button
                  flex={1}
                  variant={inputMode === "scan" ? "solid" : "outline"}
                  colorPalette={inputMode === "scan" ? "brand" : "gray"}
                  onClick={() => handleModeToggle("scan")}
                  size={{ base: "sm", md: "md" }}
                >
                  <IoBarcodeOutline size={18} />
                  <Text ml={2}>Scan</Text>
                </Button>
                <Button
                  flex={1}
                  variant={inputMode === "favorites" ? "solid" : "outline"}
                  colorPalette={inputMode === "favorites" ? "brand" : "gray"}
                  onClick={() => handleModeToggle("favorites")}
                  size={{ base: "sm", md: "md" }}
                >
                  <IoHeart size={18} />
                  <Text ml={2}>Favorites</Text>
                </Button>
                <Button
                  flex={1}
                  variant={inputMode === "recipes" ? "solid" : "outline"}
                  colorPalette={inputMode === "recipes" ? "brand" : "gray"}
                  onClick={() => handleModeToggle("recipes")}
                  size={{ base: "sm", md: "md" }}
                >
                  <IoRestaurant size={18} />
                  <Text ml={2}>Recipes</Text>
                </Button>
              </HStack>

              {inputMode === "search" ? (
                <SearchSection
                  searchQuery={searchQuery}
                  onSearchQueryChange={setSearchQuery}
                  isSearching={isSearching}
                  searchResults={searchResults}
                  onFoodClick={handleFoodClick}
                  isFavorited={isFavorited}
                  onToggleFavorite={handleToggleFavoriteFromSearch}
                />
              ) : inputMode === "scan" ? (
                <ScanSection
                  isScannerReady={isScannerReady}
                  isStartingScanner={isStartingScanner}
                  scannerError={scannerError}
                  onRetry={startScanner}
                />
              ) : inputMode === "favorites" ? (
                <FavoritesSection
                  favorites={favorites}
                  onFoodClick={handleFavoriteClick}
                  onToggleFavorite={toggleFavorite}
                />
              ) : (
                <RecipesSection
                  onRecipeSelect={(recipe) => {
                    setSelectedRecipe(recipe);

                    const ps = 1 / (recipe.servings || 1);
                    const items = recipe.items || [];

                    const agg = (field: keyof typeof items[0], name: string, unit: string) => {
                      const total = items.reduce((s, i) => s + ((i[field] as number | null) || 0) * ps, 0);
                      return items.some((i) => i[field] != null) ? { name, amount: total, unit } : null;
                    };

                    const aggregated: NutritionalData = {
                      fdcId: 0,
                      description: recipe.name,
                      servingSize: 1,
                      servingSizeUnit: "serving",
                      calories: items.reduce((s, i) => s + i.calories * ps, 0),
                      protein: { name: "Protein", amount: items.reduce((s, i) => s + (i.protein || 0) * ps, 0), unit: "g" },
                      carbohydrates: { name: "Carbohydrates", amount: items.reduce((s, i) => s + (i.carbohydrates || 0) * ps, 0), unit: "g" },
                      totalFat: { name: "Total Fat", amount: items.reduce((s, i) => s + (i.total_fat || 0) * ps, 0), unit: "g" },
                      fiber: agg("fiber", "Fiber", "g"),
                      sugars: agg("sugars", "Sugars", "g"),
                      sodium: agg("sodium", "Sodium", "mg"),
                      potassium: agg("potassium", "Potassium", "mg"),
                      calcium: agg("calcium", "Calcium", "mg"),
                      iron: agg("iron", "Iron", "mg"),
                      vitaminC: agg("vitamin_c", "Vitamin C", "mg"),
                      vitaminA: agg("vitamin_a", "Vitamin A", "µg"),
                    };

                    setSelectedFood(aggregated);
                    setIsNutritionDrawerOpen(true);
                  }}
                />
              )}

              <StagedItemsCard stagedItems={stagedItems} onRemove={handleRemoveStaged} />

              <HStack gap={3} pt={1}>
                <Button variant="outline" colorPalette="gray" onClick={handleClose} flex={1} disabled={isSaving}>
                  Cancel
                </Button>
                {recipeMode ? (
                  <Button
                    colorPalette="brand"
                    flex={1}
                    onClick={() => {
                      if (stagedItems.length > 0 && onRecipeItemsAdded) {
                        onRecipeItemsAdded(stagedItems);
                      }
                      onClose();
                    }}
                    disabled={stagedItems.length === 0}
                  >
                    Add to Recipe {stagedItems.length > 0 ? `(${stagedItems.length})` : ""}
                  </Button>
                ) : (
                  <Button
                    colorPalette="brand"
                    flex={1}
                    onClick={handleSaveAll}
                    loading={isSaving}
                    disabled={stagedItems.length === 0 || isSaving}
                  >
                    Save {stagedItems.length > 0 ? `(${stagedItems.length})` : ""}
                  </Button>
                )}
              </HStack>
            </VStack>
          </MotionBox>
        )}
      </AnimatePresence>

      {isLoadingNutrition ? (
        <Box position="fixed" top="50%" left="50%" transform="translate(-50%, -50%)" zIndex={1002}>
          <Spinner size="xl" colorPalette="brand" />
        </Box>
      ) : (
        isNutritionDrawerOpen &&
        selectedFood && (
          <NutritionFactsDrawer
            key={`${selectedFood.fdcId}-${selectedRecipe?.id ?? "food"}`}
            nutritionData={selectedFood}
            mealName={mealName}
            isOpen={isNutritionDrawerOpen}
            onClose={() => {
              handleDrawerClose();
              setSelectedRecipe(null);
            }}
            onAddToMeal={selectedRecipe ? handleRecipeServingsConfirm : stageFood}
            isFavorited={selectedRecipe ? undefined : isFavorited(selectedFood.fdcId)}
            onToggleFavorite={selectedRecipe ? undefined : handleToggleFavoriteFromDrawer}
            subtitle={
              selectedRecipe
                ? `Recipe · ${selectedRecipe.servings} ${selectedRecipe.servings === 1 ? "serving" : "servings"} total`
                : undefined
            }
          />
        )
      )}
    </>
  );
}
