"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Box, Container, VStack, HStack, Heading, Grid, SimpleGrid, Skeleton } from "@chakra-ui/react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { InsightsData, getDailyInsights, getWeeklyInsights, getMonthlyInsights } from "@/app/actions/insights";
import { ViewModeSelector, ViewMode } from "@/components/insights/ViewModeSelector";
import { DateRangePicker } from "@/components/insights/DateRangePicker";
import { InsightCard } from "@/components/insights/InsightCard";
import { InsightsTable } from "@/components/insights/InsightsTable";
import { EmptyState } from "@/components/insights/EmptyState";
import { formatLocalDate, getStartOfWeek } from "@/utils/dateHelpers";
import type { TrendChartProps } from "@/components/insights/TrendChart";
import type { MacroBarChartProps } from "@/components/insights/MacroBarChart";
import type { MacroPieChartProps } from "@/components/insights/MacroPieChart";

const TrendChart = dynamic<TrendChartProps>(
  () => import("@/components/insights/TrendChart").then((mod) => mod.TrendChart),
  {
    ssr: false,
    loading: () => <Skeleton height={{ base: "250px", md: "300px" }} borderRadius="xl" />,
  }
);

const MacroBarChart = dynamic<MacroBarChartProps>(
  () => import("@/components/insights/MacroBarChart").then((mod) => mod.MacroBarChart),
  {
    ssr: false,
    loading: () => <Skeleton height={{ base: "200px", md: "250px" }} borderRadius="xl" />,
  }
);

const MacroPieChart = dynamic<MacroPieChartProps>(
  () => import("@/components/insights/MacroPieChart").then((mod) => mod.MacroPieChart),
  {
    ssr: false,
    loading: () => <Skeleton height={{ base: "280px", md: "320px" }} borderRadius="xl" />,
  }
);

const MotionBox = motion.create(Box);

function getCurrentWeekStart(): string {
  return formatLocalDate(getStartOfWeek(new Date()));
}

interface InsightsClientProps {
  initialData: InsightsData | null;
}

export default function InsightsClient({ initialData }: InsightsClientProps) {
  const [data, setData] = useState<InsightsData | null>(initialData);
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const isInitialMount = useRef(true);

  const now = new Date();
  const [selectedWeekStart, setSelectedWeekStart] = useState(getCurrentWeekStart);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadData = useCallback(async (mode: ViewMode, weekStart?: string, year?: number, month?: number) => {
    setIsLoading(true);
    try {
      let response;
      if (mode === "daily") {
        response = await getDailyInsights(7);
      } else if (mode === "weekly") {
        response = await getWeeklyInsights(weekStart);
      } else {
        response = await getMonthlyInsights(year, month);
      }

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
    loadData(viewMode, selectedWeekStart, selectedYear, selectedMonth);
  }, [viewMode, selectedWeekStart, selectedYear, selectedMonth, loadData]);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const handleWeekChange = (weekStart: string) => {
    setSelectedWeekStart(weekStart);
  };

  const handleMonthChange = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  const hasData = data && data.summary.totalDaysLogged > 0;

  return (
    <Box minH="100vh" bg="background.canvas" py={8}>
      <Container maxW="6xl">
        <VStack align="stretch" gap={8}>
          <MotionBox initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <VStack align="stretch" gap={4}>
              <HStack justify="space-between" align="center" flexWrap="wrap" gap={4}>
                <HStack gap={4}>
                  <Heading size="lg" color="text.default">
                    Insights
                  </Heading>
                </HStack>
                <ViewModeSelector value={viewMode} onChange={handleViewModeChange} isLoading={isLoading} />
              </HStack>
              {viewMode !== "daily" && (
                <HStack justify="center">
                  <DateRangePicker
                    viewMode={viewMode}
                    selectedWeekStart={selectedWeekStart}
                    selectedYear={selectedYear}
                    selectedMonth={selectedMonth}
                    onWeekChange={handleWeekChange}
                    onMonthChange={handleMonthChange}
                    isLoading={isLoading}
                  />
                </HStack>
              )}
            </VStack>
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

              {isMounted && (
                <>
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
                </>
              )}

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
