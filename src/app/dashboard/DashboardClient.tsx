"use client";

import { getMealSummary, FoodLogEntry } from "@/app/actions/foodLog";
import { UserGoals } from "@/app/actions/userGoals";
import { CustomMealDialog } from "@/components/dashboard/CustomMealDialog";
import { DailySummary } from "@/components/dashboard/DailySummary";
import { DailySummarySkeleton, MealSectionSkeleton } from "@/components/dashboard/LoadingSkeleton";
import { MealSection } from "@/components/dashboard/MealSection";
import { DateSelector } from "@/components/dashboard/DateSelector";
import { toaster } from "@/components/ui/toaster";
import { Box, Button, Container, Heading, HStack, VStack } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IoAdd, IoChatbubbleEllipses } from "react-icons/io5";
import { useRouter } from "next/navigation";
import { signOut } from "./actions";

const MotionBox = motion.create(Box);
const STANDARD_MEALS = ["Breakfast", "Lunch", "Dinner"] as const;

const deriveCustomMeals = (data: Record<string, FoodLogEntry[]>): string[] => {
  return Object.keys(data).filter((name) => !STANDARD_MEALS.includes(name as (typeof STANDARD_MEALS)[number]));
};

interface DashboardClientProps {
  initialMealData: Record<string, FoodLogEntry[]>;
  initialEntries: FoodLogEntry[];
  initialDate: string;
  initialGoals: UserGoals | null;
}

export default function DashboardClient({
  initialMealData,
  initialEntries,
  initialDate,
  initialGoals,
}: DashboardClientProps) {
  const [mealData, setMealData] = useState<Record<string, FoodLogEntry[]>>(initialMealData);
  const [allEntries, setAllEntries] = useState<FoodLogEntry[]>(initialEntries);
  const [isCustomMealDialogOpen, setIsCustomMealDialogOpen] = useState(false);
  const [customMeals, setCustomMeals] = useState<string[]>(() => deriveCustomMeals(initialMealData));
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const isInitialMount = useRef(true);
  const router = useRouter();

  const standardMeals = useMemo(() => [...STANDARD_MEALS], []);

  const loadFoodLogs = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const response = await getMealSummary(selectedDate);
      if (response.success && response.data) {
        setMealData(response.data);
        const entries = Object.values(response.data).flat();
        setAllEntries(entries);
        setCustomMeals(deriveCustomMeals(response.data));
      } else if (response.error) {
        toaster.create({
          title: "Unable to load meals",
          description: response.error,
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error loading meal summary:", error);
      toaster.create({
        title: "Unexpected error",
        description: "Failed to load meals. Please try again.",
        type: "error",
      });
    } finally {
      setIsLoadingData(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    // Skip loading on initial mount since we already have initial data
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    loadFoodLogs();
  }, [loadFoodLogs, selectedDate]);

  const handleAddCustomMeal = (mealName: string) => {
    if (!customMeals.includes(mealName)) {
      setCustomMeals((prev) => [...prev, mealName]);
    }
  };

  return (
    <Box minH="100dvh" bg="background.canvas" py={{ base: 4, md: 8 }}>
      <Container maxW={{ base: "full", lg: "7xl" }} px={{ base: 4, md: 6 }}>
        <VStack align="stretch" gap={{ base: 6, md: 8 }}>
          <MotionBox initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <HStack justify="center" align="center" flexWrap="wrap" gap={{ base: 3, md: 4 }}>
              <DateSelector currentDate={selectedDate} onDateChange={setSelectedDate} />
            </HStack>
          </MotionBox>

          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            {isLoadingData && allEntries.length === 0 ? (
              <DailySummarySkeleton />
            ) : (
              <DailySummary entries={allEntries} initialGoals={initialGoals ?? undefined} />
            )}
          </MotionBox>

          <VStack align="stretch" gap={6}>
            {isLoadingData && (
              <>
                <MealSectionSkeleton />
                <MealSectionSkeleton />
                <MealSectionSkeleton />
              </>
            )}

            {!isLoadingData &&
              standardMeals.map((mealName, index) => (
                <MotionBox
                  key={mealName}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                >
                  <MealSection mealName={mealName} entries={mealData[mealName] || []} onFoodAdded={loadFoodLogs} />
                </MotionBox>
              ))}

            {!isLoadingData &&
              customMeals.map((mealName, index) => (
                <MotionBox
                  key={mealName}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                >
                  <MealSection mealName={mealName} entries={mealData[mealName] || []} onFoodAdded={loadFoodLogs} />
                </MotionBox>
              ))}

            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 }}
            >
              <Button
                variant="outline"
                colorPalette="brand"
                size={{ base: "md", md: "lg" }}
                w="full"
                onClick={() => setIsCustomMealDialogOpen(true)}
              >
                <IoAdd />
                Add Custom Meal
              </Button>
            </MotionBox>
          </VStack>
        </VStack>
      </Container>

      <CustomMealDialog
        isOpen={isCustomMealDialogOpen}
        onClose={() => setIsCustomMealDialogOpen(false)}
        onAddMeal={handleAddCustomMeal}
      />

      {/* Floating AI Agent Button */}
      <MotionBox
        position="fixed"
        bottom={{ base: 6, md: 8 }}
        right={{ base: 6, md: 8 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.8 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          colorPalette="brand"
          size="xl"
          borderRadius="full"
          w={16}
          h={16}
          boxShadow="0 8px 32px rgba(49, 151, 149, 0.4)"
          onClick={() => router.push("/agent")}
          _hover={{
            boxShadow: "0 12px 40px rgba(49, 151, 149, 0.6)",
          }}
        >
          <IoChatbubbleEllipses size={28} />
        </Button>
      </MotionBox>
    </Box>
  );
}
