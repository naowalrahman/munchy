'use client';

import { HStack, IconButton, Text, Box } from "@chakra-ui/react";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { motion } from "framer-motion";

interface DateSelectorProps {
    currentDate: string;
    onDateChange: (date: string) => void;
}

const MotionBox = motion.create(Box);

// Helper function to parse YYYY-MM-DD string as local date
const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

// Helper function to format date as YYYY-MM-DD in local timezone
const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export function DateSelector({ currentDate, onDateChange }: DateSelectorProps) {
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
        <HStack gap={3} justify="center">
            <IconButton
                aria-label="Previous day"
                onClick={handlePreviousDay}
                variant="ghost"
                colorPalette="brand"
                size="sm"
            >
                <IoChevronBack />
            </IconButton>

            <MotionBox
                key={currentDate}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
            >
                <Box textAlign="center" minW="200px">
                    {isToday ? (
                        <Text fontSize="lg" fontWeight="bold" color="brand.500">
                            Today
                        </Text>
                    ) : (
                        <Text fontSize="lg" fontWeight="semibold" color="text.default">
                            {date.toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </Text>
                    )}
                    <Text fontSize="xs" color="text.muted">
                        {date.toLocaleDateString('en-US', { weekday: 'long' })}
                    </Text>
                </Box>
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

            {!isToday && (
                <MotionBox
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                >
                    <Text
                        fontSize="sm"
                        color="brand.500"
                        cursor="pointer"
                        onClick={handleToday}
                        _hover={{ textDecoration: "underline" }}
                        ml={2}
                    >
                        Jump to today
                    </Text>
                </MotionBox>
            )}
        </HStack>
    );
}

