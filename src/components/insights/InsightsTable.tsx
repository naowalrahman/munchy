"use client";

import { useState, useMemo } from "react";
import { Box, Text, VStack, HStack, Table, IconButton } from "@chakra-ui/react";
import { IoChevronUp, IoChevronDown } from "react-icons/io5";
import { DailyAggregate } from "@/app/actions/insights";

interface InsightsTableProps {
  data: DailyAggregate[];
  calorieGoal: number;
  isLoading?: boolean;
}

type SortKey = "date" | "calories" | "protein" | "carbohydrates" | "fat" | "goalPercent";
type SortDirection = "asc" | "desc";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const headerColumns: { key: SortKey; label: string; align?: "left" | "right" }[] = [
  { key: "date", label: "Date", align: "left" },
  { key: "calories", label: "Calories", align: "right" },
  { key: "protein", label: "Protein", align: "right" },
  { key: "carbohydrates", label: "Carbs", align: "right" },
  { key: "fat", label: "Fat", align: "right" },
  { key: "goalPercent", label: "Goal %", align: "right" },
];

export function InsightsTable({ data, calorieGoal, isLoading }: InsightsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filteredData = useMemo(() => data.filter((d) => d.entryCount > 0), [data]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      if (sortKey === "date") {
        aVal = new Date(a.date).getTime();
        bVal = new Date(b.date).getTime();
      } else if (sortKey === "goalPercent") {
        aVal = (a.calories / calorieGoal) * 100;
        bVal = (b.calories / calorieGoal) * 100;
      } else {
        aVal = a[sortKey];
        bVal = b[sortKey];
      }

      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [filteredData, sortKey, sortDirection, calorieGoal]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("desc");
    }
  };

  if (filteredData.length === 0) {
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
        <Text color="text.muted" textAlign="center" py={8}>
          No data to display
        </Text>
      </Box>
    );
  }

  return (
    <Box
      bg="background.panel"
      borderRadius="xl"
      p={{ base: 4, md: 6 }}
      borderWidth="1px"
      borderColor="border.default"
      backdropFilter="blur(12px)"
      boxShadow="0 4px 30px rgba(0, 0, 0, 0.1)"
      opacity={isLoading ? 0.5 : 1}
    >
      <VStack align="stretch" gap={4}>
        <Text fontSize="lg" fontWeight="semibold" color="text.default">
          Daily Breakdown
        </Text>
        <Box overflowX="auto">
          <Table.Root size="sm" variant="outline">
            <Table.Header>
              <Table.Row bg="background.subtle">
                {headerColumns.map((col) => (
                  <Table.ColumnHeader key={col.key} textAlign={col.align}>
                    <IconButton
                      aria-label={`Sort by ${col.key}`}
                      variant="ghost"
                      size="xs"
                      onClick={() => handleSort(col.key)}
                      colorPalette={sortKey === col.key ? "brand" : "gray"}
                      px={0}
                      minW="auto"
                    >
                      <HStack gap={1}>
                        <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider">
                          {col.label}
                        </Text>
                        {sortKey === col.key && (sortDirection === "asc" ? <IoChevronUp /> : <IoChevronDown />)}
                      </HStack>
                    </IconButton>
                  </Table.ColumnHeader>
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {sortedData.map((row) => {
                const goalPercent = Math.round((row.calories / calorieGoal) * 100);
                const isWithinGoal = goalPercent >= 90 && goalPercent <= 110;
                return (
                  <Table.Row key={row.date} _hover={{ bg: "background.subtle" }} transition="background 0.2s">
                    <Table.Cell>
                      <Text fontSize="sm" color="text.default">
                        {formatDate(row.date)}
                      </Text>
                    </Table.Cell>
                    <Table.Cell textAlign="right">
                      <Text fontSize="sm" color="brand.500" fontWeight="medium">
                        {Math.round(row.calories).toLocaleString()}
                      </Text>
                    </Table.Cell>
                    <Table.Cell textAlign="right">
                      <Text fontSize="sm" color="blue.400">
                        {Math.round(row.protein)}g
                      </Text>
                    </Table.Cell>
                    <Table.Cell textAlign="right">
                      <Text fontSize="sm" color="green.400">
                        {Math.round(row.carbohydrates)}g
                      </Text>
                    </Table.Cell>
                    <Table.Cell textAlign="right">
                      <Text fontSize="sm" color="orange.400">
                        {Math.round(row.fat)}g
                      </Text>
                    </Table.Cell>
                    <Table.Cell textAlign="right">
                      <Text fontSize="sm" fontWeight="medium" color={isWithinGoal ? "green.400" : "text.muted"}>
                        {goalPercent}%
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        </Box>
      </VStack>
    </Box>
  );
}
