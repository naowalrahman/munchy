"use client";

import { Box, Text, VStack, HStack } from "@chakra-ui/react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export interface MacroPieChartProps {
  protein: number;
  carbs: number;
  fat: number;
  isLoading?: boolean;
}

const chartColors = {
  protein: "#3182ce",
  carbs: "#38a169",
  fat: "#dd6b20",
};

interface TooltipPayloadItem {
  value: number;
  name: string;
  payload: { fill: string };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0];
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
      <Text fontSize="sm" color={item.payload.fill} fontWeight="medium">
        {item.name}: {Math.round(item.value)}g
      </Text>
    </Box>
  );
}

export function MacroPieChart({ protein, carbs, fat, isLoading }: MacroPieChartProps) {
  const total = protein + carbs + fat;
  const data = [
    { name: "Protein", value: protein, color: chartColors.protein },
    { name: "Carbs", value: carbs, color: chartColors.carbs },
    { name: "Fat", value: fat, color: chartColors.fat },
  ];

  const percentages = {
    protein: total > 0 ? Math.round((protein / total) * 100) : 0,
    carbs: total > 0 ? Math.round((carbs / total) * 100) : 0,
    fat: total > 0 ? Math.round((fat / total) * 100) : 0,
  };

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
          Macro Distribution
        </Text>
        <Box flex="1" minHeight={{ base: "180px", md: "200px" }} width="100%" opacity={isLoading ? 0.5 : 1}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius="55%" outerRadius="80%" paddingAngle={2} dataKey="value">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </Box>
        <VStack gap={2}>
          {data.map((item) => (
            <HStack key={item.name} justify="space-between" w="full">
              <HStack gap={2}>
                <Box w={3} h={3} borderRadius="sm" bg={item.color} />
                <Text fontSize="sm" color="text.muted">
                  {item.name}
                </Text>
              </HStack>
              <Text fontSize="sm" fontWeight="medium" color="text.default">
                {Math.round(item.value)}g ({percentages[item.name.toLowerCase() as keyof typeof percentages]}%)
              </Text>
            </HStack>
          ))}
        </VStack>
      </VStack>
    </Box>
  );
}
