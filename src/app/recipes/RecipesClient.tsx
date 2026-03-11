"use client";

import { Box, Button, Container, Heading, VStack } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { IoAdd } from "react-icons/io5";
import { useState } from "react";
import type { Recipe } from "@/app/actions/recipes";
import { getRecipes } from "@/app/actions/recipes";
import { RecipeCard } from "@/components/recipes/RecipeCard";
import { RecipeFormDialog } from "@/components/recipes/RecipeFormDialog";

const MotionBox = motion.create(Box);

interface RecipesClientProps {
  initialRecipes: Recipe[];
}

export default function RecipesClient({ initialRecipes }: RecipesClientProps) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);

  const refreshRecipes = async () => {
    const res = await getRecipes();
    if (res.success && res.data) {
      setRecipes(res.data);
    }
  };

  const handleCreate = () => {
    setEditingRecipeId(null);
    setIsFormOpen(true);
  };

  const handleEdit = (id: string) => {
    setEditingRecipeId(id);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingRecipeId(null);
    refreshRecipes();
  };

  return (
    <Box minH="100dvh" bg="background.canvas" py={{ base: 4, md: 8 }}>
      <Container maxW={{ base: "full", lg: "4xl" }} px={{ base: 4, md: 6 }}>
        <VStack align="stretch" gap={{ base: 6, md: 8 }}>
          <MotionBox
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={4}>
              <Heading size="lg" color="text.default">
                My Recipes
              </Heading>
              <Button colorPalette="brand" onClick={handleCreate}>
                <IoAdd />
                New Recipe
              </Button>
            </Box>
          </MotionBox>

          {recipes.length === 0 ? (
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <Box
                py={12}
                textAlign="center"
                borderRadius="xl"
                borderWidth="1px"
                borderColor="border.muted"
                borderStyle="dashed"
                bg="background.panel"
              >
                <Heading size="md" color="text.muted" mb={2}>
                  No recipes yet
                </Heading>
                <Box mt={4}>
                  <Button colorPalette="brand" onClick={handleCreate}>
                    Create your first recipe
                  </Button>
                </Box>
              </Box>
            </MotionBox>
          ) : (
            <VStack align="stretch" gap={4}>
              {recipes.map((recipe, index) => (
                <MotionBox
                  key={recipe.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + index * 0.05 }}
                >
                  <RecipeCard recipe={recipe} onEdit={handleEdit} onDeleted={refreshRecipes} />
                </MotionBox>
              ))}
            </VStack>
          )}
        </VStack>
      </Container>

      <RecipeFormDialog
        isOpen={isFormOpen}
        onClose={handleFormClose}
        recipeId={editingRecipeId}
        onSaved={handleFormClose}
      />
    </Box>
  );
}
