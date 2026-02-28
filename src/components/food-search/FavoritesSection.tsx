"use client";

import { Box, Button, HStack, Input, Text, VStack } from "@chakra-ui/react";
import { useState } from "react";
import { motion } from "framer-motion";
import { IoHeart, IoSearch } from "react-icons/io5";
import type { FavoritedFood } from "./types";

const MotionVStack = motion.create(VStack);
const MotionBox = motion.create(Box);

interface FavoritesSectionProps {
  favorites: FavoritedFood[];
  onFoodClick: (food: FavoritedFood) => Promise<void>;
  onToggleFavorite: (food: FavoritedFood) => void;
}

export function FavoritesSection({ favorites, onFoodClick, onToggleFavorite }: FavoritesSectionProps) {
  const [filterQuery, setFilterQuery] = useState("");

  const filtered =
    filterQuery.trim().length > 0
      ? favorites.filter(
          (f) =>
            f.description.toLowerCase().includes(filterQuery.toLowerCase()) ||
            f.brandName?.toLowerCase().includes(filterQuery.toLowerCase())
        )
      : favorites;

  return (
    <>
      <Box position="relative" w="full">
        <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="text.muted" zIndex={1}>
          <IoSearch size={20} />
        </Box>
        <Input
          placeholder="Filter favorites..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
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

      {favorites.length === 0 && (
        <Box py={8} textAlign="center">
          <Text color="text.muted">No favorites yet. Tap the heart on any food to save it here.</Text>
        </Box>
      )}

      {favorites.length > 0 && filtered.length === 0 && (
        <Box py={8} textAlign="center">
          <Text color="text.muted">No favorites match your filter.</Text>
        </Box>
      )}

      {filtered.length > 0 && (
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
            {filtered.map((food, index) => (
              <MotionBox
                key={food.fdcId}
                p={4}
                borderBottomWidth={index < filtered.length - 1 ? "1px" : "0"}
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
                <HStack justify="space-between" align="start">
                  <VStack align="start" gap={1} flex={1}>
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
                  <Button
                    size="sm"
                    variant="ghost"
                    colorPalette="red"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(food);
                    }}
                    aria-label="Remove from favorites"
                    flexShrink={0}
                  >
                    <IoHeart size={18} />
                  </Button>
                </HStack>
              </MotionBox>
            ))}
          </MotionVStack>
        </Box>
      )}
    </>
  );
}
