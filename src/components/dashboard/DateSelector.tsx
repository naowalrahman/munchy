"use client";

import { HStack, IconButton, Text, Box } from "@chakra-ui/react";
import { IoChevronBack, IoChevronForward, IoCalendar } from "react-icons/io5";
import { motion } from "framer-motion";
import { useState } from "react";
import { DateCalendarDialog } from "./DateCalendarDialog";
import { parseLocalDate, formatLocalDate } from "@/utils/dateHelpers";

interface DateSelectorProps {
  currentDate: string;
  onDateChange: (date: string) => void;
}

const MotionBox = motion.create(Box);

export function DateSelector({ currentDate, onDateChange }: DateSelectorProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Parse the current date in local timezone
  const date = parseLocalDate(currentDate);

  // Get today's date at midnight in local timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isToday = date.getTime() === today.getTime();

  const handlePreviousDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(formatLocalDate(newDate));
  };

  const handleNextDay = () => {
    if (isToday) return;
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    onDateChange(formatLocalDate(newDate));
  };

  const handleToday = () => {
    const newDate = new Date(today);
    newDate.setHours(0, 0, 0, 0);
    onDateChange(formatLocalDate(newDate));
  };

  return (
    <HStack gap={{ base: 2, md: 3 }} justify="center" flexWrap="wrap">
      <IconButton aria-label="Previous day" onClick={handlePreviousDay} variant="ghost" colorPalette="brand" size="sm">
        <IoChevronBack />
      </IconButton>

      <MotionBox
        key={currentDate}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <HStack gap={2} align="center">
          <Box textAlign="center" minW={{ base: "auto", md: "200px" }}>
            {isToday ? (
              <Text fontSize={{ base: "md", md: "lg" }} fontWeight="bold" color="brand.500">
                Today
              </Text>
            ) : (
              <Text fontSize={{ base: "md", md: "lg" }} fontWeight="semibold" color="text.default">
                {date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            )}
            <Text fontSize="xs" color="text.muted">
              {date.toLocaleDateString("en-US", { weekday: "long" })}
            </Text>
          </Box>
          <IconButton
            aria-label="Open calendar"
            onClick={() => setIsCalendarOpen(true)}
            variant="ghost"
            colorPalette="brand"
            size="sm"
          >
            <IoCalendar />
          </IconButton>
        </HStack>
      </MotionBox>

      <IconButton
        aria-label="Next day"
        onClick={handleNextDay}
        variant="ghost"
        colorPalette="brand"
        size="sm"
        disabled={isToday}
        opacity={isToday ? 0.3 : 1}
      >
        <IoChevronForward />
      </IconButton>

      <MotionBox initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
        <Text
          fontSize="sm"
          color="brand.500"
          cursor="pointer"
          onClick={handleToday}
          _hover={{ textDecoration: "underline" }}
          opacity={isToday ? 0.3 : 1}
          ml={2}
        >
          Jump to today
        </Text>
      </MotionBox>

      <DateCalendarDialog
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        currentDate={currentDate}
        onDateChange={onDateChange}
      />
    </HStack>
  );
}
