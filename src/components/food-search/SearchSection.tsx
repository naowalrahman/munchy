import { Box, HStack, Input, Spinner, Text, VStack } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { IoSearch } from "react-icons/io5";
import type { FoodSearchResult } from "@/app/actions/food";

const MotionVStack = motion.create(VStack);
const MotionBox = motion.create(Box);

interface SearchSectionProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  isSearching: boolean;
  searchResults: FoodSearchResult[];
  onFoodClick: (food: FoodSearchResult) => Promise<void>;
}

export function SearchSection({
  searchQuery,
  onSearchQueryChange,
  isSearching,
  searchResults,
  onFoodClick,
}: SearchSectionProps) {
  return (
    <>
      <Box position="relative" w="full">
        <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="text.muted" zIndex={1}>
          <IoSearch size={20} />
        </Box>
        <Input
          placeholder="Search for foods..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          size="lg"
          pl={10}
          bg="background.subtle"
          borderColor="border.default"
          _hover={{ borderColor: "brand.500" }}
          _focus={{
            borderColor: "brand.500",
            boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)",
          }}
        />
      </Box>

      {isSearching && (
        <HStack justify="center" py={8}>
          <Spinner size="lg" colorPalette="brand" />
        </HStack>
      )}

      {!isSearching && searchResults.length > 0 && (
        <Box flex="1" overflowY="auto" maxH="400px" borderRadius="md" borderWidth="1px" borderColor="border.default">
          <MotionVStack
            align="stretch"
            gap={0}
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.03,
                },
              },
            }}
          >
            {searchResults.map((food, index) => (
              <MotionBox
                key={food.fdcId}
                p={4}
                borderBottomWidth={index < searchResults.length - 1 ? "1px" : "0"}
                borderColor="border.default"
                cursor="pointer"
                _hover={{
                  bg: "background.subtle",
                  transform: "translateX(4px)",
                  borderLeftWidth: "3px",
                  borderLeftColor: "brand.500",
                }}
                onClick={() => onFoodClick(food)}
                variants={{
                  hidden: { opacity: 0, x: -20 },
                  visible: { opacity: 1, x: 0 },
                }}
                transition={{ duration: 0.2 }}
              >
                <VStack align="start" gap={1}>
                  <Text color="text.default" fontWeight="medium">
                    {food.description}
                  </Text>
                  {food.brandName && (
                    <Text fontSize="sm" color="text.muted">
                      {food.brandName}
                    </Text>
                  )}
                  {food.servingSize && food.servingSizeUnit && (
                    <Text fontSize="xs" color="text.muted">
                      Serving: {food.servingSize} {food.servingSizeUnit}
                    </Text>
                  )}
                </VStack>
              </MotionBox>
            ))}
          </MotionVStack>
        </Box>
      )}

      {!isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
        <Box py={8} textAlign="center">
          <Text color="text.muted">No foods found. Try a different search term.</Text>
        </Box>
      )}

      {!isSearching && searchQuery.trim().length < 2 && (
        <Box py={8} textAlign="center">
          <Text color="text.muted">Start typing to search for foods</Text>
        </Box>
      )}
    </>
  );
}
