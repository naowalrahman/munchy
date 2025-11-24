'use client';

import {
    Box,
    VStack,
    HStack,
    Text,
    Heading,
    Grid,
    Progress,
    Button,
} from "@chakra-ui/react";
import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { FoodLogEntry } from "@/app/actions/foodLog";
import { getUserGoals, UserGoals } from "@/app/actions/userGoals";
import { IoSettings } from "react-icons/io5";
import Link from "next/link";

interface DailySummaryProps {
    entries: FoodLogEntry[];
}

const MotionText = motion.create(Text);

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
    const [displayValue, setDisplayValue] = useState(0);
    const spring = useSpring(0, { damping: 30, stiffness: 100 });
    const rounded = useTransform(spring, (latest) => Math.round(latest));

    useEffect(() => {
        spring.set(value);
        const unsubscribe = rounded.on("change", (latest) => {
            setDisplayValue(latest);
        });
        return unsubscribe;
    }, [value, spring, rounded]);

    return (
        <Text as="span">
            {displayValue}{suffix}
        </Text>
    );
}

export function DailySummary({ entries }: DailySummaryProps) {
    const [goals, setGoals] = useState<UserGoals | null>(null);
    const [loadingGoals, setLoadingGoals] = useState(true);

    useEffect(() => {
        loadUserGoals();
    }, []);

    const loadUserGoals = async () => {
        setLoadingGoals(true);
        const response = await getUserGoals();
        if (response.success && response.data) {
            setGoals(response.data);
        }
        setLoadingGoals(false);
    };

    const totalCalories = entries.reduce((sum, entry) => sum + (entry.calories || 0), 0);
    const totalProtein = entries.reduce((sum, entry) => sum + (entry.protein || 0), 0);
    const totalCarbs = entries.reduce((sum, entry) => sum + (entry.carbohydrates || 0), 0);
    const totalFat = entries.reduce((sum, entry) => sum + (entry.total_fat || 0), 0);

    // Use user's goals or defaults
    const calorieGoal = goals?.calorie_goal || 2000;
    const proteinGoal = goals?.protein_goal || 150;
    const carbGoal = goals?.carb_goal || 250;
    const fatGoal = goals?.fat_goal || 65;

    const calorieProgress = Math.min((totalCalories / calorieGoal) * 100, 100);
    const proteinProgress = Math.min((totalProtein / proteinGoal) * 100, 100);
    const carbProgress = Math.min((totalCarbs / carbGoal) * 100, 100);
    const fatProgress = Math.min((totalFat / fatGoal) * 100, 100);

    return (
        <Box
            bg="background.panel"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="border.default"
            p={6}
            backdropFilter="blur(12px)"
            boxShadow="0 4px 30px rgba(0, 0, 0, 0.1)"
            transition="all 0.2s"
            _hover={{
                borderColor: "brand.500/30",
                boxShadow: "0 8px 40px rgba(0, 0, 0, 0.15)",
            }}
        >
            <VStack align="stretch" gap={6}>
                {/* Header */}
                <HStack justify="space-between" align="center">
                    <Heading size="lg" color="text.default">
                        Today's Summary
                    </Heading>
                    <Link href="/profile">
                        <Button 
                            size="sm" 
                            variant="ghost" 
                            colorPalette="brand"
                        >
                            <IoSettings />
                            Settings
                        </Button>
                    </Link>
                </HStack>

                {/* Total Calories - Featured */}
                <Box
                    bg="background.subtle"
                    borderRadius="lg"
                    p={6}
                    textAlign="center"
                    borderWidth="2px"
                    borderColor="brand.500"
                >
                    <Text fontSize="sm" color="text.muted" textTransform="uppercase" fontWeight="medium" mb={2}>
                        Total Calories
                    </Text>
                    <HStack justify="center" align="baseline" gap={2}>
                        <Text fontSize="5xl" fontWeight="bold" color="brand.500">
                            <AnimatedNumber value={Math.round(totalCalories)} />
                        </Text>
                        <Text fontSize="2xl" color="text.muted" fontWeight="medium">
                            / {calorieGoal}
                        </Text>
                    </HStack>
                    <Box mt={4}>
                        <Progress.Root
                            value={calorieProgress}
                            colorPalette="brand"
                            size="lg"
                            borderRadius="full"
                        >
                            <Progress.Track>
                                <Progress.Range />
                            </Progress.Track>
                        </Progress.Root>
                    </Box>
                </Box>

                {/* Macronutrients Grid */}
                <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
                    {/* Protein */}
                    <Box
                        bg="background.subtle"
                        borderRadius="lg"
                        p={4}
                    >
                        <VStack align="stretch" gap={3}>
                            <Text fontSize="xs" color="text.muted" textTransform="uppercase" fontWeight="medium">
                                Protein
                            </Text>
                            <HStack align="baseline" gap={1}>
                                <Text fontSize="3xl" fontWeight="bold" color="text.default">
                                    <AnimatedNumber value={Math.round(totalProtein)} />
                                </Text>
                                <Text fontSize="lg" color="text.muted">
                                    g
                                </Text>
                            </HStack>
                            <Box>
                                <HStack justify="space-between" mb={1}>
                                    <Text fontSize="xs" color="text.muted">
                                        Goal: {proteinGoal}g
                                    </Text>
                                    <Text fontSize="xs" color="text.muted">
                                        {Math.round(proteinProgress)}%
                                    </Text>
                                </HStack>
                                <Progress.Root
                                    value={proteinProgress}
                                    colorPalette="blue"
                                    size="sm"
                                    borderRadius="full"
                                >
                                    <Progress.Track>
                                        <Progress.Range />
                                    </Progress.Track>
                                </Progress.Root>
                            </Box>
                        </VStack>
                    </Box>

                    {/* Carbohydrates */}
                    <Box
                        bg="background.subtle"
                        borderRadius="lg"
                        p={4}
                    >
                        <VStack align="stretch" gap={3}>
                            <Text fontSize="xs" color="text.muted" textTransform="uppercase" fontWeight="medium">
                                Carbs
                            </Text>
                            <HStack align="baseline" gap={1}>
                                <Text fontSize="3xl" fontWeight="bold" color="text.default">
                                    <AnimatedNumber value={Math.round(totalCarbs)} />
                                </Text>
                                <Text fontSize="lg" color="text.muted">
                                    g
                                </Text>
                            </HStack>
                            <Box>
                                <HStack justify="space-between" mb={1}>
                                    <Text fontSize="xs" color="text.muted">
                                        Goal: {carbGoal}g
                                    </Text>
                                    <Text fontSize="xs" color="text.muted">
                                        {Math.round(carbProgress)}%
                                    </Text>
                                </HStack>
                                <Progress.Root
                                    value={carbProgress}
                                    colorPalette="green"
                                    size="sm"
                                    borderRadius="full"
                                >
                                    <Progress.Track>
                                        <Progress.Range />
                                    </Progress.Track>
                                </Progress.Root>
                            </Box>
                        </VStack>
                    </Box>

                    {/* Fat */}
                    <Box
                        bg="background.subtle"
                        borderRadius="lg"
                        p={4}
                    >
                        <VStack align="stretch" gap={3}>
                            <Text fontSize="xs" color="text.muted" textTransform="uppercase" fontWeight="medium">
                                Fat
                            </Text>
                            <HStack align="baseline" gap={1}>
                                <Text fontSize="3xl" fontWeight="bold" color="text.default">
                                    <AnimatedNumber value={Math.round(totalFat)} />
                                </Text>
                                <Text fontSize="lg" color="text.muted">
                                    g
                                </Text>
                            </HStack>
                            <Box>
                                <HStack justify="space-between" mb={1}>
                                    <Text fontSize="xs" color="text.muted">
                                        Goal: {fatGoal}g
                                    </Text>
                                    <Text fontSize="xs" color="text.muted">
                                        {Math.round(fatProgress)}%
                                    </Text>
                                </HStack>
                                <Progress.Root
                                    value={fatProgress}
                                    colorPalette="orange"
                                    size="sm"
                                    borderRadius="full"
                                >
                                    <Progress.Track>
                                        <Progress.Range />
                                    </Progress.Track>
                                </Progress.Root>
                            </Box>
                        </VStack>
                    </Box>
                </Grid>

                {/* Foods Logged Count */}
                <Box textAlign="center" pt={2}>
                    <Text fontSize="sm" color="text.muted">
                        <Text as="span" fontWeight="bold" color="brand.500">
                            {entries.length}
                        </Text>
                        {" "}food{entries.length !== 1 ? "s" : ""} logged today
                    </Text>
                </Box>
            </VStack>
        </Box>
    );
}

