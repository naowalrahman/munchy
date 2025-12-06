"use client";

import { Box, VStack, HStack, Text, Button, Heading, Spinner } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { IoBarcodeOutline, IoClose, IoSearch } from "react-icons/io5";
import type { FoodSearchResult, NutritionalData } from "@/app/actions/food";
import { getFoodNutrition } from "@/app/actions/food";
import { logFoodEntry } from "@/app/actions/foodLog";
import { toaster } from "@/components/ui/toaster";
import type { NutritionFactsDrawerProps } from "../dashboard/NutritionFactsDrawer";
import { ScanSection } from "./ScanSection";
import { SearchSection } from "./SearchSection";
import { StagedItemsCard } from "./StagedItemsCard";
import { useBarcodeScanner } from "./useBarcodeScanner";
import { useFoodSearch } from "./useFoodSearch";
import type { FoodSearchDialogProps, InputMode, StagedFood } from "./types";

const MotionBox = motion.create(Box);

const NutritionFactsDrawer = dynamic<NutritionFactsDrawerProps>(
  () => import("../dashboard/NutritionFactsDrawer").then((mod) => mod.NutritionFactsDrawer),
  { ssr: false }
);

const normalizeUnit = (unit: string): string => {
  const unitMap: Record<string, string> = {
    g: "g",
    gram: "g",
    grams: "g",
    oz: "oz",
    ounce: "oz",
    ounces: "oz",
    lb: "lb",
    pound: "lb",
    pounds: "lb",
    ml: "ml",
    milliliter: "ml",
    milliliters: "ml",
    cup: "cup",
    cups: "cup",
    tbsp: "tbsp",
    tablespoon: "tbsp",
    tablespoons: "tbsp",
    tsp: "tsp",
    teaspoon: "tsp",
    teaspoons: "tsp",
    piece: "piece",
    pieces: "piece",
    slice: "slice",
    slices: "slice",
  };

  const normalized = unit.toLowerCase().trim();
  return unitMap[normalized] || normalized;
};

export function FoodSearchDialog({ isOpen, onClose, mealName, onFoodAdded }: FoodSearchDialogProps) {
  const [selectedFood, setSelectedFood] = useState<NutritionalData | null>(null);
  const [isNutritionDrawerOpen, setIsNutritionDrawerOpen] = useState(false);
  const [isLoadingNutrition, setIsLoadingNutrition] = useState(false);
  const [stagedItems, setStagedItems] = useState<StagedFood[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>("search");
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);

  const { searchQuery, setSearchQuery, searchResults, isSearching, resetSearch } = useFoodSearch(inputMode);

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

  const handleFoodClick = async (food: FoodSearchResult) => {
    setIsLoadingNutrition(true);
    try {
      const nutritionData = await getFoodNutrition(food.fdcId);
      setSelectedFood(nutritionData);
      setScannedBarcode(null);
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
    setStagedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveAll = async () => {
    if (stagedItems.length === 0) return;
    setIsSaving(true);

    const savedIds = new Set<string>();

    try {
      for (const item of stagedItems) {
        let multiplier = item.servingAmount;
        const servingSizeForCalc = item.nutritionData.servingSize || 100;
        const servingSizeUnitNormalized = normalizeUnit(item.nutritionData.servingSizeUnit || "g");
        const currentUnitNormalized = normalizeUnit(item.servingUnit);

        if (servingSizeForCalc > 0) {
          if (currentUnitNormalized === "serving") {
            multiplier = item.servingAmount;
          } else if (currentUnitNormalized === servingSizeUnitNormalized) {
            multiplier = item.servingAmount / servingSizeForCalc;
          }
        }

        const response = await logFoodEntry({
          meal_name: mealName,
          food_fdc_id: item.nutritionData.fdcId,
          food_description: item.nutritionData.description,
          serving_amount: item.servingAmount,
          serving_unit: item.servingUnit,
          calories: item.nutritionData.calories * multiplier,
          protein: item.nutritionData.protein ? item.nutritionData.protein.amount * multiplier : null,
          carbohydrates: item.nutritionData.carbohydrates ? item.nutritionData.carbohydrates.amount * multiplier : null,
          total_fat: item.nutritionData.totalFat ? item.nutritionData.totalFat.amount * multiplier : null,
          barcode: item.barcode,
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
    onClose();
  };

  const handleModeToggle = (newMode: InputMode) => {
    if (newMode === inputMode || isSaving) return;
    setInputMode(newMode);
    resetScannerState();
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
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
            top="50%"
            left="50%"
            w={{ base: "95vw", md: "600px" }}
            maxH="85vh"
            bg="background.canvas"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="border.default"
            boxShadow="2xl"
            zIndex={1000}
            p={6}
            initial={{ x: "-50%", y: "-50%", opacity: 0, scale: 0.95 }}
            animate={{ x: "-50%", y: "-50%", opacity: 1, scale: 1 }}
            exit={{ x: "-50%", y: "-50%", opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            overflowY="auto"
          >
            <VStack align="stretch" gap={4} h="full">
              <HStack justify="space-between" align="center">
                <Heading size="lg" color="text.default">
                  {inputMode === "search" ? "Search Foods" : "Scan Barcode"}
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
                  size="md"
                >
                  <IoSearch size={18} />
                  <Text ml={2}>Search</Text>
                </Button>
                <Button
                  flex={1}
                  variant={inputMode === "scan" ? "solid" : "outline"}
                  colorPalette={inputMode === "scan" ? "brand" : "gray"}
                  onClick={() => handleModeToggle("scan")}
                  size="md"
                >
                  <IoBarcodeOutline size={18} />
                  <Text ml={2}>Scan</Text>
                </Button>
              </HStack>

              {inputMode === "search" ? (
                <SearchSection
                  searchQuery={searchQuery}
                  onSearchQueryChange={setSearchQuery}
                  isSearching={isSearching}
                  searchResults={searchResults}
                  onFoodClick={handleFoodClick}
                />
              ) : (
                <ScanSection
                  isScannerReady={isScannerReady}
                  isStartingScanner={isStartingScanner}
                  scannerError={scannerError}
                  onRetry={startScanner}
                />
              )}

              <StagedItemsCard stagedItems={stagedItems} onRemove={handleRemoveStaged} />

              <HStack gap={3} pt={1}>
                <Button variant="outline" colorPalette="gray" onClick={handleClose} flex={1} disabled={isSaving}>
                  Cancel
                </Button>
                <Button
                  colorPalette="brand"
                  flex={1}
                  onClick={handleSaveAll}
                  loading={isSaving}
                  disabled={stagedItems.length === 0 || isSaving}
                >
                  Save {stagedItems.length > 0 ? `(${stagedItems.length})` : ""}
                </Button>
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
            key={selectedFood.fdcId}
            nutritionData={selectedFood}
            mealName={mealName}
            isOpen={isNutritionDrawerOpen}
            onClose={handleDrawerClose}
            onAddToMeal={stageFood}
          />
        )
      )}
    </>
  );
}

