import type { NutritionalData } from "@/app/actions/food";

export interface FoodSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mealName: string;
  onFoodAdded: () => void;
}

export type InputMode = "search" | "scan";

export type StagedFood = {
  id: string;
  nutritionData: NutritionalData;
  servingAmount: number;
  servingUnit: string;
  barcode: string | null;
};

export const SCANNER_ELEMENT_ID = "barcode-scanner";
