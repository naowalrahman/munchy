"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Box, Container, VStack, HStack, Heading, Button, Grid, SimpleGrid } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { IoArrowBack } from "react-icons/io5";
import Link from "next/link";
import { InsightsData, getDailyInsights, getWeeklyInsights, getMonthlyInsights } from "@/app/actions/insights";
import { ViewModeSelector, ViewMode } from "@/components/insights/ViewModeSelector";
import { InsightCard } from "@/components/insights/InsightCard";
import { TrendChart } from "@/components/insights/TrendChart";
import { MacroBarChart } from "@/components/insights/MacroBarChart";
import { MacroPieChart } from "@/components/insights/MacroPieChart";
import { InsightsTable } from "@/components/insights/InsightsTable";
import { EmptyState } from "@/components/insights/EmptyState";

const MotionBox = motion.create(Box);

interface InsightsClientProps {
  initialData: InsightsData | null;
}

export default function InsightsClient({ initialData }: InsightsClientProps) {
  const [data, setData] = useState<InsightsData | null>(initialData);
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [isLoading, setIsLoading] = useState(false);
  const isInitialMount = useRef(true);

  const loadData = useCallback(async (mode: ViewMode) => {
    setIsLoading(true);
    try {
      const response =
        mode === "daily"
          ? await getDailyInsights(7)
          : mode === "weekly"
            ? await getWeeklyInsights(4)
            : await getMonthlyInsights();

      if (response.success && response.data) {
        setData(response.data);
      }
    } catch (error) {
      console.error("Error loading insights:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    loadData(viewMode);
  }, [viewMode, loadData]);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const hasData = data && data.summary.totalDaysLogged > 0;

  return (
    <Box minH="100vh" bg="background.canvas" py={8}>
      <Container maxW="6xl">
        <VStack align="stretch" gap={8}>
          <MotionBox initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <HStack justify="space-between" align="center" flexWrap="wrap" gap={4}>
              <HStack gap={4}>
                <Link href="/dashboard">
                  <Button variant="ghost" colorPalette="brand">
                    <IoArrowBack />
                    Back to Dashboard
                  </Button>
                </Link>
                <Heading size="lg" color="text.default">
                  Insights
                </Heading>
              </HStack>
              <ViewModeSelector value={viewMode} onChange={handleViewModeChange} isLoading={isLoading} />
            </HStack>
          </MotionBox>

          {!hasData && !isLoading ? (
            <EmptyState />
          ) : (
            <>
              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
                  <InsightCard
                    label="Avg Calories"
                    value={data?.summary.avgCalories ?? 0}
                    unit="kcal"
                    colorPalette="brand"
                    isLoading={isLoading}
                  />
                  <InsightCard
                    label="Avg Protein"
                    value={data?.summary.avgProtein ?? 0}
                    unit="g"
                    colorPalette="blue"
                    isLoading={isLoading}
                  />
                  <InsightCard
                    label="Days Logged"
                    value={data?.summary.totalDaysLogged ?? 0}
                    colorPalette="green"
                    isLoading={isLoading}
                  />
                  <InsightCard
                    label="Goal Adherence"
                    value={data?.summary.goalAdherencePercent ?? 0}
                    unit="%"
                    colorPalette="orange"
                    isLoading={isLoading}
                  />
                </SimpleGrid>
              </MotionBox>

              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <TrendChart
                  data={data?.aggregates ?? []}
                  calorieGoal={data?.goals?.calorie_goal ?? 2000}
                  isLoading={isLoading}
                />
              </MotionBox>

              <Grid templateColumns={{ base: "1fr", lg: "1fr 2fr" }} gap={6}>
                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <MacroPieChart
                    protein={data?.summary.avgProtein ?? 0}
                    carbs={data?.summary.avgCarbs ?? 0}
                    fat={data?.summary.avgFat ?? 0}
                    isLoading={isLoading}
                  />
                </MotionBox>
                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                  <MacroBarChart data={data?.aggregates ?? []} isLoading={isLoading} />
                </MotionBox>
              </Grid>

              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              >
                <InsightsTable
                  data={data?.aggregates ?? []}
                  calorieGoal={data?.goals?.calorie_goal ?? 2000}
                  isLoading={isLoading}
                />
              </MotionBox>
            </>
          )}
        </VStack>
      </Container>
    </Box>
  );
}
