'use client';

import {
    Box,
    VStack,
    HStack,
    Text,
    Button,
    Heading,
    SimpleGrid,
} from "@chakra-ui/react";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoClose, IoChevronBack, IoChevronForward } from "react-icons/io5";

interface DateCalendarDialogProps {
    isOpen: boolean;
    onClose: () => void;
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

// Get first day of month (0 = Sunday, 1 = Monday, etc.)
const getFirstDayOfMonth = (date: Date): number => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    return firstDay.getDay();
};

// Get number of days in month
const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

// Get days in previous month
const getDaysInPreviousMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 0).getDate();
};

export function DateCalendarDialog({
    isOpen,
    onClose,
    currentDate,
    onDateChange,
}: DateCalendarDialogProps) {
    const selectedDate = parseLocalDate(currentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // State for the month being viewed in the calendar
    const [viewMonth, setViewMonth] = useState(() => {
        const date = parseLocalDate(currentDate);
        return new Date(date.getFullYear(), date.getMonth(), 1);
    });

    // Generate calendar grid
    const calendarDays = useMemo(() => {
        const firstDay = getFirstDayOfMonth(viewMonth);
        const daysInMonth = getDaysInMonth(viewMonth);
        const daysInPrevMonth = getDaysInPreviousMonth(viewMonth);
        
        const days: Array<{ date: Date; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean; isFuture: boolean }> = [];

        // Previous month's trailing days
        for (let i = firstDay - 1; i >= 0; i--) {
            const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, daysInPrevMonth - i);
            days.push({
                date,
                isCurrentMonth: false,
                isToday: date.getTime() === today.getTime(),
                isSelected: formatLocalDate(date) === currentDate,
                isFuture: date > today,
            });
        }

        // Current month's days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
            days.push({
                date,
                isCurrentMonth: true,
                isToday: date.getTime() === today.getTime(),
                isSelected: formatLocalDate(date) === currentDate,
                isFuture: date > today,
            });
        }

        // Next month's leading days to complete the grid (6 rows = 42 days)
        const remainingDays = 42 - days.length;
        for (let day = 1; day <= remainingDays; day++) {
            const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, day);
            days.push({
                date,
                isCurrentMonth: false,
                isToday: date.getTime() === today.getTime(),
                isSelected: formatLocalDate(date) === currentDate,
                isFuture: date > today,
            });
        }

        return days;
    }, [viewMonth, currentDate, today]);

    const monthYearLabel = viewMonth.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
    });

    const handlePreviousMonth = () => {
        setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        const nextMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
        // Don't allow navigating to future months
        const maxMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        if (nextMonth < maxMonth) {
            setViewMonth(nextMonth);
        }
    };

    const handleDateClick = (date: Date) => {
        if (date > today) return; // Don't allow selecting future dates
        onDateChange(formatLocalDate(date));
        onClose();
    };

    const handleToday = () => {
        onDateChange(formatLocalDate(today));
        setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
        onClose();
    };

    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <AnimatePresence>
                {isOpen && (
                    <MotionBox
                        position="fixed"
                        top={0}
                        left={0}
                        right={0}
                        bottom={0}
                        bg="blackAlpha.700"
                        zIndex={999}
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    />
                )}
            </AnimatePresence>

            {/* Dialog */}
            <AnimatePresence>
                {isOpen && (
                    <MotionBox
                        position="fixed"
                        top="50%"
                        left="50%"
                        w={{ base: "90vw", md: "400px" }}
                        bg="background.canvas"
                        borderRadius="xl"
                        borderWidth="1px"
                        borderColor="border.default"
                        boxShadow="2xl"
                        zIndex={1000}
                        p={6}
                        initial={{ x: "-50%", y: "-50%", opacity: 0, scale: 0.95 }}
                        animate={{ x: "-50%", y: "-50%", opacity: 1, scale: 1 }}
                        exit={{ x: "-50%", y: "-50%", opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <VStack align="stretch" gap={4}>
                            {/* Header */}
                            <HStack justify="space-between" align="center">
                                <Heading size="lg" color="text.default">
                                    Select Date
                                </Heading>
                                <Button
                                    onClick={onClose}
                                    variant="ghost"
                                    size="sm"
                                    colorPalette="gray"
                                    type="button"
                                >
                                    <IoClose size={24} />
                                </Button>
                            </HStack>

                            {/* Month/Year Navigation */}
                            <HStack justify="space-between" align="center">
                                <Button
                                    onClick={handlePreviousMonth}
                                    variant="ghost"
                                    size="sm"
                                    colorPalette="brand"
                                    aria-label="Previous month"
                                >
                                    <IoChevronBack />
                                </Button>
                                <Text fontSize="lg" fontWeight="semibold" color="text.default" minW="200px" textAlign="center">
                                    {monthYearLabel}
                                </Text>
                                <Button
                                    onClick={handleNextMonth}
                                    variant="ghost"
                                    size="sm"
                                    colorPalette="brand"
                                    aria-label="Next month"
                                    disabled={(() => {
                                        const nextMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
                                        const maxMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                                        return nextMonth >= maxMonth;
                                    })()}
                                    opacity={(() => {
                                        const nextMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
                                        const maxMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                                        return nextMonth >= maxMonth ? 0.3 : 1;
                                    })()}
                                >
                                    <IoChevronForward />
                                </Button>
                            </HStack>

                            {/* Week Days Header */}
                            <SimpleGrid columns={7} gap={1}>
                                {weekDays.map((day, index) => (
                                    <Box key={index} textAlign="center" py={2}>
                                        <Text fontSize="xs" fontWeight="bold" color="text.muted">
                                            {day}
                                        </Text>
                                    </Box>
                                ))}
                            </SimpleGrid>

                            {/* Calendar Grid */}
                            <SimpleGrid columns={7} gap={1}>
                                {calendarDays.map((dayData, index) => {
                                    const isDisabled = dayData.isFuture;
                                    const isToday = dayData.isToday;
                                    const isSelected = dayData.isSelected;
                                    const isCurrentMonth = dayData.isCurrentMonth;

                                    return (
                                        <MotionBox
                                            key={index}
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ duration: 0.1, delay: index * 0.01 }}
                                        >
                                            <Button
                                                onClick={() => handleDateClick(dayData.date)}
                                                variant="ghost"
                                                size="sm"
                                                w="full"
                                                h="40px"
                                                p={0}
                                                disabled={isDisabled}
                                                bg={
                                                    isSelected
                                                        ? "brand.500"
                                                        : "transparent"
                                                }
                                                color={
                                                    isSelected
                                                        ? "white"
                                                        : isToday
                                                        ? "brand.500"
                                                        : isCurrentMonth
                                                        ? "text.default"
                                                        : "text.muted"
                                                }
                                                borderWidth={isToday && !isSelected ? "2px" : "0px"}
                                                borderColor={isToday && !isSelected ? "brand.500" : "transparent"}
                                                opacity={isDisabled ? 0.3 : 1}
                                                _hover={
                                                    !isDisabled
                                                        ? {
                                                              bg: isSelected ? "brand.600" : "background.subtle",
                                                              transform: "scale(1.1)",
                                                          }
                                                        : {}
                                                }
                                                _disabled={{
                                                    cursor: "not-allowed",
                                                }}
                                                transition="all 0.2s"
                                                borderRadius="md"
                                                fontWeight={isToday || isSelected ? "bold" : "normal"}
                                            >
                                                {dayData.date.getDate()}
                                            </Button>
                                        </MotionBox>
                                    );
                                })}
                            </SimpleGrid>

                            {/* Today Button */}
                            <HStack justify="center" pt={2}>
                                <Button
                                    onClick={handleToday}
                                    variant="outline"
                                    colorPalette="brand"
                                    size="sm"
                                >
                                    Jump to Today
                                </Button>
                            </HStack>
                        </VStack>
                    </MotionBox>
                )}
            </AnimatePresence>
        </>
    );
}

