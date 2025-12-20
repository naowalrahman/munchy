import { Box, VStack, HStack, Text, Heading, Grid, Progress, Button } from "@chakra-ui/react";
import { FoodLogEntry } from "@/app/actions/foodLog";
import { IoSettings } from "react-icons/io5";
import Link from "next/link";
import { UserGoals } from "@/app/actions/userGoals";

interface DailySummaryProps {
  entries: FoodLogEntry[];
  initialGoals?: UserGoals | null;
}

export function DailySummary({ entries, initialGoals = null }: DailySummaryProps) {
  const totalCalories = entries.reduce((sum, entry) => sum + (entry.calories || 0), 0);
  const totalProtein = entries.reduce((sum, entry) => sum + (entry.protein || 0), 0);
  const totalCarbs = entries.reduce((sum, entry) => sum + (entry.carbohydrates || 0), 0);
  const totalFat = entries.reduce((sum, entry) => sum + (entry.total_fat || 0), 0);

  const calorieGoal = initialGoals?.calorie_goal || 2000;
  const proteinGoal = initialGoals?.protein_goal || 150;
  const carbGoal = initialGoals?.carb_goal || 250;
  const fatGoal = initialGoals?.fat_goal || 65;

  return (
    <Box
      bg="background.panel"
      borderRadius="xl"
      p={{ base: 3, md: 4 }}
      backdropFilter="blur(12px)"
      boxShadow="0 4px 30px rgba(0, 0, 0, 0.1)"
      transition="all 0.2s"
      borderWidth="1px"
      borderColor="border.default"
      _hover={{
        borderColor: "brand.500/30",
        boxShadow: "0 8px 40px rgba(0, 0, 0, 0.15)",
      }}
    >
      <HStack gap={{ base: 2, md: 6 }} align="center" justify="space-between" flexWrap="nowrap">
        <VStack align="flex-start" gap={0} minW="max-content" display="flex">
          <Heading size="xs" color="text.muted" textTransform="uppercase" letterSpacing="wider" fontSize="2xs">
            Summary
          </Heading>
          <Text fontSize="3xs" color="text.muted">
            {entries.length} foods
          </Text>
        </VStack>

        <Grid templateColumns="repeat(2, 1fr)" gap={{ base: 3, md: 8 }} flex="1" alignItems="center" minW={0}>
          {[
            { label: "Cal", value: totalCalories, goal: calorieGoal, color: "brand" },
            { label: "P", value: totalProtein, goal: proteinGoal, color: "blue" },
            { label: "C", value: totalCarbs, goal: carbGoal, color: "green" },
            { label: "F", value: totalFat, goal: fatGoal, color: "orange" },
          ].map(({ label, value, goal, color }) => (
            <VStack key={label} align="start" gap={0} minW={0}>
              <HStack align="baseline" gap={0.5} w="full">
                <Text fontSize={{ base: "xs", md: "sm" }} fontWeight="bold">
                  {Math.round(value)}
                </Text>
                <Text fontSize="3xs" color="text.muted" fontWeight="bold">
                  / {Math.round(goal)}
                </Text>
                <Text fontSize="4xs" fontWeight="bold" color="text.muted" ml="auto">
                  {label}
                </Text>
              </HStack>
              <Progress.Root value={(value / goal) * 100} colorPalette={color} size="xs" borderRadius="full" w="full">
                <Progress.Track bg="border.muted" h="3px">
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
            </VStack>
          ))}
        </Grid>

        <Link href="/profile">
          <Button variant="ghost" colorPalette="brand" borderRadius="full" size="xs" px={0} minW="24px">
            <IoSettings />
          </Button>
        </Link>
      </HStack>
    </Box>
  );
}
