'use client';

import {
    Box,
    VStack,
    HStack,
    Heading,
    Text,
    Button,
    Input,
    Grid,
    Tabs,
    Separator,
    Select,
    Portal,
    createListCollection,
} from "@chakra-ui/react";
import { Field } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { IoCalculator, IoCreate } from "react-icons/io5";
import {
    getUserGoals,
    updateUserGoals,
} from "@/app/actions/userGoals";
import { Toaster, toaster } from "@/components/ui/toaster";

/**
 * Activity multipliers based on Mifflin-St Jeor Equation
 */
const ACTIVITY_MULTIPLIERS = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
};

/**
 * Calculate BMR using Mifflin-St Jeor Equation
 */
export function calculateBMR(
    weight_kg: number,
    height_cm: number,
    age: number,
    sex: 'male' | 'female'
): number {
    // BMR = 10W + 6.25H - 5A + S
    // where S = 5 for men, -161 for women
    const sexOffset = sex === 'male' ? 5 : -161;
    return 10 * weight_kg + 6.25 * height_cm - 5 * age + sexOffset;
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 */
export function calculateTDEE(
    bmr: number,
    activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active'
): number {
    return bmr * ACTIVITY_MULTIPLIERS[activity_level];
}

/**
 * Calculate calorie goal based on weight goal
 */
export function calculateCalorieGoal(
    tdee: number,
    weight_goal: 'lose' | 'maintain' | 'gain'
): number {
    switch (weight_goal) {
        case 'lose':
            // 500 calorie deficit for ~1 lb/week weight loss
            return Math.round(tdee - 500);
        case 'gain':
            // 300-500 calorie surplus for weight gain
            return Math.round(tdee + 400);
        case 'maintain':
        default:
            return Math.round(tdee);
    }
}

/**
 * Calculate macronutrient goals based on calorie goal
 * Standard macro split: 30% protein, 40% carbs, 30% fat
 */
export function calculateMacros(calorieGoal: number): {
    protein: number;
    carbs: number;
    fat: number;
} {
    // Protein: 30% of calories, 4 calories per gram
    const proteinCalories = calorieGoal * 0.3;
    const protein = Math.round(proteinCalories / 4);
    
    // Carbs: 40% of calories, 4 calories per gram
    const carbCalories = calorieGoal * 0.4;
    const carbs = Math.round(carbCalories / 4);
    
    // Fat: 30% of calories, 9 calories per gram
    const fatCalories = calorieGoal * 0.3;
    const fat = Math.round(fatCalories / 9);
    
    return { protein, carbs, fat };
}


const MotionBox = motion.create(Box);

// Collections for Select components
const sexCollection = createListCollection({
    items: [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' },
    ],
});

const activityLevelCollection = createListCollection({
    items: [
        { label: 'Sedentary - Desk job, little to no exercise', value: 'sedentary' },
        { label: 'Lightly Active - Light exercise 1-3 days/week', value: 'lightly_active' },
        { label: 'Moderately Active - Moderate exercise 3-5 days/week', value: 'moderately_active' },
        { label: 'Very Active - Hard exercise 6-7 days/week', value: 'very_active' },
        { label: 'Extra Active - Very hard exercise/physical job', value: 'extra_active' },
    ],
});

const weightGoalCollection = createListCollection({
    items: [
        { label: 'Lose Weight (~0.5 kg/week)', value: 'lose' },
        { label: 'Maintain Weight', value: 'maintain' },
        { label: 'Gain Weight (~0.25-0.5 kg/week)', value: 'gain' },
    ],
});

interface GoalSettingsProps {
    onGoalsUpdated?: () => void;
}

export function GoalSettings({ onGoalsUpdated }: GoalSettingsProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'manual' | 'calculator'>('manual');

    // Manual input state
    const [manualCalories, setManualCalories] = useState('2000');
    const [manualProtein, setManualProtein] = useState('150');
    const [manualCarbs, setManualCarbs] = useState('250');
    const [manualFat, setManualFat] = useState('65');

    // Calculator input state
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [age, setAge] = useState('');
    const [sex, setSex] = useState<'male' | 'female'>('male');
    const [activityLevel, setActivityLevel] = useState<'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active'>('moderately_active');
    const [weightGoal, setWeightGoal] = useState<'lose' | 'maintain' | 'gain'>('maintain');

    // Calculated values
    const [calculatedBMR, setCalculatedBMR] = useState<number | null>(null);
    const [calculatedTDEE, setCalculatedTDEE] = useState<number | null>(null);
    const [calculatedCalories, setCalculatedCalories] = useState<number | null>(null);
    const [calculatedMacros, setCalculatedMacros] = useState<{
        protein: number;
        carbs: number;
        fat: number;
    } | null>(null);

    useEffect(() => {
        loadGoals();
    }, []);

    // Recalculate when calculator inputs change
    useEffect(() => {
        if (weight && height && age && sex && activityLevel && weightGoal) {
            const bmr = calculateBMR(parseFloat(weight), parseFloat(height), parseInt(age), sex);
            const tdee = calculateTDEE(bmr, activityLevel);
            const calorieGoal = calculateCalorieGoal(tdee, weightGoal);
            const macros = calculateMacros(calorieGoal);

            setCalculatedBMR(bmr);
            setCalculatedTDEE(tdee);
            setCalculatedCalories(calorieGoal);
            setCalculatedMacros(macros);
        } else {
            setCalculatedBMR(null);
            setCalculatedTDEE(null);
            setCalculatedCalories(null);
            setCalculatedMacros(null);
        }
    }, [weight, height, age, sex, activityLevel, weightGoal]);

    const loadGoals = async () => {
        setLoading(true);
        const response = await getUserGoals();
        if (response.success && response.data) {
            const goals = response.data;
            setManualCalories(goals.calorie_goal.toString());
            setManualProtein(goals.protein_goal.toString());
            setManualCarbs(goals.carb_goal.toString());
            setManualFat(goals.fat_goal.toString());

            // Load calculator values if they exist
            if (goals.weight_kg) setWeight(goals.weight_kg.toString());
            if (goals.height_cm) setHeight(goals.height_cm.toString());
            if (goals.age) setAge(goals.age.toString());
            if (goals.sex) setSex(goals.sex);
            if (goals.activity_level) setActivityLevel(goals.activity_level);
            if (goals.weight_goal) setWeightGoal(goals.weight_goal);
        }
        setLoading(false);
    };

    const handleSaveManual = async () => {
        setSaving(true);
        try {
            const response = await updateUserGoals({
                calorie_goal: parseInt(manualCalories),
                protein_goal: parseInt(manualProtein),
                carb_goal: parseInt(manualCarbs),
                fat_goal: parseInt(manualFat),
            });

            if (response.success) {
                toaster.create({
                    title: 'Goals updated!',
                    description: 'Your nutritional goals have been saved.',
                    type: 'success',
                    duration: 3000,
                });
                onGoalsUpdated?.();
            } else {
                throw new Error(response.error || 'Failed to update goals');
            }
        } catch (error: unknown) {
            toaster.create({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to update goals',
                type: 'error',
                duration: 5000,
            });
        } finally {
            setSaving(false);
        }
    };

    const handleSaveCalculated = async () => {
        if (!calculatedCalories || !calculatedMacros) {
            toaster.create({
                title: 'Incomplete information',
                description: 'Please fill in all fields to calculate your goals.',
                type: 'warning',
                duration: 3000,
            });
            return;
        }

        setSaving(true);
        try {
            const response = await updateUserGoals({
                calorie_goal: calculatedCalories,
                protein_goal: calculatedMacros.protein,
                carb_goal: calculatedMacros.carbs,
                fat_goal: calculatedMacros.fat,
                weight_kg: parseFloat(weight),
                height_cm: parseFloat(height),
                age: parseInt(age),
                sex,
                activity_level: activityLevel,
                weight_goal: weightGoal,
            });

            if (response.success) {
                // Update manual tab with calculated values
                setManualCalories(calculatedCalories.toString());
                setManualProtein(calculatedMacros.protein.toString());
                setManualCarbs(calculatedMacros.carbs.toString());
                setManualFat(calculatedMacros.fat.toString());

                toaster.create({
                    title: 'Goals calculated and saved!',
                    description: 'Your nutritional goals have been calculated and saved.',
                    type: 'success',
                    duration: 3000,
                });
                onGoalsUpdated?.();
            } else {
                throw new Error(response.error || 'Failed to update goals');
            }
        } catch (error: unknown) {
            toaster.create({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to update goals',
                type: 'error',
                duration: 5000,
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box
                bg="background.panel"
                borderRadius="xl"
                borderWidth="1px"
                borderColor="border.default"
                p={6}
                backdropFilter="blur(12px)"
                boxShadow="0 4px 30px rgba(0, 0, 0, 0.1)"
            >
                <Text color="text.muted">Loading goals...</Text>
            </Box>
        );
    }

    return (
        <>
            <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                bg="background.panel"
                borderRadius="xl"
                borderWidth="1px"
                borderColor="border.default"
                p={6}
                backdropFilter="blur(12px)"
                boxShadow="0 4px 30px rgba(0, 0, 0, 0.1)"
            >
                <VStack align="stretch" gap={6}>
                    <Heading size="lg" color="text.default">
                        Daily Goals
                    </Heading>

                    <Tabs.Root
                        value={activeTab}
                        onValueChange={(e) => setActiveTab(e.value as 'manual' | 'calculator')}
                        variant="enclosed"
                        colorPalette="brand"
                    >
                        <Tabs.List>
                            <Tabs.Trigger value="manual">
                                <HStack gap={2}>
                                    <IoCreate />
                                    <Text>Manual Input</Text>
                                </HStack>
                            </Tabs.Trigger>
                            <Tabs.Trigger value="calculator">
                                <HStack gap={2}>
                                    <IoCalculator />
                                    <Text>Calculate for Me</Text>
                                </HStack>
                            </Tabs.Trigger>
                        </Tabs.List>

                        {/* Manual Input Tab */}
                        <Tabs.Content value="manual">
                            <VStack align="stretch" gap={6} pt={6}>
                                <Box
                                    bg="background.subtle"
                                    borderRadius="lg"
                                    p={6}
                                    borderWidth="2px"
                                    borderColor="brand.500/30"
                                >
                                    <Field.Root>
                                        <Field.Label fontSize="sm" fontWeight="medium" color="text.default">
                                            Daily Calorie Goal
                                        </Field.Label>
                                        <Input
                                            type="number"
                                            value={manualCalories}
                                            onChange={(e) => setManualCalories(e.target.value)}
                                            size="lg"
                                            mt={2}
                                        />
                                        <Field.HelperText fontSize="xs" color="text.muted">
                                            Your target daily calorie intake
                                        </Field.HelperText>
                                    </Field.Root>
                                </Box>

                                <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
                                    <Box bg="background.subtle" borderRadius="lg" p={4}>
                                        <Field.Root>
                                            <Field.Label fontSize="sm" fontWeight="medium" color="text.default">
                                                Protein (g)
                                            </Field.Label>
                                            <Input
                                                type="number"
                                                value={manualProtein}
                                                onChange={(e) => setManualProtein(e.target.value)}
                                                mt={2}
                                            />
                                        </Field.Root>
                                    </Box>

                                    <Box bg="background.subtle" borderRadius="lg" p={4}>
                                        <Field.Root>
                                            <Field.Label fontSize="sm" fontWeight="medium" color="text.default">
                                                Carbs (g)
                                            </Field.Label>
                                            <Input
                                                type="number"
                                                value={manualCarbs}
                                                onChange={(e) => setManualCarbs(e.target.value)}
                                                mt={2}
                                            />
                                        </Field.Root>
                                    </Box>

                                    <Box bg="background.subtle" borderRadius="lg" p={4}>
                                        <Field.Root>
                                            <Field.Label fontSize="sm" fontWeight="medium" color="text.default">
                                                Fat (g)
                                            </Field.Label>
                                            <Input
                                                type="number"
                                                value={manualFat}
                                                onChange={(e) => setManualFat(e.target.value)}
                                                mt={2}
                                            />
                                        </Field.Root>
                                    </Box>
                                </Grid>

                                <Button
                                    colorPalette="brand"
                                    size="lg"
                                    w="full"
                                    onClick={handleSaveManual}
                                    loading={saving}
                                >
                                    Save Goals
                                </Button>
                            </VStack>
                        </Tabs.Content>

                        {/* Calculator Tab */}
                        <Tabs.Content value="calculator">
                            <VStack align="stretch" gap={6} pt={6}>
                                <Text fontSize="sm" color="text.muted">
                                    Enter your information to calculate your personalized daily calorie and macronutrient goals using the Mifflin-St Jeor Equation.
                                </Text>

                                <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
                                    <Box bg="background.subtle" borderRadius="lg" p={4}>
                                        <Field.Root>
                                            <Field.Label fontSize="sm" fontWeight="medium" color="text.default">
                                                Weight (kg)
                                            </Field.Label>
                                            <Input
                                                type="number"
                                                value={weight}
                                                onChange={(e) => setWeight(e.target.value)}
                                                placeholder="70"
                                                mt={2}
                                            />
                                        </Field.Root>
                                    </Box>

                                    <Box bg="background.subtle" borderRadius="lg" p={4}>
                                        <Field.Root>
                                            <Field.Label fontSize="sm" fontWeight="medium" color="text.default">
                                                Height (cm)
                                            </Field.Label>
                                            <Input
                                                type="number"
                                                value={height}
                                                onChange={(e) => setHeight(e.target.value)}
                                                placeholder="175"
                                                mt={2}
                                            />
                                        </Field.Root>
                                    </Box>

                                    <Box bg="background.subtle" borderRadius="lg" p={4}>
                                        <Field.Root>
                                            <Field.Label fontSize="sm" fontWeight="medium" color="text.default">
                                                Age
                                            </Field.Label>
                                            <Input
                                                type="number"
                                                value={age}
                                                onChange={(e) => setAge(e.target.value)}
                                                placeholder="30"
                                                mt={2}
                                            />
                                        </Field.Root>
                                    </Box>

                                    <Box bg="background.subtle" borderRadius="lg" p={4}>
                                        <Field.Root>
                                            <Field.Label fontSize="sm" fontWeight="medium" color="text.default">
                                                Sex
                                            </Field.Label>
                                            <Select.Root
                                                collection={sexCollection}
                                                value={[sex]}
                                                onValueChange={(e) => setSex(e.value[0] as 'male' | 'female')}
                                                mt={2}
                                            >
                                                <Select.HiddenSelect />
                                                <Select.Control>
                                                    <Select.Trigger>
                                                        <Select.ValueText placeholder="Select sex" />
                                                    </Select.Trigger>
                                                    <Select.IndicatorGroup>
                                                        <Select.Indicator />
                                                    </Select.IndicatorGroup>
                                                </Select.Control>
                                                <Portal>
                                                    <Select.Positioner>
                                                        <Select.Content>
                                                            {sexCollection.items.map((item) => (
                                                                <Select.Item item={item} key={item.value}>
                                                                    {item.label}
                                                                    <Select.ItemIndicator />
                                                                </Select.Item>
                                                            ))}
                                                        </Select.Content>
                                                    </Select.Positioner>
                                                </Portal>
                                            </Select.Root>
                                        </Field.Root>
                                    </Box>
                                </Grid>

                                <Box bg="background.subtle" borderRadius="lg" p={4}>
                                    <Field.Root>
                                        <Field.Label fontSize="sm" fontWeight="medium" color="text.default">
                                            Activity Level
                                        </Field.Label>
                                        <Select.Root
                                            collection={activityLevelCollection}
                                            value={[activityLevel]}
                                            onValueChange={(e) =>
                                                setActivityLevel(
                                                    e.value[0] as 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active'
                                                )
                                            }
                                            mt={2}
                                        >
                                            <Select.HiddenSelect />
                                            <Select.Control>
                                                <Select.Trigger>
                                                    <Select.ValueText placeholder="Select activity level" />
                                                </Select.Trigger>
                                                <Select.IndicatorGroup>
                                                    <Select.Indicator />
                                                </Select.IndicatorGroup>
                                            </Select.Control>
                                            <Portal>
                                                <Select.Positioner>
                                                    <Select.Content>
                                                        {activityLevelCollection.items.map((item) => (
                                                            <Select.Item item={item} key={item.value}>
                                                                {item.label}
                                                                <Select.ItemIndicator />
                                                            </Select.Item>
                                                        ))}
                                                    </Select.Content>
                                                </Select.Positioner>
                                            </Portal>
                                        </Select.Root>
                                    </Field.Root>
                                </Box>

                                <Box bg="background.subtle" borderRadius="lg" p={4}>
                                    <Field.Root>
                                        <Field.Label fontSize="sm" fontWeight="medium" color="text.default">
                                            Goal
                                        </Field.Label>
                                        <Select.Root
                                            collection={weightGoalCollection}
                                            value={[weightGoal]}
                                            onValueChange={(e) => setWeightGoal(e.value[0] as 'lose' | 'maintain' | 'gain')}
                                            mt={2}
                                        >
                                            <Select.HiddenSelect />
                                            <Select.Control>
                                                <Select.Trigger>
                                                    <Select.ValueText placeholder="Select goal" />
                                                </Select.Trigger>
                                                <Select.IndicatorGroup>
                                                    <Select.Indicator />
                                                </Select.IndicatorGroup>
                                            </Select.Control>
                                            <Portal>
                                                <Select.Positioner>
                                                    <Select.Content>
                                                        {weightGoalCollection.items.map((item) => (
                                                            <Select.Item item={item} key={item.value}>
                                                                {item.label}
                                                                <Select.ItemIndicator />
                                                            </Select.Item>
                                                        ))}
                                                    </Select.Content>
                                                </Select.Positioner>
                                            </Portal>
                                        </Select.Root>
                                    </Field.Root>
                                </Box>

                                {calculatedCalories && calculatedMacros && (
                                    <MotionBox
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.3 }}
                                        bg="brand.500/10"
                                        borderRadius="lg"
                                        p={6}
                                        borderWidth="2px"
                                        borderColor="brand.500"
                                    >
                                        <VStack align="stretch" gap={4}>
                                            <Heading size="md" color="brand.500">
                                                Your Calculated Goals
                                            </Heading>

                                            <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)" }} gap={3}>
                                                <Box>
                                                    <Text fontSize="xs" color="text.muted" textTransform="uppercase">
                                                        BMR (Basal Metabolic Rate)
                                                    </Text>
                                                    <Text fontSize="2xl" fontWeight="bold" color="text.default">
                                                        {Math.round(calculatedBMR!)} cal
                                                    </Text>
                                                </Box>

                                                <Box>
                                                    <Text fontSize="xs" color="text.muted" textTransform="uppercase">
                                                        TDEE (Maintenance)
                                                    </Text>
                                                    <Text fontSize="2xl" fontWeight="bold" color="text.default">
                                                        {Math.round(calculatedTDEE!)} cal
                                                    </Text>
                                                </Box>
                                            </Grid>

                                            <Separator />

                                            <Box textAlign="center">
                                                <Text fontSize="xs" color="text.muted" textTransform="uppercase" mb={2}>
                                                    Daily Calorie Goal
                                                </Text>
                                                <Text fontSize="4xl" fontWeight="bold" color="brand.500">
                                                    {calculatedCalories}
                                                </Text>
                                                <Text fontSize="sm" color="text.muted">
                                                    calories per day
                                                </Text>
                                            </Box>

                                            <Separator />

                                            <Grid templateColumns="repeat(3, 1fr)" gap={3}>
                                                <Box textAlign="center">
                                                    <Text fontSize="xs" color="text.muted" textTransform="uppercase">
                                                        Protein
                                                    </Text>
                                                    <Text fontSize="2xl" fontWeight="bold" color="blue.500">
                                                        {calculatedMacros.protein}g
                                                    </Text>
                                                </Box>

                                                <Box textAlign="center">
                                                    <Text fontSize="xs" color="text.muted" textTransform="uppercase">
                                                        Carbs
                                                    </Text>
                                                    <Text fontSize="2xl" fontWeight="bold" color="green.500">
                                                        {calculatedMacros.carbs}g
                                                    </Text>
                                                </Box>

                                                <Box textAlign="center">
                                                    <Text fontSize="xs" color="text.muted" textTransform="uppercase">
                                                        Fat
                                                    </Text>
                                                    <Text fontSize="2xl" fontWeight="bold" color="orange.500">
                                                        {calculatedMacros.fat}g
                                                    </Text>
                                                </Box>
                                            </Grid>
                                        </VStack>
                                    </MotionBox>
                                )}

                                <Button
                                    colorPalette="brand"
                                    size="lg"
                                    w="full"
                                    onClick={handleSaveCalculated}
                                    loading={saving}
                                    disabled={!calculatedCalories}
                                >
                                    Save Calculated Goals
                                </Button>
                            </VStack>
                        </Tabs.Content>
                    </Tabs.Root>
                </VStack>
            </MotionBox>
            <Toaster />
        </>
    );
}

