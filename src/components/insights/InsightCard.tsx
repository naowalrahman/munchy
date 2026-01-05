"use client";

import { Box, VStack, Text, Skeleton } from "@chakra-ui/react";

interface InsightCardProps {
  label: string;
  value: number;
  unit?: string;
  colorPalette?: string;
  isLoading?: boolean;
}

export function InsightCard({ label, value, unit, colorPalette = "brand", isLoading }: InsightCardProps) {
  return (
    <Box
      bg="background.panel"
      borderRadius="xl"
      p={{ base: 4, md: 5 }}
      borderWidth="1px"
      borderColor="border.default"
      backdropFilter="blur(12px)"
      boxShadow="0 4px 30px rgba(0, 0, 0, 0.1)"
      transition="all 0.2s"
      _hover={{
        borderColor: `${colorPalette}.500/30`,
        boxShadow: "0 8px 40px rgba(0, 0, 0, 0.15)",
      }}
    >
      <VStack align="start" gap={1}>
        <Text fontSize="xs" color="text.muted" textTransform="uppercase" letterSpacing="wider" fontWeight="medium">
          {label}
        </Text>
        {isLoading ? (
          <Skeleton height="32px" width="80px" />
        ) : (
          <Text fontSize={{ base: "2xl", md: "3xl" }} fontWeight="bold" color={`${colorPalette}.500`}>
            {value.toLocaleString()}
            {unit && (
              <Text as="span" fontSize="md" color="text.muted" ml={1}>
                {unit}
              </Text>
            )}
          </Text>
        )}
      </VStack>
    </Box>
  );
}
