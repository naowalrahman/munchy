'use client';

import { HStack, IconButton, Text, Box } from "@chakra-ui/react";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";
import { motion } from "framer-motion";

interface DateSelectorProps {
    currentDate: string;
    onDateChange: (date: string) => void;
}

const MotionBox = motion.create(Box);

export function DateSelector({ currentDate, onDateChange }: DateSelectorProps) {
    const date = new Date(currentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    const isToday = date.getTime() === today.getTime();
    const isFuture = date.getTime() > today.getTime();

    const handlePreviousDay = () => {
        const newDate = new Date(date);
        newDate.setDate(newDate.getDate() - 1);
        onDateChange(newDate.toISOString().split('T')[0]);
    };

    const handleNextDay = () => {
        if (isFuture) return;
        const newDate = new Date(date);
        newDate.setDate(newDate.getDate() + 1);
        onDateChange(newDate.toISOString().split('T')[0]);
    };

    const handleToday = () => {
        onDateChange(new Date().toISOString().split('T')[0]);
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
                disabled={isFuture}
                opacity={isFuture ? 0.3 : 1}
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

