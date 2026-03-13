"use client";

import { Box, VStack, HStack, Text, Button, Heading, Separator, Grid, useBreakpointValue } from "@chakra-ui/react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoClose } from "react-icons/io5";

export interface RecipeNutrient {
  name: string;
  amount: number;
  unit: string;
}

export interface RecipeNutritionData {
  recipeName: string;
  servings: number; // How many servings the recipe makes
  // Per-serving values (what's stored in recipe items)
  calories: number;
  protein: RecipeNutrient | null;
  carbohydrates: RecipeNutrient | null;
  totalFat: RecipeNutrient | null;
  fiber: RecipeNutrient | null;
  sugars: RecipeNutrient | null;
  // Micronutrients (optional - may not be available for all recipes)
  sodium: RecipeNutrient | null;
  potassium: RecipeNutrient | null;
  calcium: RecipeNutrient | null;
  iron: RecipeNutrient | null;
  vitaminC: RecipeNutrient | null;
  vitaminA: RecipeNutrient | null;
}

export interface RecipeNutritionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  nutritionData: RecipeNutritionData;
  mealName: string;
  onAddToMeal: (servingsConsumed: number) => void;
  // Edit mode
  isEditMode?: boolean;
  initialServingsConsumed?: number;
}

const MotionBox = motion.create(Box);

