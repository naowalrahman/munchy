"use client";

import { Box, HStack, Text, VStack, Spinner } from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Recipe, getRecipes } from "@/app/actions/recipes";
import type { StagedFood } from "./types";
import type { NutritionalData } from "@/app/actions/food";

const MotionVStack = motion.create(VStack);
const MotionBox = motion.create(Box);

interface RecipesSectionProps {
  onRecipeSelect: (recipe: Recipe) => void;
}

export function RecipesSection({ onRecipeSelect }: RecipesSectionProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRecipes = async () => {
      setIsLoading(true);
      try {
        const response = await getRecipes();
        if (response.success && response.data) {
          setRecipes(response.data);
        }
      } catch (error) {
        console.error("Error loading recipes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecipes();
  }, []);

  const handleRecipeClick = (recipe: Recipe) => {
    onRecipeSelect(recipe);
  };

  const getTotalCalories = (recipe: Recipe) => {
    return (recipe.items || []).reduce((sum, item) => sum + item.calories, 0);
  };

  if (isLoading) {
    return (
      <Box py={8} textAlign="center">
        <Spinner size="lg" colorPalette="brand" />
      </Box>
    );
  }

  if (recipes.length === 0) {
    return (
      <Box py={8} textAlign="center">
        <Text color="text.muted">No recipes yet. Create recipes on the Recipes page first.</Text>
      </Box>
    );
  }

  return (
    <Box flex="1" overflowY="auto" maxH="400px" borderRadius="md" borderWidth="1px" borderColor="border.default">
      <MotionVStack
        align="stretch"
        gap={0}
        initial="hidden"
        animate="visible"
        variants={{
          visible: {
            transition: {
              staggerChildren: 0.03,
            },
          },
        }}
      >
        {recipes.map((recipe, index) => {
          const itemCount = recipe.items?.length || 0;
          const totalCal = getTotalCalories(recipe);

          return (
            <MotionBox
              key={recipe.id}
              p={4}
              borderBottomWidth={index < recipes.length - 1 ? "1px" : "0"}
              borderColor="border.default"
              cursor="pointer"
              _hover={{
                bg: "background.subtle",
                transform: "translateX(4px)",
                borderLeftWidth: "3px",
                borderLeftColor: "brand.500",
              }}
              onClick={() => handleRecipeClick(recipe)}
              variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0 },
              }}
              transition={{ duration: 0.2 }}
            >
              <VStack align="start" gap={1}>
                <Text color="text.default" fontWeight="medium">
                  {recipe.name}
                </Text>
                <HStack gap={3} fontSize="sm" color="text.muted">
                  <Text>
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </Text>
                  <Text>
                    {recipe.servings} {recipe.servings === 1 ? "serving" : "servings"}
                  </Text>
                  {itemCount > 0 && (
                    <Text fontWeight="bold" color="brand.500">
                      {(totalCal / recipe.servings).toFixed(0)} cal/serving
                    </Text>
                  )}
                </HStack>
                {recipe.description && (
                  <Text fontSize="xs" color="text.muted" lineClamp={1}>
                    {recipe.description}
                  </Text>
                )}
              </VStack>
            </MotionBox>
          );
        })}
      </MotionVStack>
    </Box>
  );
}
