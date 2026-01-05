"use client";

import { HStack, IconButton, Text, Box } from "@chakra-ui/react";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { ViewMode } from "./ViewModeSelector";
import { formatLocalDate, getStartOfWeek } from "@/utils/dateHelpers";

interface DateRangePickerProps {
  viewMode: ViewMode;
  selectedWeekStart: string;
  selectedYear: number;
  selectedMonth: number;
  onWeekChange: (weekStart: string) => void;
  onMonthChange: (year: number, month: number) => void;
  isLoading?: boolean;
}

function formatWeekRange(weekStart: string): string {
  const [year, month, day] = weekStart.split("-").map(Number);
  const start = new Date(year, month - 1, day);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endStr = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startStr} - ${endStr}`;
}

function formatMonth(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function DateRangePicker({
  viewMode,
  selectedWeekStart,
  selectedYear,
  selectedMonth,
  onWeekChange,
  onMonthChange,
  isLoading,
}: DateRangePickerProps) {
  if (viewMode === "daily") {
    return null;
  }

  const handlePrevious = () => {
    if (viewMode === "weekly") {
      const [year, month, day] = selectedWeekStart.split("-").map(Number);
      const current = new Date(year, month - 1, day);
      current.setDate(current.getDate() - 7);
      onWeekChange(formatLocalDate(current));
    } else {
      let newMonth = selectedMonth - 1;
      let newYear = selectedYear;
      if (newMonth < 1) {
        newMonth = 12;
        newYear -= 1;
      }
      onMonthChange(newYear, newMonth);
    }
  };

  const handleNext = () => {
    if (viewMode === "weekly") {
      const [year, month, day] = selectedWeekStart.split("-").map(Number);
      const current = new Date(year, month - 1, day);
      current.setDate(current.getDate() + 7);
      const nextWeekStart = formatLocalDate(current);

      const today = new Date();
      const currentWeekStart = formatLocalDate(getStartOfWeek(today));
      if (nextWeekStart <= currentWeekStart) {
        onWeekChange(nextWeekStart);
      }
    } else {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      let newMonth = selectedMonth + 1;
      let newYear = selectedYear;
      if (newMonth > 12) {
        newMonth = 1;
        newYear += 1;
      }

      if (newYear < currentYear || (newYear === currentYear && newMonth <= currentMonth)) {
        onMonthChange(newYear, newMonth);
      }
    }
  };

  const isNextDisabled = () => {
    if (viewMode === "weekly") {
      const [year, month, day] = selectedWeekStart.split("-").map(Number);
      const current = new Date(year, month - 1, day);
      current.setDate(current.getDate() + 7);
      const nextWeekStart = formatLocalDate(current);

      const today = new Date();
      const currentWeekStart = formatLocalDate(getStartOfWeek(today));
      return nextWeekStart > currentWeekStart;
    } else {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      return selectedYear === currentYear && selectedMonth === currentMonth;
    }
  };

  const displayText =
    viewMode === "weekly" ? formatWeekRange(selectedWeekStart) : formatMonth(selectedYear, selectedMonth);

  return (
    <Box bg="background.panel" borderRadius="full" px={2} py={1} borderWidth="1px" borderColor="border.default">
      <HStack gap={1}>
        <IconButton
          aria-label="Previous"
          variant="ghost"
          size="sm"
          borderRadius="full"
          onClick={handlePrevious}
          disabled={isLoading}
          colorPalette="brand"
        >
          <IoChevronBack />
        </IconButton>
        <Text
          fontSize="sm"
          fontWeight="medium"
          color="text.default"
          minW={{ base: "140px", md: "180px" }}
          textAlign="center"
        >
          {displayText}
        </Text>
        <IconButton
          aria-label="Next"
          variant="ghost"
          size="sm"
          borderRadius="full"
          onClick={handleNext}
          disabled={isLoading || isNextDisabled()}
          colorPalette="brand"
        >
          <IoChevronForward />
        </IconButton>
      </HStack>
    </Box>
  );
}
