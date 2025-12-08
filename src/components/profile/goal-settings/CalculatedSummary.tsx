"use client";

import { Box, Grid, Heading, Separator, Text, VStack } from "@chakra-ui/react";
import { motion } from "framer-motion";

import { MacroBreakdown } from "./types";

const MotionBox = motion.create(Box);

interface CalculatedSummaryProps {
  calculatedCalories: number;
  calculatedMacros: MacroBreakdown;
  calculatedBMR: number;
  calculatedTDEE: number;
}

export function CalculatedSummary({
  calculatedCalories,
  calculatedMacros,
  calculatedBMR,
  calculatedTDEE,
}: CalculatedSummaryProps) {
  return (
    <MotionBox
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      bg="brand.500/10"
      borderRadius="lg"
      p={6}
      borderWidth="2px"
      borderColor="brand.500"
    >
      <VStack align="stretch" gap={4}>
        <Heading size="md" color="brand.500">
          Your Calculated Goals
        </Heading>

        <Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)" }} gap={3}>
          <Box>
            <Text fontSize="xs" color="text.muted" textTransform="uppercase">
              BMR (Basal Metabolic Rate)
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="text.default">
              {Math.round(calculatedBMR)} cal
            </Text>
          </Box>

          <Box>
            <Text fontSize="xs" color="text.muted" textTransform="uppercase">
              TDEE (Maintenance)
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="text.default">
              {Math.round(calculatedTDEE)} cal
            </Text>
          </Box>
        </Grid>

        <Separator />

        <Box textAlign="center">
          <Text fontSize="xs" color="text.muted" textTransform="uppercase" mb={2}>
            Daily Calorie Goal
          </Text>
          <Text fontSize="4xl" fontWeight="bold" color="brand.500">
            {calculatedCalories}
          </Text>
          <Text fontSize="sm" color="text.muted">
            calories per day
          </Text>
        </Box>

        <Separator />

        <Grid templateColumns="repeat(3, 1fr)" gap={3}>
          <Box textAlign="center">
            <Text fontSize="xs" color="text.muted" textTransform="uppercase">
              Protein
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="blue.500">
              {calculatedMacros.protein}g
            </Text>
          </Box>

          <Box textAlign="center">
            <Text fontSize="xs" color="text.muted" textTransform="uppercase">
              Carbs
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="green.500">
              {calculatedMacros.carbs}g
            </Text>
          </Box>

          <Box textAlign="center">
            <Text fontSize="xs" color="text.muted" textTransform="uppercase">
              Fat
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="orange.500">
              {calculatedMacros.fat}g
            </Text>
          </Box>
        </Grid>
      </VStack>
    </MotionBox>
  );
}

