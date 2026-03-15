"use client";

import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  IconButton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoAdd, IoPencil, IoTrash } from "react-icons/io5";
import { toaster } from "@/components/ui/toaster";
import { Recipe, deleteRecipe } from "@/app/actions/recipes";
import { RecipeDialog } from "@/components/recipes/RecipeDialog";
import { RecipeDetailDialog } from "@/components/recipes/RecipeDetailDialog";

const MotionBox = motion.create(Box);

interface RecipesClientProps {
  initialRecipes: Recipe[];
}

export default function RecipesClient({ initialRecipes }: RecipesClientProps) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);


  const handleDelete = async (recipe: Recipe) => {
    if (!confirm(`Delete "${recipe.name}"? This cannot be undone.`)) return;

    setDeletingId(recipe.id);
    try {
      const response = await deleteRecipe(recipe.id);
      if (response.success) {
        toaster.create({
          title: "Recipe deleted",
          description: `"${recipe.name}" has been deleted`,
          type: "success",
        });
        setRecipes((prev) => prev.filter((r) => r.id !== recipe.id));
      } else {
        toaster.create({
          title: "Failed to delete",
          description: response.error || "Something went wrong",
          type: "error",
        });
      }
    } catch {
      toaster.create({
        title: "Error",
        description: "Failed to delete recipe",
        type: "error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleRecipeCreated = (recipe: Recipe) => {
    setRecipes((prev) => [recipe, ...prev]);
    setIsCreateOpen(false);
  };

  const handleRecipeUpdated = (recipe: Recipe) => {
    setRecipes((prev) => prev.map((r) => (r.id === recipe.id ? recipe : r)));
    setEditingRecipe(null);
  };

  const getTotalCalories = (recipe: Recipe) => {
    return (recipe.items || []).reduce((sum, item) => sum + item.calories, 0);
  };

  const getTotalMacros = (recipe: Recipe) => {
    const items = recipe.items || [];
    return {
      protein: items.reduce((sum, item) => sum + (item.protein || 0), 0),
      carbs: items.reduce((sum, item) => sum + (item.carbohydrates || 0), 0),
      fat: items.reduce((sum, item) => sum + (item.total_fat || 0), 0),
    };
  };

  return (
    <Box minH="100dvh" bg="background.canvas" py={{ base: 4, md: 8 }}>
      <Container maxW={{ base: "full", lg: "4xl" }} px={{ base: 4, md: 6 }}>
        <VStack align="stretch" gap={{ base: 6, md: 8 }}>
          {/* Header */}
          <HStack justify="space-between" align="center">
            <Heading size={{ base: "lg", md: "xl" }} color="text.default">
              My Recipes
            </Heading>
            <Button colorPalette="brand" onClick={() => setIsCreateOpen(true)}>
              <IoAdd />
              New Recipe
            </Button>
          </HStack>

          {/* Empty State */}
          {recipes.length === 0 && (
            <Box
              py={16}
              textAlign="center"
              borderRadius="xl"
              borderWidth="2px"
              borderColor="border.muted"
              borderStyle="dashed"
            >
              <VStack gap={4}>
                <Text color="text.muted" fontSize="lg">
                  No recipes yet
                </Text>
                <Text color="text.muted" fontSize="sm" maxW="md">
                  Create recipes from your favorite food combinations. You can add them to meals with a single tap.
                </Text>
                <Button colorPalette="brand" onClick={() => setIsCreateOpen(true)}>
                  <IoAdd />
                  Create Your First Recipe
                </Button>
              </VStack>
            </Box>
          )}

          {/* Recipe Cards */}
          <VStack align="stretch" gap={4}>
            <AnimatePresence>
              {recipes.map((recipe) => {
                const totalCal = getTotalCalories(recipe);
                const macros = getTotalMacros(recipe);
                const itemCount = recipe.items?.length || 0;

                return (
                  <MotionBox
                    key={recipe.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Box
                      bg="background.panel"
                      borderRadius="lg"
                      p={{ base: 4, md: 5 }}
                      borderWidth="1px"
                      borderColor="border.default"
                      cursor="pointer"
                      transition="all 0.2s"
                      _hover={{
                        borderColor: "brand.500/50",
                        transform: "translateY(-2px)",
                        boxShadow: "lg",
                      }}
                      onClick={() => setViewingRecipe(recipe)}
                    >
                      <HStack justify="space-between" align="start">
                        <VStack align="start" gap={2} flex={1}>
                          <Heading size="md" color="text.default">
                            {recipe.name}
                          </Heading>
                          {recipe.description && (
                            <Text color="text.muted" fontSize="sm" lineClamp={2}>
                              {recipe.description}
                            </Text>
                          )}
                          <HStack gap={4} fontSize="sm">
                            <Text color="text.muted">
                              {itemCount} {itemCount === 1 ? "item" : "items"}
                            </Text>
                            <Text color="text.muted">
                              {recipe.servings} {recipe.servings === 1 ? "serving" : "servings"}
                            </Text>
                            {itemCount > 0 && (
                              <>
                                <Text fontWeight="bold" color="brand.500">
                                  {totalCal.toFixed(0)} cal
                                </Text>
                                <HStack gap={3} color="text.muted">
                                  <Text>
                                    <Box as="span" fontWeight="bold" color="text.default">
                                      P
                                    </Box>{" "}
                                    {macros.protein.toFixed(0)}g
                                  </Text>
                                  <Text>
                                    <Box as="span" fontWeight="bold" color="text.default">
                                      C
                                    </Box>{" "}
                                    {macros.carbs.toFixed(0)}g
                                  </Text>
                                  <Text>
                                    <Box as="span" fontWeight="bold" color="text.default">
                                      F
                                    </Box>{" "}
                                    {macros.fat.toFixed(0)}g
                                  </Text>
                                </HStack>
                              </>
                            )}
                          </HStack>
                        </VStack>
                        <HStack
                          gap={1}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <IconButton
                            aria-label="Edit recipe"
                            size="sm"
                            variant="ghost"
                            colorPalette="blue"
                            onClick={() => setEditingRecipe(recipe)}
                          >
                            <IoPencil />
                          </IconButton>
                          <IconButton
                            aria-label="Delete recipe"
                            size="sm"
                            variant="ghost"
                            colorPalette="red"
                            onClick={() => handleDelete(recipe)}
                            loading={deletingId === recipe.id}
                          >
                            <IoTrash />
                          </IconButton>
                        </HStack>
                      </HStack>
                    </Box>
                  </MotionBox>
                );
              })}
            </AnimatePresence>
          </VStack>
        </VStack>
      </Container>

      {/* Create Recipe Dialog */}
      {isCreateOpen && (
        <RecipeDialog
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onRecipeCreated={handleRecipeCreated}
          onRecipeUpdated={handleRecipeUpdated}
        />
      )}

      {/* Edit Recipe Dialog */}
      {editingRecipe && (
        <RecipeDialog
          isOpen={!!editingRecipe}
          onClose={() => setEditingRecipe(null)}
          onRecipeCreated={handleRecipeCreated}
          onRecipeUpdated={handleRecipeUpdated}
          existingRecipe={editingRecipe}
        />
      )}

      {/* View Recipe Detail Dialog */}
      {viewingRecipe && (
        <RecipeDetailDialog
          isOpen={!!viewingRecipe}
          onClose={() => setViewingRecipe(null)}
          recipe={viewingRecipe}
          onRecipeUpdated={(updated) => {
            setRecipes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
            setViewingRecipe(updated);
          }}
        />
      )}
    </Box>
  );
}
