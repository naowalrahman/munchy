export type Sex = "male" | "female";

export type ActivityLevel = "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extra_active";

export type WeightGoal = "lose" | "maintain" | "gain";

export type WeightUnit = "kg" | "lbs";

export type HeightUnit = "cm" | "ft_in";

export interface MacroBreakdown {
  protein: number;
  carbs: number;
  fat: number;
}

export interface MetricInputs {
  weightKg: number;
  heightCm: number;
  age: number;
}

export interface ManualTabProps {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  saving: boolean;
  onCaloriesChange: (value: string) => void;
  onProteinChange: (value: string) => void;
  onCarbsChange: (value: string) => void;
  onFatChange: (value: string) => void;
  onSave: () => void;
}

export interface CalculatorTabProps {
  weight: string;
  weightLbs: string;
  weightUnit: WeightUnit;
  height: string;
  heightFeet: string;
  heightInches: string;
  heightUnit: HeightUnit;
  age: string;
  sex: Sex;
  activityLevel: ActivityLevel;
  weightGoal: WeightGoal;
  calculatedBMR: number | null;
  calculatedTDEE: number | null;
  calculatedCalories: number | null;
  calculatedMacros: MacroBreakdown | null;
  saving: boolean;
  onWeightChange: (value: string) => void;
  onWeightLbsChange: (value: string) => void;
  onWeightUnitChange: (value: WeightUnit) => void;
  onHeightChange: (value: string) => void;
  onHeightFeetChange: (value: string) => void;
  onHeightInchesChange: (value: string) => void;
  onHeightUnitChange: (value: HeightUnit) => void;
  onAgeChange: (value: string) => void;
  onSexChange: (value: Sex) => void;
  onActivityLevelChange: (value: ActivityLevel) => void;
  onWeightGoalChange: (value: WeightGoal) => void;
  onSave: () => void;
}


