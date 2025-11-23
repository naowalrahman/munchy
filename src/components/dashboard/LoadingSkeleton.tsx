'use client';

import { Box, VStack, HStack, Skeleton } from "@chakra-ui/react";

export function MealSectionSkeleton() {
    return (
        <Box
            bg="background.panel"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="border.default"
            p={6}
        >
            <VStack align="stretch" gap={4}>
                <HStack justify="space-between">
                    <Skeleton height="24px" width="120px" />
                    <Skeleton height="32px" width="100px" />
                </HStack>
                <Skeleton height="80px" width="100%" />
                <VStack align="stretch" gap={2}>
                    <Skeleton height="60px" width="100%" />
                    <Skeleton height="60px" width="100%" />
                </VStack>
            </VStack>
        </Box>
    );
}

export function DailySummarySkeleton() {
    return (
        <Box
            bg="background.panel"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="border.default"
            p={6}
        >
            <VStack align="stretch" gap={6}>
                <Skeleton height="32px" width="200px" />
                <Skeleton height="150px" width="100%" />
                <HStack gap={4}>
                    <Skeleton height="120px" flex="1" />
                    <Skeleton height="120px" flex="1" />
                    <Skeleton height="120px" flex="1" />
                </HStack>
            </VStack>
        </Box>
    );
}

