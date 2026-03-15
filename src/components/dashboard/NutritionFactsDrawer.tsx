"use client";

import { Box, VStack, HStack, Text, Button, Heading, Separator, Grid, useBreakpointValue } from "@chakra-ui/react";
import { useState, useCallback } from "react";
import { NutritionalData } from "@/app/actions/food";
import { ServingSizeControl } from "./ServingSizeControl";
import { getNutritionMultiplier } from "@/utils/nutritionMultiplier";
import { motion, AnimatePresence } from "framer-motion";
import { IoClose, IoHeart, IoHeartOutline } from "react-icons/io5";

export interface NutritionFactsDrawerProps {
  nutritionData: NutritionalData | null;
  mealName: string;
  isOpen: boolean;
  onClose: () => void;
  onAddToMeal: (servingAmount: number, servingUnit: string, nutritionData: NutritionalData) => void;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
  subtitle?: string;
  isEditMode?: boolean;
  initialServingAmount?: number;
  initialServingUnit?: string;
}

const MotionBox = motion.create(Box);

export function NutritionFactsDrawer({
  nutritionData,
  mealName,
  isOpen,
  onClose,
  onAddToMeal,
  isFavorited,
  onToggleFavorite,
  subtitle,
  isEditMode = false,
  initialServingAmount = 1,
  initialServingUnit = "serving",
}: NutritionFactsDrawerProps) {
  const [servingAmount, setServingAmount] = useState(isEditMode ? initialServingAmount : 1);
  const [servingUnit, setServingUnit] = useState(isEditMode ? initialServingUnit : "serving");

  const isMobile = useBreakpointValue({ base: true, md: false }) ?? false;

  const handleServingChange = useCallback((amount: number, unit: string) => {
    setServingAmount(amount);
    setServingUnit(unit);
  }, []);

  if (!isOpen || !nutritionData) return null;

  const handleAddToMeal = () => {
    onAddToMeal(servingAmount, servingUnit, nutritionData);
    onClose();
  };

  const multiplier = getNutritionMultiplier(
    servingAmount,
    servingUnit,
    nutritionData.servingSize,
    nutritionData.servingSizeUnit
  );

  const formatNutrientValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "0";
    const adjusted = value * multiplier;
    return adjusted < 1 ? adjusted.toFixed(2) : adjusted.toFixed(1);
  };

  const defaultServingAmount = isEditMode ? initialServingAmount : 1;
  const defaultServingUnit = isEditMode ? initialServingUnit : "serving";

  const content = (
    <VStack align="stretch" gap={{ base: 3, md: 4 }} h="full">
      <HStack justify="space-between" align="center">
        <Heading size={{ base: "md", md: "lg" }} color="text.default">
          Nutrition Facts
        </Heading>
        <HStack gap={1}>
          {onToggleFavorite && (
            <Button
              onClick={onToggleFavorite}
              variant="ghost"
              size="sm"
              colorPalette={isFavorited ? "red" : "gray"}
              aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
            >
              {isFavorited ? <IoHeart size={20} /> : <IoHeartOutline size={20} />}
            </Button>
          )}
          <Button onClick={onClose} variant="ghost" size="sm" colorPalette="gray">
            <IoClose size={24} />
          </Button>
        </HStack>
      </HStack>

      <Box>
        <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="semibold" color="text.default">
          {nutritionData.description}
        </Text>
        {(subtitle || nutritionData.brandName) && (
          <Text fontSize="sm" color="text.muted" mt={1}>
            {subtitle || nutritionData.brandName}
          </Text>
        )}
      </Box>

      <Separator />

      <ServingSizeControl
        key={`${nutritionData.fdcId}-${defaultServingAmount}-${defaultServingUnit}`}
        defaultAmount={defaultServingAmount}
        defaultUnit={defaultServingUnit}
        servingSize={nutritionData.servingSize}
        servingSizeUnit={nutritionData.servingSizeUnit}
        onChange={handleServingChange}
      />

      <Separator />

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
          <Box>
            <Text fontSize="sm" color="text.muted" fontWeight="medium">
              CALORIES
            </Text>
            <Text fontSize={{ base: "3xl", md: "4xl" }} fontWeight="bold" color="brand.500">
              {formatNutrientValue(nutritionData.calories)}
            </Text>
          </Box>

          <Separator />

          <VStack align="stretch" gap={2}>
            <Text fontSize="sm" fontWeight="bold" color="text.muted">
              MACRONUTRIENTS
            </Text>

            <Grid templateColumns="1fr auto" gap={2}>
              <Text color="text.default">Total Fat</Text>
              <Text fontWeight="semibold" color="text.default">
                {formatNutrientValue(nutritionData.totalFat?.amount)} {nutritionData.totalFat?.unit || "g"}
              </Text>

              <Text color="text.default">Total Carbohydrates</Text>
              <Text fontWeight="semibold" color="text.default">
                {formatNutrientValue(nutritionData.carbohydrates?.amount)} {nutritionData.carbohydrates?.unit || "g"}
              </Text>

              <Text color="text.default" pl={4} fontSize="sm">
                • Dietary Fiber
              </Text>
              <Text fontWeight="medium" color="text.muted" fontSize="sm">
                {formatNutrientValue(nutritionData.fiber?.amount)} {nutritionData.fiber?.unit || "g"}
              </Text>

              <Text color="text.default" pl={4} fontSize="sm">
                • Sugars
              </Text>
              <Text fontWeight="medium" color="text.muted" fontSize="sm">
                {formatNutrientValue(nutritionData.sugars?.amount)} {nutritionData.sugars?.unit || "g"}
              </Text>

              <Text color="text.default">Protein</Text>
              <Text fontWeight="semibold" color="text.default">
                {formatNutrientValue(nutritionData.protein?.amount)} {nutritionData.protein?.unit || "g"}
              </Text>
            </Grid>
          </VStack>

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
                    {formatNutrientValue(nutritionData.sodium.amount)} {nutritionData.sodium.unit}
                  </Text>
                </>
              )}

              {nutritionData.potassium && (
                <>
                  <Text color="text.default">Potassium</Text>
                  <Text fontWeight="medium" color="text.default">
                    {formatNutrientValue(nutritionData.potassium.amount)} {nutritionData.potassium.unit}
                  </Text>
                </>
              )}

              {nutritionData.calcium && (
                <>
                  <Text color="text.default">Calcium</Text>
                  <Text fontWeight="medium" color="text.default">
                    {formatNutrientValue(nutritionData.calcium.amount)} {nutritionData.calcium.unit}
                  </Text>
                </>
              )}

              {nutritionData.iron && (
                <>
                  <Text color="text.default">Iron</Text>
                  <Text fontWeight="medium" color="text.default">
                    {formatNutrientValue(nutritionData.iron.amount)} {nutritionData.iron.unit}
                  </Text>
                </>
              )}

              {nutritionData.vitaminC && (
                <>
                  <Text color="text.default">Vitamin C</Text>
                  <Text fontWeight="medium" color="text.default">
                    {formatNutrientValue(nutritionData.vitaminC.amount)} {nutritionData.vitaminC.unit}
                  </Text>
                </>
              )}

              {nutritionData.vitaminA && (
                <>
                  <Text color="text.default">Vitamin A</Text>
                  <Text fontWeight="medium" color="text.default">
                    {formatNutrientValue(nutritionData.vitaminA.amount)} {nutritionData.vitaminA.unit}
                  </Text>
                </>
              )}
            </Grid>
          </VStack>
        </VStack>
      </Box>

      <Button
        colorPalette="brand"
        size={{ base: "md", md: "lg" }}
        onClick={handleAddToMeal}
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
        {isEditMode ? "Update Entry" : `Add to ${mealName}`}
      </Button>
    </VStack>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
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
