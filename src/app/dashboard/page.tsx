'use client';

import { createClient } from "@/utils/supabase/client";
import { Box, Container, Heading, Button, VStack, HStack, Text, Grid } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { signOut } from "./actions";
import { useEffect, useState } from "react";
import { FoodLogEntry, getMealSummary } from "@/app/actions/foodLog";
import { MealSection } from "@/components/dashboard/MealSection";
import { DailySummary } from "@/components/dashboard/DailySummary";
import { CustomMealDialog } from "@/components/dashboard/CustomMealDialog";
import { DateSelector } from "@/components/dashboard/DateSelector";
import { DailySummarySkeleton, MealSectionSkeleton } from "@/components/dashboard/LoadingSkeleton";
import { motion } from "framer-motion";
import { IoAdd } from "react-icons/io5";

const MotionBox = motion.create(Box);

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [mealData, setMealData] = useState<Record<string, FoodLogEntry[]>>({});
    const [allEntries, setAllEntries] = useState<FoodLogEntry[]>([]);
    const [isCustomMealDialogOpen, setIsCustomMealDialogOpen] = useState(false);
    const [customMeals, setCustomMeals] = useState<string[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const checkUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                router.push("/login");
                return;
            }
            
            setUser(user);
            setLoading(false);
        };

        checkUser();
    }, [router]);

    const loadFoodLogs = async () => {
        setIsLoadingData(true);
        const response = await getMealSummary(selectedDate);
        
        if (response.success && response.data) {
            setMealData(response.data);
            
            // Flatten all entries for the summary
            const entries = Object.values(response.data).flat();
            setAllEntries(entries);
            
            // Extract custom meals (non-standard meal names)
            const standardMeals = ['Breakfast', 'Lunch', 'Dinner'];
            const customMealNames = Object.keys(response.data).filter(
                name => !standardMeals.includes(name)
            );
            setCustomMeals(customMealNames);
        }
        setIsLoadingData(false);
    };

    useEffect(() => {
        if (user) {
            loadFoodLogs();
        }
    }, [user, selectedDate]);

    const handleAddCustomMeal = (mealName: string) => {
        if (!customMeals.includes(mealName)) {
            setCustomMeals([...customMeals, mealName]);
        }
    };

    if (loading) {
        return (
            <Box minH="100vh" bg="background.canvas" display="flex" alignItems="center" justifyContent="center">
                <Text color="text.default">Loading...</Text>
            </Box>
        );
    }

    const standardMeals = ['Breakfast', 'Lunch', 'Dinner'];

    return (
        <Box minH="100vh" bg="background.canvas" py={8}>
            <Container maxW="7xl">
                <VStack align="stretch" gap={8}>
                    {/* Header */}
                    <MotionBox
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <HStack justify="space-between" align="center" flexWrap="wrap" gap={4}>
                            <VStack align="start" gap={2}>
                                <Heading size="2xl" color="text.default">
                                    Food Diary
                                </Heading>
                                <DateSelector 
                                    currentDate={selectedDate}
                                    onDateChange={setSelectedDate}
                                />
                            </VStack>
                            <form action={signOut}>
                                <Button type="submit" colorPalette="red" variant="outline">
                                    Sign Out
                                </Button>
                            </form>
                        </HStack>
                    </MotionBox>

                    {/* Daily Summary */}
                    <MotionBox
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                    >
                        {isLoadingData && loading ? (
                            <DailySummarySkeleton />
                        ) : (
                            <DailySummary entries={allEntries} />
                        )}
                    </MotionBox>

                    {/* Meal Sections */}
                    <VStack align="stretch" gap={6}>
                        {/* Standard Meals */}
                        {isLoadingData && loading ? (
                            <>
                                <MealSectionSkeleton />
                                <MealSectionSkeleton />
                                <MealSectionSkeleton />
                            </>
                        ) : (
                            standardMeals.map((mealName, index) => (
                                <MotionBox
                                    key={mealName}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                                >
                                    <MealSection
                                        mealName={mealName}
                                        entries={mealData[mealName] || []}
                                        onFoodAdded={loadFoodLogs}
                                    />
                                </MotionBox>
                            ))
                        )}

                        {/* Custom Meals */}
                        {customMeals.map((mealName, index) => (
                            <MotionBox
                                key={mealName}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                            >
                                <MealSection
                                    mealName={mealName}
                                    entries={mealData[mealName] || []}
                                    onFoodAdded={loadFoodLogs}
                                />
                            </MotionBox>
                        ))}

                        {/* Add Custom Meal Button */}
                        <MotionBox
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.6 }}
                        >
                            <Button
                                variant="outline"
                                colorPalette="brand"
                                size="lg"
                                w="full"
                                onClick={() => setIsCustomMealDialogOpen(true)}
                            >
                                <IoAdd />
                                Add Custom Meal
                            </Button>
                        </MotionBox>
                    </VStack>
                </VStack>
            </Container>

            {/* Custom Meal Dialog */}
            <CustomMealDialog
                isOpen={isCustomMealDialogOpen}
                onClose={() => setIsCustomMealDialogOpen(false)}
                onAddMeal={handleAddCustomMeal}
            />
        </Box>
    );
}
