"use client";

import { Box, VStack, HStack, Text, Heading, Grid, Progress, Button } from "@chakra-ui/react";
import { useSpring, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { FoodLogEntry } from "@/app/actions/foodLog";
import { getUserGoals, UserGoals } from "@/app/actions/userGoals";
import { IoSettings } from "react-icons/io5";
import Link from "next/link";

interface DailySummaryProps {
  entries: FoodLogEntry[];
  initialGoals?: UserGoals | null;
}

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
      {displayValue}
      {suffix}
    </Text>
  );
}

export function DailySummary({ entries, initialGoals = null }: DailySummaryProps) {
  const [goals, setGoals] = useState<UserGoals | null>(initialGoals);

  useEffect(() => {
    if (initialGoals) {
      return;
    }

    let isMounted = true;
    const loadUserGoals = async () => {
      const response = await getUserGoals();
      if (isMounted && response.success && response.data) {
        setGoals(response.data);
      }
    };

    loadUserGoals();

    return () => {
      isMounted = false;
    };
  }, [initialGoals]);

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

  const macroStats = [
    { label: "Protein", value: totalProtein, goal: proteinGoal, progress: proteinProgress, color: "blue" },
    { label: "Carbs", value: totalCarbs, goal: carbGoal, progress: carbProgress, color: "green" },
    { label: "Fat", value: totalFat, goal: fatGoal, progress: fatProgress, color: "orange" },
  ];

  return (
    <Box
      bg="background.panel"
      borderRadius="none"
      p={0}
      backdropFilter="blur(12px)"
      boxShadow="0 4px 30px rgba(0, 0, 0, 0.1)"
      transition="all 0.2s"
      _hover={{
        borderColor: "brand.500/30",
        boxShadow: "0 8px 40px rgba(0, 0, 0, 0.15)",
      }}
    >
      <VStack align="stretch" gap={{ base: 4, md: 5 }}>
        {/* Header + Calories Row */}
        <Box
          bg="background.subtle"
          borderRadius="lg"
          p={{ base: 3, md: 4 }}
          borderWidth="1px"
          borderColor="border.default"
        >
          <HStack justify="space-between" align="center" gap={{ base: 3, md: 4 }} flexWrap="wrap">
            <VStack align="flex-start" gap={1} minW="200px">
              <HStack align="center" gap={2}>
                <Heading size={{ base: "sm", md: "md" }} color="text.default">
                  Summary
                </Heading>
                <Link href="/profile">
                  <Button size="xs" variant="ghost" colorPalette="brand" gap={1}>
                    <IoSettings />
                    Settings
                  </Button>
                </Link>
              </HStack>
              <Text fontSize="xs" color="text.muted">
                {entries.length} food{entries.length !== 1 ? "s" : ""} logged today
              </Text>
            </VStack>

            <VStack align={{ base: "flex-start", md: "flex-end" }} gap={2} minW={{ md: "260px" }}>
              <HStack align="baseline" gap={2}>
                <Text fontSize={{ base: "3xl", md: "4xl" }} fontWeight="bold" color="brand.500">
                  <AnimatedNumber value={Math.round(totalCalories)} />
                </Text>
                <Text fontSize={{ base: "md", md: "lg" }} color="text.muted" fontWeight="medium">
                  / {calorieGoal}
                </Text>
              </HStack>
              <Progress.Root value={calorieProgress} colorPalette="brand" size="sm" borderRadius="full" w="full">
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
              <Text fontSize="xs" color="text.muted">
                {Math.round(calorieProgress)}% of daily goal
              </Text>
            </VStack>
          </HStack>
        </Box>

        {/* Macronutrients Grid */}
        <Grid templateColumns={{ base: "repeat(auto-fit, minmax(100px, 1fr))" }} gap={{ base: 3, md: 4 }}>
          {macroStats.map(({ label, value, goal, progress, color }) => (
            <Box
              key={label}
              bg="background.subtle"
              borderRadius="md"
              p={{ base: 3, md: 3.5 }}
              borderWidth="1px"
              borderColor="border.default"
            >
              <VStack align="stretch" gap={2}>
                <HStack justify="space-between">
                  <Text fontSize="xs" color="text.muted" textTransform="uppercase" fontWeight="medium">
                    {label}
                  </Text>
                  <Text fontSize="xs" color="text.muted">
                    {Math.round(progress)}%
                  </Text>
                </HStack>
                <HStack align="baseline" justify="space-between" gap={2}>
                  <HStack align="baseline" gap={1}>
                    <Text fontSize={{ base: "xl", md: "2xl" }} fontWeight="bold" color="text.default">
                      <AnimatedNumber value={Math.round(value)} />
                    </Text>
                    <Text fontSize="xs" color="text.muted">
                      g
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color="text.muted">
                    / {goal}g
                  </Text>
                </HStack>
                <Progress.Root value={progress} colorPalette={color} size="xs" borderRadius="full">
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              </VStack>
            </Box>
          ))}
        </Grid>
      </VStack>
    </Box>
  );
}
