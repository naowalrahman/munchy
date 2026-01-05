"use client";

import { Box, VStack, HStack, Text, Heading, IconButton, Spinner } from "@chakra-ui/react";
import { useState } from "react";
import { FoodLogEntry, deleteFoodEntry, updateFoodEntry } from "@/app/actions/foodLog";
import { getFoodNutrition, lookupBarcode, NutritionalData } from "@/app/actions/food";
import { motion, AnimatePresence } from "framer-motion";
import { IoAdd, IoTrash, IoPencil } from "react-icons/io5";
import { toaster } from "@/components/ui/toaster";
import { FoodSearchDialog } from "@/components/food-search/FoodSearchDialog";
import { NutritionFactsDrawer } from "./NutritionFactsDrawer";

interface MealSectionProps {
  mealName: string;
  entries: FoodLogEntry[];
  onFoodAdded: () => void;
  isCustom?: boolean;
  selectedDate: string;
}

const MotionBox = motion.create(Box);

export function MealSection({ mealName, entries, onFoodAdded, isCustom, selectedDate }: MealSectionProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<FoodLogEntry | null>(null);
  const [editNutritionData, setEditNutritionData] = useState<NutritionalData | null>(null);
  const [isLoadingEditData, setIsLoadingEditData] = useState(false);

  const totalCalories = entries.reduce((sum, entry) => sum + (entry.calories || 0), 0);
  const totalProtein = entries.reduce((sum, entry) => sum + (entry.protein || 0), 0);
  const totalCarbs = entries.reduce((sum, entry) => sum + (entry.carbohydrates || 0), 0);
  const totalFat = entries.reduce((sum, entry) => sum + (entry.total_fat || 0), 0);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await deleteFoodEntry(id);
      if (response.success) {
        toaster.create({
          title: "Food removed",
          description: "Food entry deleted successfully",
          type: "success",
        });
        onFoodAdded(); // Refresh the data
      } else {
        toaster.create({
          title: "Failed to delete",
          description: response.error || "Something went wrong",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error deleting food:", error);
      toaster.create({
        title: "Error",
        description: "Failed to delete food entry",
        type: "error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = async (entry: FoodLogEntry) => {
    setIsLoadingEditData(true);
    try {
      let nutritionData: NutritionalData;

      // If barcode exists, this is a barcode-scanned food - use Open Food Facts API
      if (entry.barcode) {
        nutritionData = await lookupBarcode(entry.barcode);
      } else {
        // Otherwise, use USDA API with the fdcId
        nutritionData = await getFoodNutrition(entry.food_fdc_id);
      }

      setEditNutritionData(nutritionData);
      setEditingEntry(entry);
    } catch (error) {
      console.error("Error loading nutrition data:", error);
      toaster.create({
        title: "Failed to load",
        description: "Could not load food details for editing",
        type: "error",
      });
    } finally {
      setIsLoadingEditData(false);
    }
  };

  // Helper function to normalize unit names for comparison
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

  const handleUpdateEntry = async (servingAmount: number, servingUnit: string, nutritionData: NutritionalData) => {
    if (!editingEntry) return;

    try {
      // Calculate nutrition values based on the new amount
      let multiplier = servingAmount;

      const servingSizeForCalc = nutritionData.servingSize || 100;
      const servingSizeUnitNormalized = normalizeUnit(nutritionData.servingSizeUnit || "g");
      const currentUnitNormalized = normalizeUnit(servingUnit);

      if (servingSizeForCalc > 0) {
        if (currentUnitNormalized === "serving") {
          // User selected "serving" - multiplier is just the amount
          multiplier = servingAmount;
        } else if (currentUnitNormalized === servingSizeUnitNormalized) {
          // User selected the same unit as the serving size (e.g., "cup" when serving is "cup")
          // Convert to servings: if 1 serving = 1 cup, then 2 cups = 2 servings
          multiplier = servingAmount / servingSizeForCalc;
        }
      }

      const response = await updateFoodEntry(editingEntry.id, {
        serving_amount: servingAmount,
        serving_unit: servingUnit,
        calories: nutritionData.calories * multiplier,
        protein: nutritionData.protein ? nutritionData.protein.amount * multiplier : null,
        carbohydrates: nutritionData.carbohydrates ? nutritionData.carbohydrates.amount * multiplier : null,
        total_fat: nutritionData.totalFat ? nutritionData.totalFat.amount * multiplier : null,
      });

      if (response.success) {
        toaster.create({
          title: "Entry updated",
          description: "Food entry updated successfully",
          type: "success",
        });
        onFoodAdded(); // Refresh the data
        setEditingEntry(null);
        setEditNutritionData(null);
      } else {
        toaster.create({
          title: "Failed to update",
          description: response.error || "Something went wrong",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error updating entry:", error);
      toaster.create({
        title: "Error",
        description: "Failed to update food entry",
        type: "error",
      });
    }
  };

  return (
    <>
      <Box
        bg="background.panel"
        borderRadius="none"
        p={0}
        backdropFilter="blur(12px)"
        boxShadow="0 4px 30px rgba(0, 0, 0, 0.1)"
        transition="all 0.2s"
        _hover={{
          borderColor: "brand.500/30",
          boxShadow: "0 8px 40px rgba(0, 0, 0, 0.15)",
        }}
      >
        <VStack align="stretch" gap={4}>
          {/* Header & Summary */}
          <HStack justify="space-between" align="center" gap={3} mb={1}>
            <HStack flex="1" gap={{ base: 2, md: 4 }} overflow="hidden">
              <Heading size="md" color="text.default" whiteSpace="nowrap">
                {mealName}
              </Heading>
              {entries.length > 0 && (
                <HStack
                  gap={{ base: 1.5, md: 3 }}
                  fontSize={{ base: "xs", md: "sm" }}
                  bg="background.canvas"
                  px={{ base: 2, md: 3 }}
                  py={1}
                  borderRadius="full"
                  borderWidth="1px"
                  borderColor="border.muted"
                >
                  <Text fontWeight="bold" color="brand.500" whiteSpace="nowrap">
                    {totalCalories.toFixed(0)} cal
                  </Text>
                  <HStack gap={{ base: 1.5, md: 3 }} color="text.muted" whiteSpace="nowrap">
                    <Text>
                      <Box as="span" color="text.default" fontWeight="bold">
                        P
                      </Box>{" "}
                      {totalProtein.toFixed(0)}g
                    </Text>
                    <Text>
                      <Box as="span" color="text.default" fontWeight="bold">
                        C
                      </Box>{" "}
                      {totalCarbs.toFixed(0)}g
                    </Text>
                    <Text>
                      <Box as="span" color="text.default" fontWeight="bold">
                        F
                      </Box>{" "}
                      {totalFat.toFixed(0)}g
                    </Text>
                  </HStack>
                </HStack>
              )}
            </HStack>
            <IconButton
              aria-label="Add food"
              colorPalette="brand"
              variant="subtle"
              size="sm"
              rounded="full"
              onClick={() => setIsSearchOpen(true)}
            >
              <IoAdd />
            </IconButton>
          </HStack>

          {/* Food Entries List */}
          <VStack align="stretch" gap={2}>
            <AnimatePresence>
              {entries.map((entry) => (
                <MotionBox
                  key={entry.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.2 }}
                >
                  <HStack
                    justify="space-between"
                    p={3}
                    bg="background.subtle"
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="border.muted"
                    transition="all 0.2s"
                    _hover={{
                      borderColor: "brand.500/50",
                      bg: "background.canvas",
                      transform: "translateX(4px)",
                    }}
                  >
                    <VStack align="start" gap={1} flex="1">
                      <Text color="text.default" fontWeight="medium" fontSize="sm">
                        {entry.food_description}
                      </Text>
                      <Text color="text.muted" fontSize="xs">
                        {entry.serving_amount} {entry.serving_unit} • {entry.calories.toFixed(0)} cal
                      </Text>
                    </VStack>
                    <HStack gap={1}>
                      <IconButton
                        aria-label="Edit food entry"
                        size="sm"
                        variant="ghost"
                        colorPalette="blue"
                        onClick={() => handleEdit(entry)}
                      >
                        <IoPencil />
                      </IconButton>
                      <IconButton
                        aria-label="Delete food entry"
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => handleDelete(entry.id)}
                        loading={deletingId === entry.id}
                      >
                        <IoTrash />
                      </IconButton>
                    </HStack>
                  </HStack>
                </MotionBox>
              ))}
            </AnimatePresence>
          </VStack>

          {/* Empty State */}
          {entries.length === 0 && (
            <Box
              py={8}
              textAlign="center"
              borderRadius="md"
              borderWidth="1px"
              borderColor="border.muted"
              borderStyle="dashed"
            >
              <Text color="text.muted" fontSize="sm">
                {isCustom
                  ? "This meal will only be saved if you add foods to it."
                  : 'No foods logged yet. Click "Add Food" to get started.'}
              </Text>
            </Box>
          )}
        </VStack>
      </Box>

      {/* Food Search Dialog */}
      {isSearchOpen && (
        <FoodSearchDialog
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          mealName={mealName}
          selectedDate={selectedDate}
          onFoodAdded={onFoodAdded}
        />
      )}

      {/* Edit Nutrition Facts Drawer */}
      {isLoadingEditData ? (
        <>
          <Box position="fixed" top={0} left={0} right={0} bottom={0} bg="blackAlpha.700" zIndex={999} />
          <Box position="fixed" top="50%" left="50%" transform="translate(-50%, -50%)" zIndex={1000}>
            <Spinner size="xl" colorPalette="brand" />
          </Box>
        </>
      ) : (
        editingEntry &&
        editNutritionData && (
          <NutritionFactsDrawer
            key={editingEntry.id}
            nutritionData={editNutritionData}
            mealName={mealName}
            isOpen
            onClose={() => {
              setEditingEntry(null);
              setEditNutritionData(null);
            }}
            onAddToMeal={handleUpdateEntry}
            isEditMode={true}
            initialServingAmount={editingEntry.serving_amount}
            initialServingUnit={editingEntry.serving_unit}
          />
        )
      )}
    </>
  );
}
