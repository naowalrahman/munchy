'use client';

import {
    Box,
    VStack,
    HStack,
    Text,
    Input,
    Button,
    Heading,
    Spinner,
    InputGroup,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { searchFoods, getFoodNutrition, FoodSearchResult, NutritionalData } from "@/app/actions/food";
import { motion, AnimatePresence } from "framer-motion";
import { IoClose, IoSearch } from "react-icons/io5";
import { logFoodEntry } from "@/app/actions/foodLog";
import { toaster } from "@/components/ui/toaster";
import dynamic from "next/dynamic";
import type { NutritionFactsDrawerProps } from "./NutritionFactsDrawer";

export interface FoodSearchDialogProps {
    isOpen: boolean;
    onClose: () => void;
    mealName: string;
    onFoodAdded: () => void;
}

const MotionBox = motion.create(Box);
const MotionVStack = motion.create(VStack);

const NutritionFactsDrawer = dynamic<NutritionFactsDrawerProps>(
    () => import("./NutritionFactsDrawer").then((mod) => mod.NutritionFactsDrawer),
    { ssr: false }
);

export function FoodSearchDialog({
    isOpen,
    onClose,
    mealName,
    onFoodAdded,
}: FoodSearchDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedFood, setSelectedFood] = useState<NutritionalData | null>(null);
    const [isNutritionDrawerOpen, setIsNutritionDrawerOpen] = useState(false);
    const [isLoadingNutrition, setIsLoadingNutrition] = useState(false);

    // Debounced search
    useEffect(() => {
        if (searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const results = await searchFoods(searchQuery, 20);
                setSearchResults(results);
            } catch (error) {
                console.error("Search error:", error);
                toaster.create({
                    title: "Search failed",
                    description: error instanceof Error ? error.message : "Failed to search foods",
                    type: "error",
                });
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleFoodClick = async (food: FoodSearchResult) => {
        setIsLoadingNutrition(true);
        try {
            const nutritionData = await getFoodNutrition(food.fdcId);
            setSelectedFood(nutritionData);
            setIsNutritionDrawerOpen(true);
        } catch (error) {
            console.error("Error loading nutrition:", error);
            toaster.create({
                title: "Failed to load nutrition",
                description: error instanceof Error ? error.message : "Could not load nutrition information",
                type: "error",
            });
        } finally {
            setIsLoadingNutrition(false);
        }
    };

    // Helper function to normalize unit names for comparison
    const normalizeUnit = (unit: string): string => {
        const unitMap: Record<string, string> = {
            'g': 'g',
            'gram': 'g',
            'grams': 'g',
            'oz': 'oz',
            'ounce': 'oz',
            'ounces': 'oz',
            'lb': 'lb',
            'pound': 'lb',
            'pounds': 'lb',
            'ml': 'ml',
            'milliliter': 'ml',
            'milliliters': 'ml',
            'cup': 'cup',
            'cups': 'cup',
            'tbsp': 'tbsp',
            'tablespoon': 'tbsp',
            'tablespoons': 'tbsp',
            'tsp': 'tsp',
            'teaspoon': 'tsp',
            'teaspoons': 'tsp',
            'piece': 'piece',
            'pieces': 'piece',
            'slice': 'slice',
            'slices': 'slice',
        };
        
        const normalized = unit.toLowerCase().trim();
        return unitMap[normalized] || normalized;
    };

    const handleAddToMeal = async (servingAmount: number, servingUnit: string, nutritionData: NutritionalData) => {
        try {
            // Calculate nutrition values based on the serving amount and unit
            // Nutrition data from API is per serving
            let multiplier = servingAmount;
            
            const servingSizeForCalc = nutritionData.servingSize || 100;
            const servingSizeUnitNormalized = normalizeUnit(nutritionData.servingSizeUnit || "g");
            const currentUnitNormalized = normalizeUnit(servingUnit);
            
            if (servingSizeForCalc > 0) {
                if (currentUnitNormalized === 'serving') {
                    // User selected "serving" - multiplier is just the amount
                    multiplier = servingAmount;
                } else if (currentUnitNormalized === servingSizeUnitNormalized) {
                    // User selected the same unit as the serving size (e.g., "cup" when serving is "cup")
                    // Convert to servings: if 1 serving = 1 cup, then 2 cups = 2 servings
                    multiplier = servingAmount / servingSizeForCalc;
                }
            }

            const response = await logFoodEntry({
                meal_name: mealName,
                food_fdc_id: nutritionData.fdcId,
                food_description: nutritionData.description,
                serving_amount: servingAmount,
                serving_unit: servingUnit,
                calories: nutritionData.calories * multiplier,
                protein: nutritionData.protein ? nutritionData.protein.amount * multiplier : null,
                carbohydrates: nutritionData.carbohydrates ? nutritionData.carbohydrates.amount * multiplier : null,
                total_fat: nutritionData.totalFat ? nutritionData.totalFat.amount * multiplier : null,
            });

            if (response.success) {
                toaster.create({
                    title: "Food added",
                    description: `Added to ${mealName}`,
                    type: "success",
                });
                onFoodAdded();
                onClose();
            } else {
                toaster.create({
                    title: "Failed to add food",
                    description: response.error || "Something went wrong",
                    type: "error",
                });
            }
        } catch (error) {
            console.error("Error adding food:", error);
            toaster.create({
                title: "Error",
                description: "Failed to add food to meal",
                type: "error",
            });
        }
    };

    const handleClose = () => {
        setSearchQuery("");
        setSearchResults([]);
        setSelectedFood(null);
        setIsNutritionDrawerOpen(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <MotionBox
                        position="fixed"
                        top={0}
                        left={0}
                        right={0}
                        bottom={0}
                        bg="blackAlpha.700"
                        zIndex={999}
                        onClick={handleClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    />
                )}
            </AnimatePresence>

            {/* Dialog */}
            <AnimatePresence>
                {isOpen && (
                    <MotionBox
                        position="fixed"
                        top="50%"
                        left="50%"
                        w={{ base: "95vw", md: "600px" }}
                        maxH="80vh"
                        bg="background.canvas"
                        borderRadius="xl"
                        borderWidth="1px"
                        borderColor="border.default"
                        boxShadow="2xl"
                        zIndex={1000}
                        p={6}
                        initial={{ x: "-50%", y: "-50%", opacity: 0, scale: 0.95 }}
                        animate={{ x: "-50%", y: "-50%", opacity: 1, scale: 1 }}
                        exit={{ x: "-50%", y: "-50%", opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                        <VStack align="stretch" gap={4} h="full">
                            {/* Header */}
                            <HStack justify="space-between" align="center">
                                <Heading size="lg" color="text.default">
                                    Search Foods
                                </Heading>
                                <Button
                                    onClick={handleClose}
                                    variant="ghost"
                                    size="sm"
                                    colorPalette="gray"
                                >
                                    <IoClose size={24} />
                                </Button>
                            </HStack>

                            <Text color="text.muted" fontSize="sm">
                                Add to: <Text as="span" color="brand.500" fontWeight="semibold">{mealName}</Text>
                            </Text>

                            {/* Search Input */}
                            <InputGroup>
                                <Box position="relative" w="full">
                                    <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="text.muted">
                                        <IoSearch size={20} />
                                    </Box>
                                    <Input
                                        placeholder="Search for foods..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        size="lg"
                                        pl={10}
                                        bg="background.subtle"
                                        borderColor="border.default"
                                        _hover={{ borderColor: "brand.500" }}
                                        _focus={{ borderColor: "brand.500", boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)" }}
                                    />
                                </Box>
                            </InputGroup>

                            {/* Loading State */}
                            {isSearching && (
                                <HStack justify="center" py={8}>
                                    <Spinner size="lg" colorPalette="brand" />
                                </HStack>
                            )}

                            {/* Search Results */}
                            {!isSearching && searchResults.length > 0 && (
                                <Box
                                    flex="1"
                                    overflowY="auto"
                                    maxH="400px"
                                    borderRadius="md"
                                    borderWidth="1px"
                                    borderColor="border.default"
                                >
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
                                        {searchResults.map((food, index) => (
                                            <MotionBox
                                                key={food.fdcId}
                                                p={4}
                                                borderBottomWidth={index < searchResults.length - 1 ? "1px" : "0"}
                                                borderColor="border.default"
                                                cursor="pointer"
                                                _hover={{ 
                                                    bg: "background.subtle",
                                                    transform: "translateX(4px)",
                                                    borderLeftWidth: "3px",
                                                    borderLeftColor: "brand.500",
                                                }}
                                                onClick={() => handleFoodClick(food)}
                                                variants={{
                                                    hidden: { opacity: 0, x: -20 },
                                                    visible: { opacity: 1, x: 0 },
                                                }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <VStack align="start" gap={1}>
                                                    <Text color="text.default" fontWeight="medium">
                                                        {food.description}
                                                    </Text>
                                                    {food.brandName && (
                                                        <Text fontSize="sm" color="text.muted">
                                                            {food.brandName}
                                                        </Text>
                                                    )}
                                                    {food.servingSize && food.servingSizeUnit && (
                                                        <Text fontSize="xs" color="text.muted">
                                                            Serving: {food.servingSize} {food.servingSizeUnit}
                                                        </Text>
                                                    )}
                                                </VStack>
                                            </MotionBox>
                                        ))}
                                    </MotionVStack>
                                </Box>
                            )}

                            {/* No Results */}
                            {!isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                                <Box py={8} textAlign="center">
                                    <Text color="text.muted">No foods found. Try a different search term.</Text>
                                </Box>
                            )}

                            {/* Empty State */}
                            {!isSearching && searchQuery.trim().length < 2 && (
                                <Box py={8} textAlign="center">
                                    <Text color="text.muted">Start typing to search for foods</Text>
                                </Box>
                            )}
                        </VStack>
                    </MotionBox>
                )}
            </AnimatePresence>

            {/* Nutrition Facts Drawer */}
            {isLoadingNutrition ? (
                <Box
                    position="fixed"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    zIndex={1002}
                >
                    <Spinner size="xl" colorPalette="brand" />
                </Box>
            ) : (
                isNutritionDrawerOpen &&
                selectedFood && (
                    <NutritionFactsDrawer
                        key={selectedFood.fdcId}
                        nutritionData={selectedFood}
                        mealName={mealName}
                        isOpen={isNutritionDrawerOpen}
                        onClose={() => setIsNutritionDrawerOpen(false)}
                        onAddToMeal={handleAddToMeal}
                    />
                )
            )}
        </>
    );
}

