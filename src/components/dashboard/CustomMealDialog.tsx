"use client";

import { Box, VStack, HStack, Text, Input, Button, Heading } from "@chakra-ui/react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoClose } from "react-icons/io5";

interface CustomMealDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMeal: (mealName: string) => void;
}

const MotionBox = motion.create(Box);

export function CustomMealDialog({ isOpen, onClose, onAddMeal }: CustomMealDialogProps) {
  const [mealName, setMealName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mealName.trim()) {
      onAddMeal(mealName.trim());
      setMealName("");
      onClose();
    }
  };

  const handleClose = () => {
    setMealName("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <MotionBox
            position="fixed"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="blackAlpha.700"
            zIndex={999}
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Dialog */}
      <AnimatePresence>
        {isOpen && (
          <MotionBox
            position="fixed"
            top="50%"
            left="50%"
            w={{ base: "90vw", md: "400px" }}
            bg="background.canvas"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="border.default"
            boxShadow="2xl"
            zIndex={1000}
            p={6}
            initial={{ x: "-50%", y: "-50%", opacity: 0, scale: 0.95 }}
            animate={{ x: "-50%", y: "-50%", opacity: 1, scale: 1 }}
            exit={{ x: "-50%", y: "-50%", opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <form onSubmit={handleSubmit}>
              <VStack align="stretch" gap={4}>
                {/* Header */}
                <HStack justify="space-between" align="center">
                  <Heading size="lg" color="text.default">
                    Add Custom Meal
                  </Heading>
                  <Button onClick={handleClose} variant="ghost" size="sm" colorPalette="gray" type="button">
                    <IoClose size={24} />
                  </Button>
                </HStack>

                <Text color="text.muted" fontSize="sm">
                  Create a custom meal section (e.g., &ldquo;Post-workout&rdquo;, &ldquo;Midnight snack&rdquo;)
                </Text>

                {/* Input */}
                <Input
                  placeholder="Enter meal name..."
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  size="lg"
                  bg="background.subtle"
                  borderColor="border.default"
                  _hover={{ borderColor: "brand.500" }}
                  _focus={{
                    borderColor: "brand.500",
                    boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)",
                  }}
                  autoFocus
                />

                {/* Actions */}
                <HStack justify="flex-end" gap={2}>
                  <Button variant="ghost" onClick={handleClose} type="button">
                    Cancel
                  </Button>
                  <Button colorPalette="brand" type="submit" disabled={!mealName.trim()}>
                    Add Meal
                  </Button>
                </HStack>
              </VStack>
            </form>
          </MotionBox>
        )}
      </AnimatePresence>
    </>
  );
}
