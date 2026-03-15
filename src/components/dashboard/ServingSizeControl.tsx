"use client";

import { Input, HStack, Text, VStack, Button } from "@chakra-ui/react";
import { useMemo, useState, useEffect } from "react";
import { normalizeUnit } from "@/utils/normalizeUnit";

interface ServingSizeControlProps {
  defaultAmount: number;
  defaultUnit: string;
  servingSize?: number;
  servingSizeUnit?: string;
  onChange: (amount: number, unit: string) => void;
}

export function ServingSizeControl({
  defaultAmount,
  defaultUnit,
  servingSize,
  servingSizeUnit,
  onChange,
}: ServingSizeControlProps) {
  // Determine available units first
  const effectiveServingSize = servingSize || 100;
  const effectiveServingSizeUnit = normalizeUnit(servingSizeUnit || "g");
  const availableUnits = useMemo(() => {
    return effectiveServingSizeUnit === "serving" ? ["serving"] : ["serving", effectiveServingSizeUnit];
  }, [effectiveServingSizeUnit]);

  // Normalize the default unit and ensure it's in availableUnits
  const normalizedDefaultUnit = normalizeUnit(defaultUnit);
  const validDefaultUnit = availableUnits.includes(normalizedDefaultUnit) ? normalizedDefaultUnit : "serving";

  const [amount, setAmount] = useState(defaultAmount.toString());
  const [unit, setUnit] = useState(validDefaultUnit);

  // Notify parent of changes
  useEffect(() => {
    const numericAmount = parseFloat(amount);
    if (!isNaN(numericAmount) && numericAmount > 0) {
      onChange(numericAmount, unit);
    }
  }, [amount, unit, onChange]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow decimal numbers and empty string (for deletion)
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handleUnitSwitch = (newUnit: string) => {
    const currentAmount = parseFloat(amount);
    if (isNaN(currentAmount) || currentAmount <= 0) {
      setUnit(newUnit);
      return;
    }

    // Convert between units using serving size
    const effectiveServingSize = servingSize || 100;
    const effectiveServingSizeUnit = normalizeUnit(servingSizeUnit || "g");

    if (effectiveServingSize > 0) {
      if (unit === "serving" && newUnit === effectiveServingSizeUnit) {
        // Convert servings to the unit (e.g., 2 servings -> 2 cups if 1 serving = 1 cup)
        const convertedAmount = currentAmount * effectiveServingSize;
        setAmount(convertedAmount.toFixed(2));
      } else if (unit === effectiveServingSizeUnit && newUnit === "serving") {
        // Convert unit to servings (e.g., 2 cups -> 2 servings if 1 serving = 1 cup)
        const servings = currentAmount / effectiveServingSize;
        setAmount(servings.toFixed(2));
      }
      // If switching between non-serving units, we don't convert (user should use serving as intermediary)
    }

    setUnit(newUnit);
  };

  return (
    <VStack align="stretch" gap={2}>
      <HStack justify="space-between" align="center">
        <Text fontSize="sm" fontWeight="medium" color="text.default">
          Quantity
        </Text>
        <Text fontSize="xs" color="text.muted">
          1 serving = {effectiveServingSize.toFixed(effectiveServingSize % 1 === 0 ? 0 : 2)}
          {effectiveServingSizeUnit}
        </Text>
      </HStack>
      <HStack>
        <Input
          type="text"
          value={amount}
          onChange={handleAmountChange}
          placeholder="Amount"
          size="lg"
          w="120px"
          bg="background.subtle"
          borderColor="border.default"
          _hover={{ borderColor: "brand.500" }}
          _focus={{
            borderColor: "brand.500",
            boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)",
          }}
        />

        {/* Unit selector - always show since we default to 100g */}
        <HStack gap={1} bg="background.subtle" borderRadius="md" p={1} borderWidth="1px" borderColor="border.default">
          {availableUnits.map((u) => (
            <Button
              key={u}
              size="sm"
              onClick={() => handleUnitSwitch(u)}
              variant={unit === u ? "solid" : "ghost"}
              colorPalette={unit === u ? "brand" : "gray"}
              minW="70px"
            >
              {u}
            </Button>
          ))}
        </HStack>
      </HStack>
    </VStack>
  );
}
