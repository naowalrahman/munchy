"use client";

import { Box, HStack, Text, Button, Spinner } from "@chakra-ui/react";

export type ViewMode = "daily" | "weekly" | "monthly";

interface ViewModeSelectorProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  isLoading?: boolean;
}

const modes: { value: ViewMode; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function ViewModeSelector({ value, onChange, isLoading }: ViewModeSelectorProps) {
  return (
    <HStack gap={1}>
      {isLoading && <Spinner size="sm" colorPalette="brand" mr={2} />}
      <Box
        bg="background.panel"
        borderRadius="full"
        p={1}
        borderWidth="1px"
        borderColor="border.default"
        display="flex"
        gap={1}
      >
        {modes.map((mode) => (
          <Button
            key={mode.value}
            size="sm"
            variant={value === mode.value ? "solid" : "ghost"}
            colorPalette={value === mode.value ? "brand" : "gray"}
            borderRadius="full"
            px={4}
            onClick={() => onChange(mode.value)}
            disabled={isLoading}
          >
            <Text fontSize="sm">{mode.label}</Text>
          </Button>
        ))}
      </Box>
    </HStack>
  );
}