export function RecipeNutritionDrawer({
  isOpen,
  onClose,
  nutritionData,
  mealName,
  onAddToMeal,
  isEditMode = false,
  initialServingsConsumed = 1,
}: RecipeNutritionDrawerProps) {
  const [servingsConsumed, setServingsConsumed] = useState(
    isEditMode ? initialServingsConsumed : 1
  );

  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;

  const formatValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "0";
    const scaled = value * servingsConsumed;
    return scaled < 1 ? scaled.toFixed(2) : scaled.toFixed(1);
  };

  const formatNutrientValue = (nutrient: RecipeNutrient | null): string => {
    if (!nutrient) return "0";
    return formatValue(nutrient.amount);
  };

  const handleAdd = () => {
    onAddToMeal(servingsConsumed);
    onClose();
  };

  if (!isOpen) return null;

  const content = (
    <VStack align="stretch" gap={{ base: 3, md: 4 }} h="full">
      {/* Header */}
      <HStack justify="space-between" align="center">
        <Heading size={{ base: "md", md: "lg" }} color="text.default">
          Nutrition Facts
        </Heading>
        <Button onClick={onClose} variant="ghost" size="sm" colorPalette="gray">
          <IoClose size={24} />
        </Button>
      </HStack>

      {/* Recipe Name */}
      <Box>
        <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="semibold" color="text.default">
          {nutritionData.recipeName}
        </Text>
        <Text fontSize="sm" color="text.muted" mt={1}>
          Recipe • {nutritionData.servings} {nutritionData.servings === 1 ? "serving" : "servings"} total
        </Text>
      </Box>

      <Separator />

      {/* Servings Control */}
      <Box>
        <HStack justify="space-between" align="center" mb={2}>
          <VStack align="start" gap={0}>
            <Text fontSize="sm" fontWeight="medium" color="text.default">
              Servings Consumed
            </Text>
            <Text fontSize="xs" color="text.muted">
              How many servings did you have?
            </Text>
          </VStack>
          <HStack gap={2}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setServingsConsumed(Math.max(0.25, servingsConsumed - 0.25))}
              disabled={servingsConsumed <= 0.25}
            >
              −
            </Button>
            <Box
              bg="background.subtle"
              px={4}
              py={2}
              borderRadius="md"
              borderWidth="1px"
              borderColor="border.default"
              minW="60px"
              textAlign="center"
            >
              <Text fontWeight="bold" color="text.default">
                {servingsConsumed}
              </Text>
            </Box>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setServingsConsumed(servingsConsumed + 0.25)}
            >
              +
            </Button>
          </HStack>
        </HStack>
      </Box>

      <Separator />

      {/* Nutrition Label */}
      <Box
        bg="background.subtle"
        borderRadius="lg"
        borderWidth="2px"
        borderColor="border.default"
        p={{ base: 3, md: 4 }}
        flex="1"
        overflowY="auto"
      >
        <VStack align="stretch" gap={3}>
          {/* Calories */}
          <Box>
            <Text fontSize="sm" color="text.muted" fontWeight="medium">
              CALORIES
            </Text>
            <Text fontSize={{ base: "3xl", md: "4xl" }} fontWeight="bold" color="brand.500">
              {formatValue(nutritionData.calories)}
            </Text>
          </Box>

          <Separator />

          {/* Macronutrients */}
          <VStack align="stretch" gap={2}>
            <Text fontSize="sm" fontWeight="bold" color="text.muted">
              MACRONUTRIENTS
            </Text>

            <Grid templateColumns="1fr auto" gap={2}>
              <Text color="text.default">Total Fat</Text>
              <Text fontWeight="semibold" color="text.default">
                {formatNutrientValue(nutritionData.totalFat)} {nutritionData.totalFat?.unit || "g"}
              </Text>

              <Text color="text.default">Total Carbohydrates</Text>
              <Text fontWeight="semibold" color="text.default">
                {formatNutrientValue(nutritionData.carbohydrates)} {nutritionData.carbohydrates?.unit || "g"}
              </Text>

              {nutritionData.fiber && (
                <>
                  <Text color="text.default" pl={4} fontSize="sm">
                    • Dietary Fiber
                  </Text>
                  <Text fontWeight="medium" color="text.muted" fontSize="sm">
                    {formatNutrientValue(nutritionData.fiber)} {nutritionData.fiber.unit}
                  </Text>
                </>
              )}

              {nutritionData.sugars && (
                <>
                  <Text color="text.default" pl={4} fontSize="sm">
                    • Sugars
                  </Text>
                  <Text fontWeight="medium" color="text.muted" fontSize="sm">
                    {formatNutrientValue(nutritionData.sugars)} {nutritionData.sugars.unit}
                  </Text>
                </>
              )}

              <Text color="text.default">Protein</Text>
              <Text fontWeight="semibold" color="text.default">
                {formatNutrientValue(nutritionData.protein)} {nutritionData.protein?.unit || "g"}
              </Text>
            </Grid>
          </VStack>

          {/* Micronutrients (only show if any exist) */}
          {(nutritionData.sodium || nutritionData.potassium || nutritionData.calcium ||
            nutritionData.iron || nutritionData.vitaminC || nutritionData.vitaminA) && (
            <>
              <Separator />
              <VStack align="stretch" gap={2} pt={2}>
                <Text fontSize="sm" fontWeight="bold" color="text.muted">
                  VITAMINS & MINERALS
                </Text>

                <Grid templateColumns="1fr auto" gap={2}>
                  {nutritionData.sodium && (
                    <>
                      <Text color="text.default">Sodium</Text>
                      <Text fontWeight="medium" color="text.default">
                        {formatNutrientValue(nutritionData.sodium)} {nutritionData.sodium.unit}
                      </Text>
                    </>
                  )}

                  {nutritionData.potassium && (
                    <>
                      <Text color="text.default">Potassium</Text>
                      <Text fontWeight="medium" color="text.default">
                        {formatNutrientValue(nutritionData.potassium)} {nutritionData.potassium.unit}
                      </Text>
                    </>
                  )}

                  {nutritionData.calcium && (
                    <>
                      <Text color="text.default">Calcium</Text>
                      <Text fontWeight="medium" color="text.default">
                        {formatNutrientValue(nutritionData.calcium)} {nutritionData.calcium.unit}
                      </Text>
                    </>
                  )}

                  {nutritionData.iron && (
                    <>
                      <Text color="text.default">Iron</Text>
                      <Text fontWeight="medium" color="text.default">
                        {formatNutrientValue(nutritionData.iron)} {nutritionData.iron.unit}
                      </Text>
                    </>
                  )}

                  {nutritionData.vitaminC && (
                    <>
                      <Text color="text.default">Vitamin C</Text>
                      <Text fontWeight="medium" color="text.default">
                        {formatNutrientValue(nutritionData.vitaminC)} {nutritionData.vitaminC.unit}
                      </Text>
                    </>
                  )}

                  {nutritionData.vitaminA && (
                    <>
                      <Text color="text.default">Vitamin A</Text>
                      <Text fontWeight="medium" color="text.default">
                        {formatNutrientValue(nutritionData.vitaminA)} {nutritionData.vitaminA.unit}
                      </Text>
                    </>
                  )}
                </Grid>
              </VStack>
            </>
          )}
        </VStack>
      </Box>

      {/* Add/Update Button */}
      <Button
        colorPalette="brand"
        size={{ base: "md", md: "lg" }}
        onClick={handleAdd}
        w="full"
        transition="all 0.2s"
        _hover={{
          transform: "translateY(-2px)",
          boxShadow: "0 4px 12px var(--chakra-colors-brand-500-alpha)",
        }}
        _active={{
          transform: "translateY(0px)",
        }}
      >
        {isEditMode ? "Update" : `Add to ${mealName}`}
      </Button>
    </VStack>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <MotionBox
            position="fixed"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="blackAlpha.700"
            zIndex={1000}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Drawer/Modal Content */}
          <MotionBox
            position="fixed"
            top={0}
            right={{ base: "auto", md: 0 }}
            bottom={{ base: "auto", md: 0 }}
            left={{ base: "50%", md: "auto" }}
            w={{ base: "100vw", md: "500px" }}
            maxW={{ base: "100vw", md: "auto" }}
            h={{ base: "100dvh", md: "100%" }}
            maxH={{ base: "100dvh", md: "100%" }}
            bg="background.canvas"
            borderRadius={{ base: "xl", md: 0 }}
            borderLeftWidth={{ base: 0, md: "1px" }}
            borderColor="border.default"
            boxShadow="2xl"
            zIndex={1001}
            p={{ base: 4, md: 6 }}
            overflowY="auto"
            initial={{
              x: isMobile ? "-50%" : "100%",
              opacity: isMobile ? 0 : 1,
            }}
            animate={{
              x: isMobile ? "-50%" : 0,
              opacity: 1,
            }}
            exit={{
              x: isMobile ? "-50%" : "100%",
              opacity: isMobile ? 0 : 1,
            }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {content}
          </MotionBox>
        </>
      )}
    </AnimatePresence>
  );
}
