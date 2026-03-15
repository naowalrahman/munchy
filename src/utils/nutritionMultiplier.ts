import { normalizeUnit } from "./normalizeUnit";

export function getNutritionMultiplier(
  servingAmount: number,
  servingUnit: string,
  servingSize: number | undefined,
  servingSizeUnit: string | undefined
): number {
  const effectiveSize = servingSize || 100;
  const sizeUnit = normalizeUnit(servingSizeUnit || "g");
  const currentUnit = normalizeUnit(servingUnit);

  if (effectiveSize <= 0 || currentUnit === "serving") return servingAmount;
  if (currentUnit === sizeUnit) return servingAmount / effectiveSize;
  return servingAmount;
}
