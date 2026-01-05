"use client";

import { Box, Text, VStack } from "@chakra-ui/react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";
import { DailyAggregate } from "@/app/actions/insights";

interface TrendChartProps {
  data: DailyAggregate[];
  calorieGoal: number;
  isLoading?: boolean;
}

const chartColors = {
  calories: "#319795",
  goal: "#a1a1aa",
  grid: "#27272a",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface TooltipPayloadItem {
  value: number;
  dataKey: string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  calorieGoal: number;
}

function CustomTooltip({ active, payload, label, calorieGoal }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const calories = payload[0]?.value ?? 0;
  const goalPercent = Math.round((calories / calorieGoal) * 100);

  return (
    <Box
      bg="rgba(24, 24, 27, 0.95)"
      backdropFilter="blur(12px)"
      borderRadius="lg"
      p={3}
      borderWidth="1px"
      borderColor="border.default"
      boxShadow="0 4px 20px rgba(0, 0, 0, 0.3)"
    >
      <Text fontSize="xs" color="text.muted" mb={1}>
        {label}
      </Text>
      <Text fontSize="lg" fontWeight="bold" color="brand.500">
        {calories.toLocaleString()} kcal
      </Text>
      <Text fontSize="xs" color="text.muted">
        {goalPercent}% of goal
      </Text>
    </Box>
  );
}

export function TrendChart({ data, calorieGoal, isLoading }: TrendChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    dateFormatted: formatDate(d.date),
  }));

  const maxCalories = Math.max(...data.map((d) => d.calories), calorieGoal);
  const yAxisMax = Math.ceil(maxCalories / 500) * 500 + 500;

  return (
    <Box
      bg="background.panel"
      borderRadius="xl"
      p={{ base: 4, md: 6 }}
      borderWidth="1px"
      borderColor="border.default"
      backdropFilter="blur(12px)"
      boxShadow="0 4px 30px rgba(0, 0, 0, 0.1)"
    >
      <VStack align="stretch" gap={4}>
        <Text fontSize="lg" fontWeight="semibold" color="text.default">
          Calorie Trend
        </Text>
        <Box height={{ base: "250px", md: "300px" }} opacity={isLoading ? 0.5 : 1}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="calorieGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors.calories} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={chartColors.calories} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
              <XAxis
                dataKey="dateFormatted"
                stroke={chartColors.goal}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={chartColors.goal}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                domain={[0, yAxisMax]}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip content={<CustomTooltip calorieGoal={calorieGoal} />} />
              <ReferenceLine
                y={calorieGoal}
                stroke={chartColors.goal}
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: `Goal: ${calorieGoal}`,
                  position: "right",
                  fill: chartColors.goal,
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="calories"
                stroke={chartColors.calories}
                strokeWidth={3}
                fill="url(#calorieGradient)"
                dot={{ fill: chartColors.calories, strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: chartColors.calories }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </VStack>
    </Box>
  );
}
