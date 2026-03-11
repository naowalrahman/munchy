"use client";

import {
  Box,
  Button,
  Dialog,
  HStack,
  Input,
  Portal,
  Text,
  VStack,
  CloseButton,
  IconButton,
  Spinner,
} from "@chakra-ui/react";
import { IoTrash } from "react-icons/io5";
import { useState, useEffect } from "react";
import {
  getLoggedRecipeIngredients,
  updateLoggedRecipeIngredients,
  type LoggedRecipeIngredient,
} from "@/app/actions/recipes";
import { toaster } from "@/components/ui/toaster";

interface LoggedRecipeIngredientEditorProps {
  isOpen: boolean;
  onClose: () => void;
  foodLogId: string;
  recipeName: string;
  onSaved: () => void;
}

export function LoggedRecipeIngredientEditor({
  isOpen,
  onClose,
  foodLogId,
  recipeName,
  onSaved,
}: LoggedRecipeIngredientEditorProps) {
  const [ingredients, setIngredients] = useState<LoggedRecipeIngredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && foodLogId) {
      setIsLoading(true);
      getLoggedRecipeIngredients(foodLogId)
        .then((res) => {
          if (res.success && res.data) setIngredients(res.data);
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, foodLogId]);

  const handleAmountChange = (index: number, amount: number) => {
    const ing = ingredients[index];
    if (!ing || amount <= 0) return;
    const ratio = amount / ing.serving_amount;
    setIngredients((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        serving_amount: amount,
        calories: ing.calories * ratio,
        protein: ing.protein != null ? ing.protein * ratio : null,
        carbohydrates: ing.carbohydrates != null ? ing.carbohydrates * ratio : null,
        total_fat: ing.total_fat != null ? ing.total_fat * ratio : null,
      };
      return next;
    });
  };

  const handleRemove = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = ingredients.map((ing, i) => ({
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
      const res = await updateLoggedRecipeIngredients(foodLogId, payload);
      if (res.success) {
        toaster.create({ title: "Recipe updated", type: "success" });
        onSaved();
        onClose();
      } else {
        toaster.create({ title: "Failed to update", description: res.error, type: "error" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const totalCal = ingredients.reduce((s, i) => s + i.calories, 0);
  const totalP = ingredients.reduce((s, i) => s + (i.protein ?? 0), 0);
  const totalC = ingredients.reduce((s, i) => s + (i.carbohydrates ?? 0), 0);
  const totalF = ingredients.reduce((s, i) => s + (i.total_fat ?? 0), 0);

  if (!isOpen) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()} size="lg">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxH="90vh" overflowY="auto">
            <Dialog.Header>
              <Dialog.Title>Edit ingredients: {recipeName}</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body gap={4}>
              {isLoading ? (
                <HStack justify="center" py={8}>
                  <Spinner colorPalette="brand" />
                </HStack>
              ) : ingredients.length === 0 ? (
                <Text color="text.muted">No ingredients to edit.</Text>
              ) : (
                <>
                  <Text fontSize="sm" color="text.muted">
                    Adjust amounts for this logged meal. Changes apply only to this entry, not the saved recipe.
                  </Text>
                  <VStack align="stretch" gap={2}>
                    {ingredients.map((ing, i) => (
                      <HStack key={ing.id} justify="space-between" p={3} bg="background.subtle" borderRadius="md">
                        <Box flex="1" minW={0}>
                          <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
                            {ing.food_description}
                          </Text>
                          <Text fontSize="xs" color="text.muted">
                            {ing.calories.toFixed(0)} cal
                          </Text>
                        </Box>
                        <HStack>
                          <Input
                            type="number"
                            min={0.01}
                            step={0.5}
                            w="80px"
                            size="sm"
                            value={ing.serving_amount}
                            onChange={(e) => handleAmountChange(i, parseFloat(e.target.value) || 0)}
                          />
                          <Text fontSize="sm" color="text.muted">
                            {ing.serving_unit}
                          </Text>
                        </HStack>
                        <IconButton
                          aria-label="Remove ingredient"
                          size="sm"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() => handleRemove(i)}
                        >
                          <IoTrash />
                        </IconButton>
                      </HStack>
                    ))}
                  </VStack>
                  <Box p={2} bg="background.subtle" borderRadius="md" fontSize="sm" color="text.muted">
                    Total: {totalCal.toFixed(0)} cal · P: {totalP.toFixed(0)}g · C: {totalC.toFixed(0)}g · F:{" "}
                    {totalF.toFixed(0)}g
                  </Box>
                </>
              )}
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                colorPalette="brand"
                onClick={handleSave}
                disabled={ingredients.length === 0 || isSaving}
                loading={isSaving}
              >
                Save
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
