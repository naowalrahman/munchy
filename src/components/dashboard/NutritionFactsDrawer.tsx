'use client';

import {
    Box,
    VStack,
    HStack,
    Text,
    Button,
    Heading,
    Separator,
    Grid,
    useBreakpointValue,
} from "@chakra-ui/react";
import { useState, useCallback, useEffect } from "react";
import { NutritionalData } from "@/app/actions/food";
import { ServingSizeControl } from "./ServingSizeControl";
import { motion, AnimatePresence } from "framer-motion";
import { IoClose } from "react-icons/io5";

interface NutritionFactsDrawerProps {
    nutritionData: NutritionalData | null;
    mealName: string;
    isOpen: boolean;
    onClose: () => void;
    onAddToMeal: (servingAmount: number, servingUnit: string, nutritionData: NutritionalData) => void;
    // Edit mode props
    isEditMode?: boolean;
    initialServingAmount?: number;
    initialServingUnit?: string;
    editEntryId?: string;
}

const MotionBox = motion.create(Box);

export function NutritionFactsDrawer({
    nutritionData,
    mealName,
    isOpen,
    onClose,
    onAddToMeal,
    isEditMode = false,
    initialServingAmount = 1,
    initialServingUnit = "serving",
}: NutritionFactsDrawerProps) {
    const [servingAmount, setServingAmount] = useState(initialServingAmount);
    const [servingUnit, setServingUnit] = useState(initialServingUnit);

    // Determine if we should show drawer or modal based on screen size
    const isWideScreen = useBreakpointValue({ base: false, md: true });

    // Reset state when nutritionData changes or when opening in edit mode
    useEffect(() => {
        if (isOpen) {
            setServingAmount(isEditMode ? initialServingAmount : 1);
            setServingUnit(isEditMode ? initialServingUnit : "serving");
        }
    }, [isOpen, isEditMode, initialServingAmount, initialServingUnit]);

    const handleServingChange = useCallback((amount: number, unit: string) => {
        setServingAmount(amount);
        setServingUnit(unit);
    }, []);

    const handleAddToMeal = () => {
        if (nutritionData) {
            onAddToMeal(servingAmount, servingUnit, nutritionData);
            onClose();
        }
    };

    const calculateAdjustedValue = (value: number | null | undefined): number => {
        if (value === null || value === undefined) return 0;
        
        // Calculate multiplier based on unit
        let multiplier = servingAmount;
        
        // If user is viewing in grams, convert to servings first
        // Use effective serving size (default 100g if not specified)
        const servingSizeForCalc = nutritionData.servingSize || 100;
        if (servingUnit === 'g' && servingSizeForCalc > 0) {
            multiplier = servingAmount / servingSizeForCalc;
        }
        
        return value * multiplier;
    };

    const formatNutrientValue = (value: number | null | undefined): string => {
        if (value === null || value === undefined) return "0";
        const adjusted = calculateAdjustedValue(value);
        return adjusted < 1 ? adjusted.toFixed(2) : adjusted.toFixed(1);
    };

    if (!nutritionData) return null;

    // For initial display, we start with 1 serving (unless in edit mode)
    const defaultServingAmount = isEditMode ? initialServingAmount : 1;
    const defaultServingUnit = isEditMode ? initialServingUnit : "serving";
    
    // Use provided serving size or default to 100g
    const effectiveServingSize = nutritionData.servingSize || 100;
    const effectiveServingSizeUnit = nutritionData.servingSizeUnit || "g";

    const content = (
        <VStack align="stretch" gap={4} h="full">
            {/* Header */}
            <HStack justify="space-between" align="center">
                <Heading size="lg" color="text.default">
                    Nutrition Facts
                </Heading>
                <Button
                    onClick={onClose}
                    variant="ghost"
                    size="sm"
                    colorPalette="gray"
                >
                    <IoClose size={24} />
                </Button>
            </HStack>

            {/* Food Description */}
            <Box>
                <Text fontSize="xl" fontWeight="semibold" color="text.default">
                    {nutritionData.description}
                </Text>
                {nutritionData.brandName && (
                    <Text fontSize="sm" color="text.muted" mt={1}>
                        {nutritionData.brandName}
                    </Text>
                )}
            </Box>

            <Separator />

            {/* Serving Size Control */}
            <ServingSizeControl
                defaultAmount={defaultServingAmount}
                defaultUnit={defaultServingUnit}
                servingSize={effectiveServingSize}
                servingSizeUnit={effectiveServingSizeUnit}
                onChange={handleServingChange}
            />

            <Separator />

            {/* Nutrition Label */}
            <Box
                bg="background.subtle"
                borderRadius="lg"
                borderWidth="2px"
                borderColor="border.default"
                p={4}
                flex="1"
                overflowY="auto"
            >
                <VStack align="stretch" gap={3}>
                    {/* Calories */}
                    <Box>
                        <Text fontSize="sm" color="text.muted" fontWeight="medium">
                            CALORIES
                        </Text>
                        <Text fontSize="4xl" fontWeight="bold" color="brand.500">
                            {formatNutrientValue(nutritionData.calories)}
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
                                {formatNutrientValue(nutritionData.totalFat?.amount)} {nutritionData.totalFat?.unit || 'g'}
                            </Text>

                            <Text color="text.default">Total Carbohydrates</Text>
                            <Text fontWeight="semibold" color="text.default">
                                {formatNutrientValue(nutritionData.carbohydrates?.amount)} {nutritionData.carbohydrates?.unit || 'g'}
                            </Text>

                            <Text color="text.default" pl={4} fontSize="sm">• Dietary Fiber</Text>
                            <Text fontWeight="medium" color="text.muted" fontSize="sm">
                                {formatNutrientValue(nutritionData.fiber?.amount)} {nutritionData.fiber?.unit || 'g'}
                            </Text>

                            <Text color="text.default" pl={4} fontSize="sm">• Sugars</Text>
                            <Text fontWeight="medium" color="text.muted" fontSize="sm">
                                {formatNutrientValue(nutritionData.sugars?.amount)} {nutritionData.sugars?.unit || 'g'}
                            </Text>

                            <Text color="text.default">Protein</Text>
                            <Text fontWeight="semibold" color="text.default">
                                {formatNutrientValue(nutritionData.protein?.amount)} {nutritionData.protein?.unit || 'g'}
                            </Text>
                        </Grid>
                    </VStack>

                    <Separator />

                    {/* Micronutrients */}
                    <VStack align="stretch" gap={2}>
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

            {/* Add/Update Button */}
            <Button
                colorPalette="brand"
                size="lg"
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
                        top={isWideScreen ? 0 : "50%"}
                        right={isWideScreen ? 0 : "50%"}
                        bottom={isWideScreen ? 0 : undefined}
                        left={isWideScreen ? undefined : "50%"}
                        w={isWideScreen ? "500px" : "90vw"}
                        maxW={isWideScreen ? undefined : "500px"}
                        maxH={isWideScreen ? undefined : "90vh"}
                        bg="background.canvas"
                        borderRadius={isWideScreen ? "0" : "xl"}
                        borderLeftWidth={isWideScreen ? "1px" : "0"}
                        borderColor="border.default"
                        boxShadow="2xl"
                        zIndex={1001}
                        p={6}
                        overflowY="auto"
                        initial={{
                            x: isWideScreen ? "100%" : "-50%",
                            y: isWideScreen ? 0 : "-50%",
                            opacity: isWideScreen ? 1 : 0,
                        }}
                        animate={{
                            x: isWideScreen ? 0 : "-50%",
                            y: isWideScreen ? 0 : "-50%",
                            opacity: 1,
                        }}
                        exit={{
                            x: isWideScreen ? "100%" : "-50%",
                            y: isWideScreen ? 0 : "-50%",
                            opacity: isWideScreen ? 1 : 0,
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

