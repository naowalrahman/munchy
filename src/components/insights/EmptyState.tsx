"use client";

import { Box, VStack, Text, Button } from "@chakra-ui/react";
import { IoRestaurant } from "react-icons/io5";
import Link from "next/link";

export function EmptyState() {
  return (
    <Box
      bg="background.panel"
      borderRadius="xl"
      p={{ base: 8, md: 12 }}
      borderWidth="1px"
      borderColor="border.default"
      backdropFilter="blur(12px)"
      boxShadow="0 4px 30px rgba(0, 0, 0, 0.1)"
      textAlign="center"
    >
      <VStack gap={6}>
        <Box bg="brand.500/10" borderRadius="full" p={6} color="brand.500">
          <IoRestaurant size={48} />
        </Box>
        <VStack gap={2}>
          <Text fontSize="xl" fontWeight="semibold" color="text.default">
            No Data Yet
          </Text>
          <Text color="text.muted" maxW="md">
            Start logging your meals to see insights about your nutrition trends. Track your calories and macros over
            time to understand your eating patterns better.
          </Text>
        </VStack>
        <Link href="/dashboard">
          <Button colorPalette="brand" size="lg">
            Go to Dashboard
          </Button>
        </Link>
      </VStack>
    </Box>
  );
}
