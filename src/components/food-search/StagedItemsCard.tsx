import { Box, Heading, HStack, IconButton, Text, VStack } from "@chakra-ui/react";
import { IoTrash } from "react-icons/io5";
import type { StagedFood } from "./types";

interface StagedItemsCardProps {
  stagedItems: StagedFood[];
  onRemove: (id: string) => void;
}

export function StagedItemsCard({ stagedItems, onRemove }: StagedItemsCardProps) {
  return (
    <VStack align="stretch" gap={2} borderWidth="1px" borderColor="border.default" borderRadius="md" p={3}>
      <HStack justify="space-between">
        <Heading size="sm" color="text.default">
          Staged items
        </Heading>
        <Text fontSize="xs" color="text.muted">
          Saved when you press Save
        </Text>
      </HStack>
      {stagedItems.length === 0 ? (
        <Text fontSize="sm" color="text.muted">
          Nothing staged yet. Search or scan to add items.
        </Text>
      ) : (
        <VStack align="stretch" gap={2} maxH="180px" overflowY="auto">
          {stagedItems.map((item) => (
            <HStack
              key={item.id}
              justify="space-between"
              align="start"
              borderWidth="1px"
              borderColor="border.default"
              borderRadius="md"
              p={2}
              bg="background.subtle"
            >
              <Box>
                <Text fontWeight="semibold" color="text.default">
                  {item.nutritionData.description}
                </Text>
                {item.nutritionData.brandName && (
                  <Text fontSize="xs" color="text.muted">
                    {item.nutritionData.brandName}
                  </Text>
                )}
                <Text fontSize="sm" color="text.default">
                  {item.servingAmount} {item.servingUnit}
                  {item.barcode ? " · scanned" : ""}
                </Text>
              </Box>
              <IconButton
                aria-label="Remove staged item"
                size="xs"
                variant="ghost"
                colorPalette="red"
                onClick={() => onRemove(item.id)}
              >
                <IoTrash />
              </IconButton>
            </HStack>
          ))}
        </VStack>
      )}
    </VStack>
  );
}
