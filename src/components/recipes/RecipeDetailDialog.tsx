"use client";

import {
  Box,
  Button,
  Heading,
  HStack,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoClose, IoPencil, IoTrash } from "react-icons/io5";
import { toaster } from "@/components/ui/toaster";
import { Recipe, deleteRecipeItem, getRecipe } from "@/app/actions/recipes";
import { RecipeDialog } from "./RecipeDialog";

const MotionBox = motion.create(Box);

interface RecipeDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: Recipe;
  onRecipeUpdated: (recipe: Recipe) => void;
}

export function RecipeDetailDialog({
  isOpen,
  onClose,
  recipe,
  onRecipeUpdated,
}: RecipeDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [currentRecipe, setCurrentRecipe] = useState(recipe);

  const totalCalories = (currentRecipe.items || []).reduce((sum, item) => sum + item.calories, 0);
  const totalProtein = (currentRecipe.items || []).reduce((sum, item) => sum + (item.protein || 0), 0);
  const totalCarbs = (currentRecipe.items || []).reduce((sum, item) => sum + (item.carbohydrates || 0), 0);
  const totalFat = (currentRecipe.items || []).reduce((sum, item) => sum + (item.total_fat || 0), 0);

  const handleDeleteItem = async (itemId: string) => {
    setDeletingItemId(itemId);
    try {
      const response = await deleteRecipeItem(itemId);
      if (response.success) {
        const updated = await getRecipe(currentRecipe.id);
        if (updated.success && updated.data) {
          setCurrentRecipe(updated.data);
          onRecipeUpdated(updated.data);
        }
        toaster.create({
          title: "Item removed",
          type: "success",
        });
      } else {
        toaster.create({
          title: "Failed to remove item",
          description: response.error,
          type: "error",
        });
      }
    } catch {
      toaster.create({
        title: "Error",
        description: "Failed to remove item",
        type: "error",
      });
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleRecipeUpdated = (updated: Recipe) => {
    setCurrentRecipe(updated);
    onRecipeUpdated(updated);
    setIsEditing(false);
  };

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
          {/* Header */}
          <HStack justify="space-between" align="start">
            <VStack align="start" gap={1} flex={1}>
              <Heading size="lg" color="text.default">
                {currentRecipe.name}
              </Heading>
              {currentRecipe.description && (
                <Text color="text.muted" fontSize="sm">
                  {currentRecipe.description}
                </Text>
              )}
            </VStack>
            <HStack gap={1}>
              <IconButton
                aria-label="Edit recipe"
                variant="ghost"
                colorPalette="blue"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <IoPencil />
              </IconButton>
              <Button onClick={onClose} variant="ghost" size="sm" colorPalette="gray">
                <IoClose size={20} />
              </Button>
            </HStack>
          </HStack>

          {/* Summary */}
          {(currentRecipe.items?.length || 0) > 0 && (
            <HStack
              gap={4}
              fontSize="sm"
              bg="background.subtle"
              px={4}
              py={2}
              borderRadius="full"
              borderWidth="1px"
              borderColor="border.muted"
              alignSelf="start"
            >
              <Text fontWeight="bold" color="brand.500">
                {totalCalories.toFixed(0)} cal
              </Text>
              <HStack gap={3} color="text.muted">
                <Text>
                  <Box as="span" fontWeight="bold" color="text.default">
                    P
                  </Box>{" "}
                  {totalProtein.toFixed(0)}g
                </Text>
                <Text>
                  <Box as="span" fontWeight="bold" color="text.default">
                    C
                  </Box>{" "}
                  {totalCarbs.toFixed(0)}g
                </Text>
                <Text>
                  <Box as="span" fontWeight="bold" color="text.default">
                    F
                  </Box>{" "}
                  {totalFat.toFixed(0)}g
                </Text>
              </HStack>
            </HStack>
          )}

          {/* Items */}
          <VStack align="stretch" gap={2}>
            <Text fontSize="sm" fontWeight="medium" color="text.default">
              Ingredients ({currentRecipe.items?.length || 0})
            </Text>

            {(currentRecipe.items?.length || 0) === 0 && (
              <Box
                py={6}
                textAlign="center"
                borderRadius="md"
                borderWidth="1px"
                borderColor="border.muted"
                borderStyle="dashed"
              >
                <Text color="text.muted" fontSize="sm">
                  No ingredients yet.
                </Text>
              </Box>
            )}

            <AnimatePresence>
              {currentRecipe.items?.map((item) => (
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
                        {item.food_description}
                      </Text>
                      <Text color="text.muted" fontSize="xs">
                        {item.serving_amount} {item.serving_unit} • {item.calories.toFixed(0)} cal
                      </Text>
                    </VStack>
                    <IconButton
                      aria-label="Remove item"
                      size="xs"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => handleDeleteItem(item.id)}
                      loading={deletingItemId === item.id}
                    >
                      <IoTrash />
                    </IconButton>
                  </HStack>
                </MotionBox>
              ))}
            </AnimatePresence>
          </VStack>

          {/* Close Button */}
          <Button variant="outline" colorPalette="gray" onClick={onClose} w="full">
            Close
          </Button>
        </VStack>
      </Box>

      {/* Edit Dialog */}
      {isEditing && (
        <RecipeDialog
          isOpen={isEditing}
          onClose={() => setIsEditing(false)}
          onRecipeCreated={() => {}}
          onRecipeUpdated={handleRecipeUpdated}
          existingRecipe={currentRecipe}
        />
      )}
    </>
  );
}
