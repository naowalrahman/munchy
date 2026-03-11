"use client";

import { Box, HStack, Text, Menu, Button } from "@chakra-ui/react";
import { IoEllipsisVertical, IoPencil, IoTrash } from "react-icons/io5";
import type { Recipe } from "@/app/actions/recipes";
import { deleteRecipe } from "@/app/actions/recipes";
import { toaster } from "@/components/ui/toaster";

interface RecipeCardProps {
  recipe: Recipe;
  onEdit: (id: string) => void;
  onDeleted: () => void;
}

export function RecipeCard({ recipe, onEdit, onDeleted }: RecipeCardProps) {
  const handleDelete = async () => {
    const res = await deleteRecipe(recipe.id);
    if (res.success) {
      toaster.create({
        title: "Recipe deleted",
        type: "success",
      });
      onDeleted();
    } else {
      toaster.create({
        title: "Failed to delete",
        description: res.error,
        type: "error",
      });
    }
  };

  const perServing =
    recipe.servings > 0
      ? {
          calories: (recipe.calories / recipe.servings).toFixed(0),
          protein: recipe.protein != null ? (recipe.protein / recipe.servings).toFixed(0) : "-",
          carbs: recipe.carbohydrates != null ? (recipe.carbohydrates / recipe.servings).toFixed(0) : "-",
          fat: recipe.total_fat != null ? (recipe.total_fat / recipe.servings).toFixed(0) : "-",
        }
      : null;

  return (
    <Box
      bg="background.panel"
      borderRadius="xl"
      p={4}
      borderWidth="1px"
      borderColor="border.default"
      backdropFilter="blur(12px)"
      boxShadow="0 4px 30px rgba(0, 0, 0, 0.1)"
      _hover={{
        borderColor: "brand.500/30",
        boxShadow: "0 8px 40px rgba(0, 0, 0, 0.15)",
      }}
    >
      <HStack justify="space-between" align="flex-start" gap={4}>
        <Box flex="1" minW={0}>
          <Text fontWeight="semibold" fontSize="lg" color="text.default">
            {recipe.name}
          </Text>
          {recipe.description && (
            <Text fontSize="sm" color="text.muted" mt={1} lineClamp={2}>
              {recipe.description}
            </Text>
          )}
          {perServing && (
            <HStack gap={3} mt={2} fontSize="sm" color="text.muted">
              <Text>
                <Box as="span" color="brand.500" fontWeight="bold">
                  {perServing.calories}
                </Box>{" "}
                cal/serving
              </Text>
              <Text>
                P: {perServing.protein}g · C: {perServing.carbs}g · F: {perServing.fat}g
              </Text>
              <Text>· {recipe.servings} servings</Text>
            </HStack>
          )}
        </Box>
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button variant="ghost" size="sm" colorPalette="gray">
              <IoEllipsisVertical size={20} />
            </Button>
          </Menu.Trigger>
          <Menu.Positioner>
            <Menu.Content>
              <Menu.Item value="edit" onClick={() => onEdit(recipe.id)}>
                <IoPencil style={{ marginRight: 8 }} />
                Edit
              </Menu.Item>
              <Menu.Item value="delete" onClick={handleDelete} colorPalette="red">
                <IoTrash style={{ marginRight: 8 }} />
                Delete
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Menu.Root>
      </HStack>
    </Box>
  );
}
