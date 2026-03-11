"use client";

import {
  Box,
  Button,
  Dialog,
  Field,
  Input,
  Portal,
  Textarea,
  Text,
  CloseButton,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { createRecipe, updateRecipe, getRecipeById } from "@/app/actions/recipes";
import type { RecipeIngredient } from "@/app/actions/recipes";
import { RecipeIngredientBuilder } from "./RecipeIngredientBuilder";
import { toaster } from "@/components/ui/toaster";

interface RecipeFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipeId: string | null;
  onSaved: () => void;
}

export function RecipeFormDialog({ isOpen, onClose, recipeId, onSaved }: RecipeFormDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [servingsInput, setServingsInput] = useState("1");
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (recipeId) {
      setIsLoadingRecipe(true);
      getRecipeById(recipeId)
        .then((res) => {
          if (res.success && res.data) {
            const r = res.data;
            setName(r.name);
            setDescription(r.description ?? "");
            setServingsInput(String(r.servings));
            setIngredients(
              r.recipe_ingredients.map((ing) => ({
                food_fdc_id: ing.food_fdc_id,
                food_description: ing.food_description,
                serving_amount: ing.serving_amount,
                serving_unit: ing.serving_unit,
                calories: ing.calories,
                protein: ing.protein,
                carbohydrates: ing.carbohydrates,
                total_fat: ing.total_fat,
                barcode: ing.barcode,
                sort_order: ing.sort_order ?? 0,
              }))
            );
          }
        })
        .finally(() => setIsLoadingRecipe(false));
    } else {
      setName("");
      setDescription("");
      setServingsInput("1");
      setIngredients([]);
    }
  }, [isOpen, recipeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toaster.create({ title: "Name is required", type: "error" });
      return;
    }
    const servings = parseFloat(servingsInput);
    if (isNaN(servings) || servings <= 0) {
      toaster.create({ title: "Servings must be greater than 0", type: "error" });
      return;
    }

    setIsLoading(true);
    try {
      const ingPayload = ingredients.map((ing, i) => ({
        food_fdc_id: ing.food_fdc_id,
        food_description: ing.food_description,
        serving_amount: ing.serving_amount,
        serving_unit: ing.serving_unit,
        calories: ing.calories,
        protein: ing.protein,
        carbohydrates: ing.carbohydrates,
        total_fat: ing.total_fat,
        barcode: ing.barcode,
        sort_order: i,
      }));

      if (recipeId) {
        const res = await updateRecipe(recipeId, {
          name: name.trim(),
          description: description.trim(),
          servings,
          ingredients: ingPayload,
        });
        if (res.success) {
          toaster.create({ title: "Recipe updated", type: "success" });
          onSaved();
        } else {
          toaster.create({ title: "Failed to update", description: res.error, type: "error" });
        }
      } else {
        const res = await createRecipe({
          name: name.trim(),
          description: description.trim(),
          servings,
          ingredients: ingPayload,
        });
        if (res.success) {
          toaster.create({ title: "Recipe created", type: "success" });
          onSaved();
        } else {
          toaster.create({ title: "Failed to create", description: res.error, type: "error" });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const totalCal = ingredients.reduce((s, i) => s + i.calories, 0);
  const totalP = ingredients.reduce((s, i) => s + (i.protein ?? 0), 0);
  const totalC = ingredients.reduce((s, i) => s + (i.carbohydrates ?? 0), 0);
  const totalF = ingredients.reduce((s, i) => s + (i.total_fat ?? 0), 0);
  const servings = (() => {
    const n = parseFloat(servingsInput);
    return !isNaN(n) && n > 0 ? n : 1;
  })();

  if (!isOpen) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} size="lg">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxH="90vh" overflowY="auto">
            <Dialog.Header>
              <Dialog.Title>{recipeId ? "Edit Recipe" : "New Recipe"}</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <form onSubmit={handleSubmit}>
              <Dialog.Body pt={0} gap={4}>
                {isLoadingRecipe ? (
                  <Text color="text.muted">Loading recipe...</Text>
                ) : (
                  <>
                    <Field.Root>
                      <Field.Label>Name</Field.Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Chicken Stir Fry"
                      />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Description (optional)</Field.Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Notes about this recipe"
                        rows={2}
                      />
                    </Field.Root>
                    <Field.Root>
                      <Field.Label>Servings</Field.Label>
                      <Input
                        type="number"
                        min={0.1}
                        step="any"
                        inputMode="decimal"
                        value={servingsInput}
                        onChange={(e) => setServingsInput(e.target.value)}
                      />
                    </Field.Root>
                    <RecipeIngredientBuilder ingredients={ingredients} onChange={setIngredients} />
                    {ingredients.length > 0 && (
                      <Box
                        p={3}
                        bg="background.subtle"
                        borderRadius="md"
                        fontSize="sm"
                        color="text.muted"
                      >
                        Total: {totalCal.toFixed(0)} cal · P: {totalP.toFixed(0)}g · C: {totalC.toFixed(0)}g · F:{" "}
                        {totalF.toFixed(0)}g
                        {servings > 0 && (
                          <Text mt={1}>
                            Per serving: {(totalCal / servings).toFixed(0)} cal
                          </Text>
                        )}
                      </Box>
                    )}
                  </>
                )}
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" onClick={onClose} type="button">
                  Cancel
                </Button>
                <Button
                  colorPalette="brand"
                  type="submit"
                  loading={isLoading}
                  disabled={isLoadingRecipe || !name.trim()}
                >
                  {recipeId ? "Save" : "Create"}
                </Button>
              </Dialog.Footer>
            </form>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
