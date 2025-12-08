"use client";

import { Box, Button, Field, Grid, Input, VStack } from "@chakra-ui/react";

import { ManualTabProps } from "./types";

export function ManualTab(props: ManualTabProps) {
  const { calories, protein, carbs, fat, saving, onCaloriesChange, onProteinChange, onCarbsChange, onFatChange, onSave } =
    props;
  return (
    <VStack align="stretch" gap={6} pt={6}>
      <Box bg="background.subtle" borderRadius="lg" p={6} borderWidth="2px" borderColor="brand.500/30">
        <Field.Root>
          <Field.Label fontSize="sm" fontWeight="medium" color="text.default">
            Daily Calorie Goal
          </Field.Label>
          <Input type="number" value={calories} onChange={(e) => onCaloriesChange(e.target.value)} size="lg" mt={2} />
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
            <Input type="number" value={protein} onChange={(e) => onProteinChange(e.target.value)} mt={2} />
          </Field.Root>
        </Box>

        <Box bg="background.subtle" borderRadius="lg" p={4}>
          <Field.Root>
            <Field.Label fontSize="sm" fontWeight="medium" color="text.default">
              Carbs (g)
            </Field.Label>
            <Input type="number" value={carbs} onChange={(e) => onCarbsChange(e.target.value)} mt={2} />
          </Field.Root>
        </Box>

        <Box bg="background.subtle" borderRadius="lg" p={4}>
          <Field.Root>
            <Field.Label fontSize="sm" fontWeight="medium" color="text.default">
              Fat (g)
            </Field.Label>
            <Input type="number" value={fat} onChange={(e) => onFatChange(e.target.value)} mt={2} />
          </Field.Root>
        </Box>
      </Grid>

      <Button colorPalette="brand" size="lg" w="full" onClick={onSave} loading={saving}>
        Save Goals
      </Button>
    </VStack>
  );
}

