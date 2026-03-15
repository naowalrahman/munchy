"use client";

import { Box, VStack, HStack, Text, Heading, IconButton, Spinner } from "@chakra-ui/react";
import { useState, useMemo } from "react";
import { FoodLogEntry, deleteFoodEntry, updateFoodEntry, deleteRecipeGroup, expandRecipeGroup } from "@/app/actions/foodLog";
import { getFoodNutrition, lookupBarcode, NutritionalData } from "@/app/actions/food";
import { getNutritionMultiplier } from "@/utils/nutritionMultiplier";
import { motion, AnimatePresence } from "framer-motion";
import { IoAdd, IoTrash, IoPencil, IoChevronDown, IoChevronForward, IoGitBranch } from "react-icons/io5";
import { toaster } from "@/components/ui/toaster";
import { FoodSearchDialog } from "@/components/food-search/FoodSearchDialog";
import { NutritionFactsDrawer } from "./NutritionFactsDrawer";
import { useFavorites } from "@/components/food-search/useFavorites";

interface MealSectionProps {
  mealName: string;
  entries: FoodLogEntry[];
  onFoodAdded: () => void;
  isCustom?: boolean;
  selectedDate: string;
}

interface RecipeGroup {
  groupId: string;
  recipeName: string;
  entries: FoodLogEntry[];
}

const MotionBox = motion.create(Box);

