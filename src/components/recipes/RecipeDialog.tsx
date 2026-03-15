"use client";

import {
  Box,
  Button,
  Heading,
  HStack,
  IconButton,
  Input,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoAdd, IoClose, IoTrash } from "react-icons/io5";
import { toaster } from "@/components/ui/toaster";
import {
  Recipe,
  RecipeItem,
  createRecipe,
  updateRecipe,
  addRecipeItem,
  deleteRecipeItem,
  getRecipe,
} from "@/app/actions/recipes";
import { FoodSearchDialog } from "@/components/food-search/FoodSearchDialog";
import { getNutritionMultiplier } from "@/utils/nutritionMultiplier";
import type { StagedFood } from "@/components/food-search/types";

const MotionBox = motion.create(Box);

interface RecipeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRecipeCreated: (recipe: Recipe) => void;
  onRecipeUpdated: (recipe: Recipe) => void;
  existingRecipe?: Recipe;
}

export function RecipeDialog({
  isOpen,
  onClose,
  onRecipeCreated,
  onRecipeUpdated,
  existingRecipe,
}: RecipeDialogProps) {
  const [name, setName] = useState(existingRecipe?.name || "");
  const [description, setDescription] = useState(existingRecipe?.description || "");
  const [items, setItems] = useState<StagedFood[]>(
    existingRecipe?.items?.map((item) => ({
      id: item.id,
      nutritionData: {
        fdcId: item.food_fdc_id,
        description: item.food_description,
        servingSize: 100,
        servingSizeUnit: item.serving_unit,
        calories: item.calories,
        protein: item.protein ? { name: "Protein", amount: item.protein, unit: "g" } : null,
        carbohydrates: item.carbohydrates
          ? { name: "Carbohydrates", amount: item.carbohydrates, unit: "g" }
          : null,
        totalFat: item.total_fat ? { name: "Total Fat", amount: item.total_fat, unit: "g" } : null,
        fiber: null,
        sugars: null,
        sodium: null,
        potassium: null,
        calcium: null,
        iron: null,
        vitaminC: null,
        vitaminA: null,
      },
      servingAmount: item.serving_amount,
      servingUnit: item.serving_unit,
      barcode: item.barcode,
    })) || []
  );
  const [servings, setServings] = useState(existingRecipe?.servings || 1);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleAddItems = (stagedItems: StagedFood[]) => {
    setItems((prev) => [...prev, ...stagedItems]);
    setIsSearchOpen(false);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toaster.create({
        title: "Name required",
        description: "Please enter a recipe name",
        type: "error",
      });
      return;
    }

    if (items.length === 0) {
      toaster.create({
        title: "Ingredients required",
        description: "Please add at least one ingredient to your recipe",
        type: "error",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (existingRecipe) {
        // Update existing recipe
        const response = await updateRecipe(existingRecipe.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          servings,
        });

        if (!response.success) {
          throw new Error(response.error || "Failed to update recipe");
        }

        // Handle item changes
        const existingItemIds = new Set(existingRecipe.items?.map((i) => i.id) || []);
        const currentItemIds = new Set(items.map((i) => i.id));

        // Delete removed items
        for (const existingItem of existingRecipe.items || []) {
          if (!currentItemIds.has(existingItem.id)) {
            await deleteRecipeItem(existingItem.id);
          }
        }

        for (const item of items) {
          if (!existingItemIds.has(item.id)) {
            const m = getNutritionMultiplier(item.servingAmount, item.servingUnit, item.nutritionData.servingSize, item.nutritionData.servingSizeUnit);
            await addRecipeItem(existingRecipe.id, {
              food_fdc_id: item.nutritionData.fdcId,
              food_description: item.nutritionData.description,
              serving_amount: item.servingAmount,
              serving_unit: item.servingUnit,
              calories: item.nutritionData.calories * m,
              protein: item.nutritionData.protein ? item.nutritionData.protein.amount * m : null,
              carbohydrates: item.nutritionData.carbohydrates ? item.nutritionData.carbohydrates.amount * m : null,
              total_fat: item.nutritionData.totalFat ? item.nutritionData.totalFat.amount * m : null,
              barcode: item.barcode,
            });
          }
        }

        // Fetch updated recipe
        const updated = await getRecipe(existingRecipe.id);
        if (updated.success && updated.data) {
          onRecipeUpdated(updated.data);
        }

        toaster.create({
          title: "Recipe updated",
          description: `"${name.trim()}" has been updated`,
          type: "success",
        });
      } else {
        // Create new recipe
        const response = await createRecipe({
          name: name.trim(),
          description: description.trim() || undefined,
          servings,
        });

        if (!response.success || !response.data) {
          throw new Error(response.error || "Failed to create recipe");
        }

        const recipe = response.data as Recipe;

        for (const item of items) {
          const m = getNutritionMultiplier(item.servingAmount, item.servingUnit, item.nutritionData.servingSize, item.nutritionData.servingSizeUnit);
          await addRecipeItem(recipe.id, {
            food_fdc_id: item.nutritionData.fdcId,
            food_description: item.nutritionData.description,
            serving_amount: item.servingAmount,
            serving_unit: item.servingUnit,
            calories: item.nutritionData.calories * m,
            protein: item.nutritionData.protein ? item.nutritionData.protein.amount * m : null,
            carbohydrates: item.nutritionData.carbohydrates ? item.nutritionData.carbohydrates.amount * m : null,
            total_fat: item.nutritionData.totalFat ? item.nutritionData.totalFat.amount * m : null,
            barcode: item.barcode,
          });
        }

        // Fetch created recipe with items
        const created = await getRecipe(recipe.id);
        if (created.success && created.data) {
          onRecipeCreated(created.data);
        }

        toaster.create({
          title: "Recipe created",
          description: `"${name.trim()}" has been created`,
          type: "success",
        });
      }

      onClose();
    } catch (error) {
      console.error("Error saving recipe:", error);
      toaster.create({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save recipe",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const totalCalories = items.reduce((sum, item) => {
    const m = getNutritionMultiplier(item.servingAmount, item.servingUnit, item.nutritionData.servingSize, item.nutritionData.servingSizeUnit);
    return sum + item.nutritionData.calories * m;
  }, 0);

  if (!isOpen) return null;

  return (
    <>
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bg="blackAlpha.700"
        zIndex={998}
        onClick={onClose}
      />
      <Box
        position="fixed"
        top={{ base: 0, md: "5%" }}
        left={{ base: 0, md: "50%" }}
        right={{ base: 0, md: "auto" }}
        bottom={{ base: 0, md: "auto" }}
        w={{ base: "100vw", md: "550px" }}
        maxW={{ base: "100vw", md: "550px" }}
        h={{ base: "100dvh", md: "auto" }}
        maxH={{ base: "100dvh", md: "90vh" }}
        bg="background.canvas"
        borderRadius={{ base: 0, md: "xl" }}
        borderWidth={{ base: 0, md: "1px" }}
        borderColor="border.default"
        boxShadow="2xl"
        zIndex={999}
        p={{ base: 4, md: 6 }}
        overflowY="auto"
        transform={{ md: "translateX(-50%)" }}
      >
        <VStack align="stretch" gap={4}>
          <HStack justify="space-between" align="center">
            <Heading size="lg" color="text.default">
              {existingRecipe ? "Edit Recipe" : "New Recipe"}
            </Heading>
            <Button onClick={onClose} variant="ghost" size="sm" colorPalette="gray">
              <IoClose size={24} />
            </Button>
          </HStack>

          <VStack align="stretch" gap={3}>
            <Box>
              <Text fontSize="sm" fontWeight="medium" color="text.default" mb={1}>
                Recipe Name
              </Text>
              <Input
                placeholder="e.g., Protein Smoothie"
                value={name}
                onChange={(e) => setName(e.target.value)}
                bg="background.subtle"
                borderColor="border.default"
                _focus={{ borderColor: "brand.500" }}
              />
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="medium" color="text.default" mb={1}>
                Description (optional)
              </Text>
              <Textarea
                placeholder="Add a description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                bg="background.subtle"
                borderColor="border.default"
                _focus={{ borderColor: "brand.500" }}
                rows={2}
                resize="vertical"
              />
            </Box>

            <HStack justify="space-between" align="center">
              <VStack align="start" gap={0}>
                <Text fontSize="sm" fontWeight="medium" color="text.default">
                  Servings
                </Text>
                <Text fontSize="xs" color="text.muted">
                  How many servings does this recipe make?
                </Text>
              </VStack>
              <HStack gap={2}>
                <IconButton
                  aria-label="Decrease servings"
                  size="sm"
                  variant="outline"
                  onClick={() => setServings(Math.max(1, servings - 1))}
                  disabled={servings <= 1}
                >
                  -
                </IconButton>
                <Input
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(Math.max(1, parseInt(e.target.value) || 1))}
                  w="60px"
                  textAlign="center"
                  size="sm"
                  bg="background.subtle"
                  min={1}
                />
                <IconButton
                  aria-label="Increase servings"
                  size="sm"
                  variant="outline"
                  onClick={() => setServings(servings + 1)}
                >
                  +
                </IconButton>
              </HStack>
            </HStack>
          </VStack>

          {/* Items Section */}
          <VStack align="stretch" gap={2}>
            <HStack justify="space-between" align="center">
              <HStack gap={3}>
                <Text fontSize="sm" fontWeight="medium" color="text.default">
                  Ingredients ({items.length})
                </Text>
                {items.length > 0 && (
                  <Text fontSize="sm" fontWeight="bold" color="brand.500">
                    {totalCalories.toFixed(0)} cal
                  </Text>
                )}
              </HStack>
              <Button size="sm" variant="outline" colorPalette="brand" onClick={() => setIsSearchOpen(true)}>
                <IoAdd />
                Add Food
              </Button>
            </HStack>

            {items.length === 0 && (
              <Box
                py={6}
                textAlign="center"
                borderRadius="md"
                borderWidth="1px"
                borderColor="border.muted"
                borderStyle="dashed"
              >
                <Text color="text.muted" fontSize="sm">
                  No ingredients yet. Add foods to build your recipe.
                </Text>
              </Box>
            )}

            <AnimatePresence>
              {items.map((item) => {
                const itemCalories = item.nutritionData.calories * getNutritionMultiplier(item.servingAmount, item.servingUnit, item.nutritionData.servingSize, item.nutritionData.servingSizeUnit);

                return (
                  <MotionBox
                    key={item.id}
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
                    >
                      <VStack align="start" gap={1} flex={1}>
                        <Text color="text.default" fontWeight="medium" fontSize="sm">
                          {item.nutritionData.description}
                        </Text>
                        <Text color="text.muted" fontSize="xs">
                          {item.servingAmount} {item.servingUnit} • {itemCalories.toFixed(0)} cal
                        </Text>
                      </VStack>
                      <IconButton
                        aria-label="Remove item"
                        size="xs"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <IoTrash />
                      </IconButton>
                    </HStack>
                  </MotionBox>
                );
              })}
            </AnimatePresence>
          </VStack>

          {/* Actions */}
          <HStack gap={3} pt={2}>
            <Button variant="outline" colorPalette="gray" onClick={onClose} flex={1} disabled={isSaving}>
              Cancel
            </Button>
            <Button colorPalette="brand" flex={1} onClick={handleSave} loading={isSaving}>
              {existingRecipe ? "Save Changes" : "Create Recipe"}
            </Button>
          </HStack>
        </VStack>
      </Box>

      {/* Food Search Dialog */}
      {isSearchOpen && (
        <FoodSearchDialog
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          mealName="Recipe"
          selectedDate=""
          onFoodAdded={() => {}}
          recipeMode
          onRecipeItemsAdded={handleAddItems}
        />
      )}
    </>
  );
}
