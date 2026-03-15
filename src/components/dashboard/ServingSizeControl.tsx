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
  const effectiveServingSize = servingSize || 100;
  const effectiveServingSizeUnit = normalizeUnit(servingSizeUnit || "g");
  const availableUnits = useMemo(() => {
    return effectiveServingSizeUnit === "serving" ? ["serving"] : ["serving", effectiveServingSizeUnit];
  }, [effectiveServingSizeUnit]);

  const normalizedDefaultUnit = normalizeUnit(defaultUnit);
  const validDefaultUnit = availableUnits.includes(normalizedDefaultUnit) ? normalizedDefaultUnit : "serving";

  const [amount, setAmount] = useState(defaultAmount.toString());
  const [unit, setUnit] = useState(validDefaultUnit);

  useEffect(() => {
    const numericAmount = parseFloat(amount);
    if (!isNaN(numericAmount) && numericAmount > 0) {
      onChange(numericAmount, unit);
    }
  }, [amount, unit, onChange]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
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

    if (effectiveServingSize > 0) {
      if (unit === "serving" && newUnit === effectiveServingSizeUnit) {
        setAmount((currentAmount * effectiveServingSize).toFixed(2));
      } else if (unit === effectiveServingSizeUnit && newUnit === "serving") {
        setAmount((currentAmount / effectiveServingSize).toFixed(2));
      }
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