export function MealSection({ mealName, entries, onFoodAdded, isCustom, selectedDate }: MealSectionProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<FoodLogEntry | null>(null);
  const [editNutritionData, setEditNutritionData] = useState<NutritionalData | null>(null);
  const [isLoadingEditData, setIsLoadingEditData] = useState(false);
  const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set());
  const [deletingRecipeGroupId, setDeletingRecipeGroupId] = useState<string | null>(null);
  const [expandingRecipeGroupId, setExpandingRecipeGroupId] = useState<string | null>(null);

  const { getFavorite } = useFavorites();

  // Group entries by recipe_group_id
  const { recipeGroups, standaloneEntries } = useMemo(() => {
    const groups: Map<string, RecipeGroup> = new Map();
    const standalone: FoodLogEntry[] = [];

    for (const entry of entries) {
      if (entry.recipe_group_id) {
        const existing = groups.get(entry.recipe_group_id);
        if (existing) {
          existing.entries.push(entry);
        } else {
          groups.set(entry.recipe_group_id, {
            groupId: entry.recipe_group_id,
            recipeName: entry.recipe_name || "Recipe",
            entries: [entry],
          });
        }
      } else {
        standalone.push(entry);
      }
    }

    return {
      recipeGroups: Array.from(groups.values()),
      standaloneEntries: standalone,
    };
  }, [entries]);

  // Calculate totals including recipe group aggregated values
  const totalCalories = entries.reduce((sum, entry) => sum + (entry.calories || 0), 0);
  const totalProtein = entries.reduce((sum, entry) => sum + (entry.protein || 0), 0);
  const totalCarbs = entries.reduce((sum, entry) => sum + (entry.carbohydrates || 0), 0);
  const totalFat = entries.reduce((sum, entry) => sum + (entry.total_fat || 0), 0);

  const toggleRecipeExpand = (groupId: string) => {
    setExpandedRecipes((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

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
    // Check cache first
    const favoritedItem = getFavorite(entry.food_fdc_id);
    if (favoritedItem?.nutrientCache) {
      setEditNutritionData(favoritedItem.nutrientCache);
      setEditingEntry(entry);
      return;
    }

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

  const handleDeleteRecipeGroup = async (groupId: string) => {
    if (!confirm("Delete this entire recipe? This will remove all its ingredients from this meal.")) return;

    setDeletingRecipeGroupId(groupId);
    try {
      const response = await deleteRecipeGroup(groupId);
      if (response.success) {
        toaster.create({
          title: "Recipe removed",
          description: "Recipe and all its ingredients deleted",
          type: "success",
        });
        onFoodAdded();
      } else {
        toaster.create({
          title: "Failed to delete",
          description: response.error || "Something went wrong",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error deleting recipe group:", error);
      toaster.create({
        title: "Error",
        description: "Failed to delete recipe",
        type: "error",
      });
    } finally {
      setDeletingRecipeGroupId(null);
    }
  };

  const handleExpandRecipeGroup = async (group: RecipeGroup) => {
    if (!confirm("Expand this recipe into individual items? This cannot be undone.")) return;

    setExpandingRecipeGroupId(group.groupId);
    try {
      const response = await expandRecipeGroup(group.groupId);
      if (response.success) {
        toaster.create({
          title: "Recipe expanded",
          description: `"${group.recipeName}" expanded into ${group.entries.length} individual items`,
          type: "success",
        });
        onFoodAdded();
      } else {
        toaster.create({
          title: "Failed to expand",
          description: response.error || "Something went wrong",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error expanding recipe group:", error);
      toaster.create({
        title: "Error",
        description: "Failed to expand recipe",
        type: "error",
      });
    } finally {
      setExpandingRecipeGroupId(null);
    }
  };

  const handleUpdateEntry = async (servingAmount: number, servingUnit: string, nutritionData: NutritionalData) => {
    if (!editingEntry) return;

    try {
      const m = getNutritionMultiplier(servingAmount, servingUnit, nutritionData.servingSize, nutritionData.servingSizeUnit);

      const response = await updateFoodEntry(editingEntry.id, {
        serving_amount: servingAmount,
        serving_unit: servingUnit,
        calories: nutritionData.calories * m,
        protein: nutritionData.protein ? nutritionData.protein.amount * m : null,
        carbohydrates: nutritionData.carbohydrates ? nutritionData.carbohydrates.amount * m : null,
        total_fat: nutritionData.totalFat ? nutritionData.totalFat.amount * m : null,
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

  const renderFoodEntry = (entry: FoodLogEntry) => (
    <HStack
      key={entry.id}
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
  );

  const renderRecipeGroup = (group: RecipeGroup) => {
    const isExpanded = expandedRecipes.has(group.groupId);
    const groupCalories = group.entries.reduce((sum, e) => sum + e.calories, 0);
    const groupProtein = group.entries.reduce((sum, e) => sum + (e.protein || 0), 0);
    const groupCarbs = group.entries.reduce((sum, e) => sum + (e.carbohydrates || 0), 0);
    const groupFat = group.entries.reduce((sum, e) => sum + (e.total_fat || 0), 0);
    const servingsConsumed = group.entries[0]?.servings_consumed || 1;

    return (
      <MotionBox
        key={group.groupId}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -100 }}
        transition={{ duration: 0.2 }}
      >
        <Box
          bg="background.subtle"
          borderRadius="md"
          borderWidth="1px"
          borderColor="brand.500/30"
          overflow="hidden"
        >
          <HStack
            p={3}
            _hover={{ bg: "background.canvas" }}
            transition="all 0.2s"
          >
            <IconButton
              aria-label={isExpanded ? "Collapse" : "Expand"}
              size="xs"
              variant="ghost"
              colorPalette="brand"
              onClick={() => toggleRecipeExpand(group.groupId)}
            >
              {isExpanded ? <IoChevronDown /> : <IoChevronForward />}
            </IconButton>
            <VStack align="start" gap={0} flex={1} cursor="pointer" onClick={() => toggleRecipeExpand(group.groupId)}>
              <HStack>
                <Text color="text.default" fontWeight="semibold" fontSize="sm">
                  {group.recipeName}
                </Text>
                <Text
                  fontSize="xs"
                  bg="brand.500/10"
                  color="brand.500"
                  px={2}
                  py={0.5}
                  borderRadius="full"
                  fontWeight="medium"
                >
                  Recipe
                </Text>
                {servingsConsumed !== 1 && (
                  <Text fontSize="xs" color="text.muted">
                    ({servingsConsumed} servings)
                  </Text>
                )}
              </HStack>
              <Text color="text.muted" fontSize="xs">
                {group.entries.length} items · {groupCalories.toFixed(0)} cal · P{" "}
                {groupProtein.toFixed(0)}g · C {groupCarbs.toFixed(0)}g · F {groupFat.toFixed(0)}g
              </Text>
            </VStack>
            <HStack gap={1} onClick={(e) => e.stopPropagation()}>
              <IconButton
                aria-label="Expand into individual items"
                size="sm"
                variant="ghost"
                colorPalette="blue"
                onClick={() => handleExpandRecipeGroup(group)}
                loading={expandingRecipeGroupId === group.groupId}
              >
                <IoGitBranch />
              </IconButton>
              <IconButton
                aria-label="Delete recipe"
                size="sm"
                variant="ghost"
                colorPalette="red"
                onClick={() => handleDeleteRecipeGroup(group.groupId)}
                loading={deletingRecipeGroupId === group.groupId}
              >
                <IoTrash />
              </IconButton>
            </HStack>
          </HStack>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: "hidden" }}
              >
                <VStack align="stretch" gap={2} p={3} pt={0}>
                  {group.entries.map((entry) => (
                    <HStack
                      key={entry.id}
                      p={3}
                      ml={2}
                      pl={6}
                      borderLeftWidth="2px"
                      borderLeftColor="brand.500/30"
                      bg="background.subtle"
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="border.muted"
                    >
                      <VStack align="start" gap={1} flex="1">
                        <Text color="text.default" fontWeight="medium" fontSize="sm">
                          {entry.food_description}
                        </Text>
                        <Text color="text.muted" fontSize="xs">
                          {entry.serving_amount} {entry.serving_unit} · {entry.calories.toFixed(0)} cal
                        </Text>
                      </VStack>
                    </HStack>
                  ))}
                </VStack>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </MotionBox>
    );
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

          <VStack align="stretch" gap={2}>
            <AnimatePresence>
              {recipeGroups.map((group) => renderRecipeGroup(group))}
              {standaloneEntries.map((entry) => (
                <MotionBox
                  key={entry.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderFoodEntry(entry)}
                </MotionBox>
              ))}
            </AnimatePresence>
          </VStack>

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

      {isSearchOpen && (
        <FoodSearchDialog
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          mealName={mealName}
          selectedDate={selectedDate}
          onFoodAdded={onFoodAdded}
        />
      )}

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
