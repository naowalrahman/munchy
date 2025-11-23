'use client';

import { Box, Input, HStack, Text, VStack, Button } from "@chakra-ui/react";
import { useState, useEffect } from "react";

interface ServingSizeControlProps {
    defaultAmount: number;
    defaultUnit: string;
    servingSize?: number; // Size of one serving in grams
    servingSizeUnit?: string; // Unit of serving size (usually "g")
    onChange: (amount: number, unit: string) => void;
}

export function ServingSizeControl({
    defaultAmount,
    defaultUnit,
    servingSize,
    servingSizeUnit,
    onChange,
}: ServingSizeControlProps) {
    const [amount, setAmount] = useState(defaultAmount.toString());
    const [unit, setUnit] = useState(defaultUnit);

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
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setAmount(value);
        }
    };

    const handleUnitSwitch = (newUnit: string) => {
        const currentAmount = parseFloat(amount);
        if (isNaN(currentAmount) || currentAmount <= 0) {
            setUnit(newUnit);
            return;
        }

        // Convert between units using serving size (default 100g if not specified)
        const effectiveServingSize = servingSize || 100;
        if (effectiveServingSize > 0) {
            if (unit === 'serving' && newUnit === 'g') {
                // Convert servings to grams
                const grams = currentAmount * effectiveServingSize;
                setAmount(grams.toFixed(1));
            } else if (unit === 'g' && newUnit === 'serving') {
                // Convert grams to servings
                const servings = currentAmount / effectiveServingSize;
                setAmount(servings.toFixed(2));
            }
        }
        
        setUnit(newUnit);
    };

    // Units are always available (we default to 100g if no serving size specified)
    const effectiveServingSize = servingSize || 100;
    const effectiveServingSizeUnit = servingSizeUnit || "g";
    const availableUnits = ['serving', 'g'];

    return (
        <VStack align="stretch" gap={2}>
            <HStack justify="space-between" align="center">
                <Text fontSize="sm" fontWeight="medium" color="text.default">
                    Quantity
                </Text>
                <Text fontSize="xs" color="text.muted">
                    1 serving = {effectiveServingSize.toFixed(0)}{effectiveServingSizeUnit}
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
                    _focus={{ borderColor: "brand.500", boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)" }}
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

