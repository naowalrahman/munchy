"use client";

import {
  Box,
  Button,
  Field,
  Grid,
  HStack,
  Input,
  Portal,
  Select,
  Text,
  VStack,
} from "@chakra-ui/react";

import { CalculatedSummary } from "./CalculatedSummary";
import { CalculatorTabProps } from "./types";
import {
  activityLevelCollection,
  heightUnitCollection,
  sexCollection,
  weightGoalCollection,
  weightUnitCollection,
} from "./constants";
import { ActivityLevel, HeightUnit, Sex, WeightGoal, WeightUnit } from "./types";

export function CalculatorTab(props: CalculatorTabProps) {
  const {
    weight,
    weightLbs,
    weightUnit,
    height,
    heightFeet,
    heightInches,
    heightUnit,
    age,
    sex,
    activityLevel,
    weightGoal,
    calculatedBMR,
    calculatedTDEE,
    calculatedCalories,
    calculatedMacros,
    saving,
    onWeightChange,
    onWeightLbsChange,
    onWeightUnitChange,
    onHeightChange,
    onHeightFeetChange,
    onHeightInchesChange,
    onHeightUnitChange,
    onAgeChange,
    onSexChange,
    onActivityLevelChange,
    onWeightGoalChange,
    onSave,
  } = props;
  const showSummary = Boolean(
    calculatedCalories && calculatedMacros && calculatedBMR !== null && calculatedTDEE !== null
  );

  return (
    <VStack align="stretch" gap={6} pt={6}>
      <Text fontSize="sm" color="text.muted">
        Enter your information to calculate your personalized daily calorie and macronutrient goals using the Mifflin-St
        Jeor Equation.
      </Text>

      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap={4}>
        <Box bg="background.subtle" borderRadius="lg" p={4}>
          <Field.Root>
            <Field.Label fontSize="sm" fontWeight="medium" color="text.default">
              Weight
            </Field.Label>
            <HStack gap={3} align="flex-start" mt={2}>
              <Input
                type="number"
                value={weightUnit === "kg" ? weight : weightLbs}
                onChange={(e) => (weightUnit === "kg" ? onWeightChange(e.target.value) : onWeightLbsChange(e.target.value))}
                placeholder={weightUnit === "kg" ? "70" : "154"}
              />
              <Box minW="36">
                <Select.Root
                  collection={weightUnitCollection}
                  value={[weightUnit]}
                  onValueChange={(e) => onWeightUnitChange(e.value[0] as WeightUnit)}
                  ids={{ hiddenSelect: undefined }} // avoid sharing Field control id with the numeric input
                >
                  <Select.HiddenSelect />
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder="Unit" />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content>
                        {weightUnitCollection.items.map((item) => (
                          <Select.Item item={item} key={item.value}>
                            {item.label}
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>
              </Box>
            </HStack>
          </Field.Root>
        </Box>

        <Box bg="background.subtle" borderRadius="lg" p={4}>
          <Field.Root>
            <Field.Label fontSize="sm" fontWeight="medium" color="text.default">
              Height
            </Field.Label>
            <HStack gap={3} align="flex-start" mt={2}>
              {heightUnit === "cm" ? (
                <Input type="number" value={height} onChange={(e) => onHeightChange(e.target.value)} placeholder="175" />
              ) : (
                <HStack gap={2} w="full">
                  <Input type="number" value={heightFeet} onChange={(e) => onHeightFeetChange(e.target.value)} placeholder="5" />
                  <Input
                    type="number"
                    value={heightInches}
                    onChange={(e) => onHeightInchesChange(e.target.value)}
                    placeholder="9"
                  />
                </HStack>
              )}
              <Box minW="36">
                <Select.Root
                  collection={heightUnitCollection}
                  value={[heightUnit]}
                  onValueChange={(e) => onHeightUnitChange(e.value[0] as HeightUnit)}
                  ids={{ hiddenSelect: undefined }} // avoid sharing Field control id with the numeric inputs
                >
                  <Select.HiddenSelect />
                  <Select.Control>
                    <Select.Trigger>
                      <Select.ValueText placeholder="Unit" />
                    </Select.Trigger>
                    <Select.IndicatorGroup>
                      <Select.Indicator />
                    </Select.IndicatorGroup>
                  </Select.Control>
                  <Portal>
                    <Select.Positioner>
                      <Select.Content>
                        {heightUnitCollection.items.map((item) => (
                          <Select.Item item={item} key={item.value}>
                            {item.label}
                            <Select.ItemIndicator />
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Portal>
                </Select.Root>
              </Box>
            </HStack>
          </Field.Root>
        </Box>

        <Box bg="background.subtle" borderRadius="lg" p={4}>
          <Field.Root>
            <Field.Label fontSize="sm" fontWeight="medium" color="text.default">
              Age
            </Field.Label>
            <Input type="number" value={age} onChange={(e) => onAgeChange(e.target.value)} placeholder="30" mt={2} />
          </Field.Root>
        </Box>

        <Box bg="background.subtle" borderRadius="lg" p={4}>
          <Field.Root>
            <Field.Label fontSize="sm" fontWeight="medium" color="text.default">
              Sex
            </Field.Label>
            <Select.Root collection={sexCollection} value={[sex]} onValueChange={(e) => onSexChange(e.value[0] as Sex)} mt={2}>
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
            onValueChange={(e) => onActivityLevelChange(e.value[0] as ActivityLevel)}
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
            onValueChange={(e) => onWeightGoalChange(e.value[0] as WeightGoal)}
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

      {showSummary && calculatedMacros && calculatedBMR !== null && calculatedTDEE !== null && calculatedCalories && (
        <CalculatedSummary
          calculatedCalories={calculatedCalories}
          calculatedMacros={calculatedMacros}
          calculatedBMR={calculatedBMR}
          calculatedTDEE={calculatedTDEE}
        />
      )}

      <Button colorPalette="brand" size="lg" w="full" onClick={onSave} loading={saving} disabled={!calculatedCalories}>
        Save Calculated Goals
      </Button>
    </VStack>
  );
}

