import { createListCollection } from "@chakra-ui/react";
import { ActivityLevel, Sex, WeightGoal, WeightUnit, HeightUnit } from "./types";

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

export const sexCollection = createListCollection({
  items: [
    { label: "Male", value: "male" satisfies Sex },
    { label: "Female", value: "female" satisfies Sex },
  ],
});

export const activityLevelCollection = createListCollection({
  items: [
    {
      label: "Sedentary - Desk job, little to no exercise",
      value: "sedentary" satisfies ActivityLevel,
    },
    {
      label: "Lightly Active - Light exercise 1-3 days/week",
      value: "lightly_active" satisfies ActivityLevel,
    },
    {
      label: "Moderately Active - Moderate exercise 3-5 days/week",
      value: "moderately_active" satisfies ActivityLevel,
    },
    {
      label: "Very Active - Hard exercise 6-7 days/week",
      value: "very_active" satisfies ActivityLevel,
    },
    {
      label: "Extra Active - Very hard exercise/physical job",
      value: "extra_active" satisfies ActivityLevel,
    },
  ],
});

export const weightGoalCollection = createListCollection({
  items: [
    { label: "Lose Weight (~0.5 kg/week)", value: "lose" satisfies WeightGoal },
    { label: "Maintain Weight", value: "maintain" satisfies WeightGoal },
    { label: "Gain Weight (~0.25-0.5 kg/week)", value: "gain" satisfies WeightGoal },
  ],
});

export const weightUnitCollection = createListCollection({
  items: [
    { label: "Kilograms", value: "kg" satisfies WeightUnit },
    { label: "Pounds", value: "lbs" satisfies WeightUnit },
  ],
});

export const heightUnitCollection = createListCollection({
  items: [
    { label: "Centimeters", value: "cm" satisfies HeightUnit },
    { label: "Feet / Inches", value: "ft_in" satisfies HeightUnit },
  ],
});

