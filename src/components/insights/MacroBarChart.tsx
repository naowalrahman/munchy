"use client";

import { Box, Text, VStack } from "@chakra-ui/react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { DailyAggregate } from "@/app/actions/insights";

interface MacroBarChartProps {
  data: DailyAggregate[];
  isLoading?: boolean;
}

const chartColors = {
  protein: "#3182ce",
  carbs: "#38a169",
  fat: "#dd6b20",
  grid: "#27272a",
  text: "#a1a1aa",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface TooltipPayloadItem {
  value: number;
  dataKey: string;
  color: string;
  name: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

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
      <Text fontSize="xs" color="text.muted" mb={2}>
        {label}
      </Text>
      {payload.map((item) => (
        <Text key={item.dataKey} fontSize="sm" color={item.color} fontWeight="medium">
          {item.name}: {Math.round(item.value)}g
        </Text>
      ))}
    </Box>
  );
}

export function MacroBarChart({ data, isLoading }: MacroBarChartProps) {
  const chartData = data
    .filter((d) => d.entryCount > 0)
    .slice(-7)
    .map((d) => ({
      ...d,
      dateFormatted: formatDate(d.date),
    }));

  return (
    <Box
      bg="background.panel"
      borderRadius="xl"
      p={{ base: 4, md: 6 }}
      borderWidth="1px"
      borderColor="border.default"
      backdropFilter="blur(12px)"
      boxShadow="0 4px 30px rgba(0, 0, 0, 0.1)"
      height="100%"
    >
      <VStack align="stretch" gap={4} height="100%">
        <Text fontSize="lg" fontWeight="semibold" color="text.default">
          Daily Macros
        </Text>
        <Box flex="1" minHeight={{ base: "200px", md: "250px" }} opacity={isLoading ? 0.5 : 1}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
              <XAxis
                dataKey="dateFormatted"
                stroke={chartColors.text}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke={chartColors.text} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px", color: chartColors.text }}
                formatter={(value) => <span style={{ color: chartColors.text }}>{value}</span>}
              />
              <Bar dataKey="protein" name="Protein" fill={chartColors.protein} radius={[4, 4, 0, 0]} />
              <Bar dataKey="carbohydrates" name="Carbs" fill={chartColors.carbs} radius={[4, 4, 0, 0]} />
              <Bar dataKey="fat" name="Fat" fill={chartColors.fat} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </VStack>
    </Box>
  );
}
