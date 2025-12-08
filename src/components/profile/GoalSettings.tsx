"use client";

import { Box, HStack, Heading, Tabs, Text, VStack } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { IoCalculator, IoCreate } from "react-icons/io5";

import { getUserGoals, updateUserGoals } from "@/app/actions/userGoals";
import { Toaster, toaster } from "@/components/ui/toaster";
import { CalculatorTab } from "./goal-settings/CalculatorTab";
import { ManualTab } from "./goal-settings/ManualTab";
import { calculateBMR, calculateCalorieGoal, calculateMacros, calculateTDEE } from "./goal-settings/calculations";
import { ActivityLevel, CalculatorTabProps, HeightUnit, MacroBreakdown, MetricInputs, ManualTabProps, Sex, WeightGoal, WeightUnit } from "./goal-settings/types";

interface GoalSettingsProps {
  onGoalsUpdated?: () => void;
}

const MotionBox = motion.create(Box);

export function GoalSettings({ onGoalsUpdated }: GoalSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"manual" | "calculator">("manual");

  // Manual input state
  const [manualCalories, setManualCalories] = useState("2000");
  const [manualProtein, setManualProtein] = useState("150");
  const [manualCarbs, setManualCarbs] = useState("250");
  const [manualFat, setManualFat] = useState("65");

  // Calculator input state
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [weightLbs, setWeightLbs] = useState("");
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("cm");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex>("male");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderately_active");
  const [weightGoal, setWeightGoal] = useState<WeightGoal>("maintain");

  // Calculated values
  const [calculatedBMR, setCalculatedBMR] = useState<number | null>(null);
  const [calculatedTDEE, setCalculatedTDEE] = useState<number | null>(null);
  const [calculatedCalories, setCalculatedCalories] = useState<number | null>(null);
  const [calculatedMacros, setCalculatedMacros] = useState<MacroBreakdown | null>(null);

  const getMetricInputs = (): MetricInputs | null => {
    const ageNumber = parseInt(age);
    const weightKg = weightUnit === "kg" ? parseFloat(weight) : parseFloat(weightLbs) / 2.20462;

    let heightCmValue = NaN;
    if (heightUnit === "cm") {
      heightCmValue = parseFloat(height);
    } else {
      const feetVal = heightFeet === "" ? NaN : parseFloat(heightFeet);
      const inchesVal = heightInches === "" ? 0 : parseFloat(heightInches);
      if (Number.isFinite(feetVal) && Number.isFinite(inchesVal)) {
        heightCmValue = (feetVal * 12 + inchesVal) * 2.54;
      }
    }

    if (!Number.isFinite(weightKg) || !Number.isFinite(heightCmValue) || !Number.isFinite(ageNumber)) {
      return null;
    }

    if (weightKg <= 0 || heightCmValue <= 0 || ageNumber <= 0) {
      return null;
    }

    return {
      weightKg,
      heightCm: heightCmValue,
      age: ageNumber,
    };
  };

  useEffect(() => {
    loadGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recalculate when calculator inputs change
  useEffect(() => {
    const metricInputs = getMetricInputs();

    if (metricInputs && sex && activityLevel && weightGoal) {
      const { weightKg, heightCm, age: ageNumber } = metricInputs;
      const bmr = calculateBMR(weightKg, heightCm, ageNumber, sex);
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
  }, [weight, weightLbs, weightUnit, height, heightFeet, heightInches, heightUnit, age, sex, activityLevel, weightGoal]);

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
      if (goals.weight_kg) setWeightLbs((goals.weight_kg * 2.20462).toFixed(1));
      if (goals.height_cm) {
        setHeight(goals.height_cm.toString());
        const totalInches = goals.height_cm / 2.54;
        const feet = Math.floor(totalInches / 12);
        let inches = Math.round(totalInches - feet * 12);
        let finalFeet = feet;

        if (inches === 12) {
          finalFeet += 1;
          inches = 0;
        }

        setHeightFeet(finalFeet.toString());
        setHeightInches(inches.toString());
      }
      if (goals.age) setAge(goals.age.toString());
      if (goals.sex) setSex(goals.sex as Sex);
      if (goals.activity_level) setActivityLevel(goals.activity_level as ActivityLevel);
      if (goals.weight_goal) setWeightGoal(goals.weight_goal as WeightGoal);
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
          title: "Goals updated!",
          description: "Your nutritional goals have been saved.",
          type: "success",
          duration: 3000,
        });
        onGoalsUpdated?.();
      } else {
        throw new Error(response.error || "Failed to update goals");
      }
    } catch (error: unknown) {
      toaster.create({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update goals",
        type: "error",
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCalculated = async () => {
    if (!calculatedCalories || !calculatedMacros) {
      toaster.create({
        title: "Incomplete information",
        description: "Please fill in all fields to calculate your goals.",
        type: "warning",
        duration: 3000,
      });
      return;
    }

    const metricInputs = getMetricInputs();
    if (!metricInputs) {
      toaster.create({
        title: "Incomplete information",
        description: "Please provide a valid weight, height, and age.",
        type: "warning",
        duration: 3000,
      });
      return;
    }

    const { weightKg, heightCm, age: ageNumber } = metricInputs;

    setSaving(true);
    try {
      const response = await updateUserGoals({
        calorie_goal: calculatedCalories,
        protein_goal: calculatedMacros.protein,
        carb_goal: calculatedMacros.carbs,
        fat_goal: calculatedMacros.fat,
        weight_kg: weightKg,
        height_cm: heightCm,
        age: ageNumber,
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
          title: "Goals calculated and saved!",
          description: "Your nutritional goals have been calculated and saved.",
          type: "success",
          duration: 3000,
        });
        onGoalsUpdated?.();
      } else {
        throw new Error(response.error || "Failed to update goals");
      }
    } catch (error: unknown) {
      toaster.create({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update goals",
        type: "error",
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
        borderRadius="none"
        p={0}
        backdropFilter="blur(12px)"
        boxShadow="0 4px 30px rgba(0, 0, 0, 0.1)"
      >
        <Text color="text.muted">Loading goals...</Text>
      </Box>
    );
  }

  const manualTabProps: ManualTabProps = {
    calories: manualCalories,
    protein: manualProtein,
    carbs: manualCarbs,
    fat: manualFat,
    saving: saving,
    onCaloriesChange: setManualCalories,
    onProteinChange: setManualProtein,
    onCarbsChange: setManualCarbs,
    onFatChange: setManualFat,
    onSave: handleSaveManual,
  };

  const calculatorTabProps: CalculatorTabProps = {
    weight: weight,
    weightLbs: weightLbs,
    weightUnit: weightUnit,
    height: height,
    heightFeet: heightFeet,
    heightInches: heightInches,
    heightUnit: heightUnit,
    age: age,
    sex: sex,
    activityLevel: activityLevel,
    weightGoal: weightGoal,
    calculatedBMR: calculatedBMR,
    calculatedTDEE: calculatedTDEE,
    calculatedCalories: calculatedCalories,
    calculatedMacros: calculatedMacros,
    saving: saving,
    onWeightChange: setWeight,
    onWeightLbsChange: setWeightLbs,
    onWeightUnitChange: setWeightUnit,
    onHeightChange: setHeight,
    onHeightFeetChange: setHeightFeet,
    onHeightInchesChange: setHeightInches,
    onHeightUnitChange: setHeightUnit,
    onAgeChange: setAge,
    onSexChange: setSex,
    onActivityLevelChange: setActivityLevel,
    onWeightGoalChange: setWeightGoal,
    onSave: handleSaveCalculated,
  };

  return (
    <>
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        bg="background.panel"
        borderRadius="none"
        p={0}
        backdropFilter="blur(12px)"
        boxShadow="0 4px 30px rgba(0, 0, 0, 0.1)"
      >
        <VStack align="stretch" gap={6}>
          <Heading size="lg" color="text.default">
            Daily Goals
          </Heading>

          <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value as "manual" | "calculator")} variant="enclosed" colorPalette="brand">
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

            <Tabs.Content value="manual">
              <ManualTab
                {...manualTabProps}
              />
            </Tabs.Content>

            <Tabs.Content value="calculator">
              <CalculatorTab
                {...calculatorTabProps}
              />
            </Tabs.Content>
          </Tabs.Root>
        </VStack>
      </MotionBox>
      <Toaster />
    </>
  );
}

export { calculateBMR, calculateCalorieGoal, calculateMacros, calculateTDEE } from "./goal-settings/calculations";
export type { ActivityLevel, HeightUnit, MacroBreakdown, MetricInputs, Sex, WeightGoal, WeightUnit } from "./goal-settings/types";
