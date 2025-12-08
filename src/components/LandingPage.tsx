"use client";

import { Box, Container, Heading, Text, Button, VStack, SimpleGrid, Icon, Stack } from "@chakra-ui/react";
import { FaCamera, FaRobot, FaChartLine } from "react-icons/fa";
import type { IconType } from "react-icons";
import Link from "next/link";
import { motion } from "framer-motion";
import GeometricBackground from "./GeometricBackground";

const MotionBox = motion.create(Box);
const MotionVStack = motion.create(VStack);
const MotionHeading = motion.create(Heading);
const MotionText = motion.create(Text);
const MotionStack = motion.create(Stack);

export default function LandingPage() {
  return (
    <Box position="relative" overflow="hidden">
      <GeometricBackground />

      {/* Hero Section */}
      <Box position="relative" zIndex={1} py={{ base: 14, md: 32 }} px={{ base: 4, md: 6 }}>
        <Container maxW={{ base: "full", md: "4xl" }} textAlign="center">
          <MotionVStack
            gap={8}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <MotionHeading
              size={{ base: "3xl", md: "5xl" }}
              fontWeight="extrabold"
              lineHeight="1.1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              Track Calories with{" "}
              <Box
                as="span"
                bgGradient="to-r"
                gradientFrom="brand.400"
                gradientTo="purple.500"
                bgClip="text"
                color="transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, var(--chakra-colors-brand-400), var(--chakra-colors-purple-500))",
                  WebkitBackgroundClip: "text",
                }}
              >
                AI Precision
              </Box>
            </MotionHeading>
            <MotionText
              fontSize={{ base: "md", md: "xl" }}
              color="text.muted"
              maxW="2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              Simply describe your meal or snap a photo. Munchy&apos;s AI agent logs your food, calculates calories, and
              tracks your nutrition instantly.
            </MotionText>
            <MotionStack
              direction={{ base: "column", sm: "row" }}
              gap={4}
              pt={4}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              <Button
                asChild
                size={{ base: "lg", md: "xl" }}
                colorPalette="brand"
                px={{ base: 6, md: 8 }}
                fontSize={{ base: "md", md: "lg" }}
              >
                <Link href="/login?mode=signup">Start Tracking</Link>
              </Button>
              <Button
                asChild
                size={{ base: "lg", md: "xl" }}
                variant="outline"
                colorPalette="brand"
                px={{ base: 6, md: 8 }}
                fontSize={{ base: "md", md: "lg" }}
              >
                <Link href="#features">Learn More</Link>
              </Button>
            </MotionStack>
          </MotionVStack>
        </Container>
      </Box>

      {/* Features Section */}
      <Box
        id="features"
        py={{ base: 16, md: 24 }}
        px={{ base: 4, md: 6 }}
        position="relative"
        zIndex={1}
        bg="bg.canvas/50"
        backdropFilter="blur(10px)"
      >
        <Container maxW={{ base: "full", md: "7xl" }}>
          <VStack gap={{ base: 12, md: 16 }}>
            <MotionHeading
              size={{ base: "2xl", md: "3xl" }}
              textAlign="center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Why Munchy?
            </MotionHeading>
            <SimpleGrid columns={{ base: 1, md: 3 }} gap={{ base: 6, md: 8 }} w="full">
              <FeatureCard
                icon={FaRobot}
                title="AI Food Logging"
                description="Just say &lsquo;I had a chicken sandwich and fries&rsquo; and let our AI agent handle the rest."
                delay={0}
              />
              <FeatureCard
                icon={FaCamera}
                title="Rapid Meal Logging"
                description="Quickly log your meals in just a few clicks with our robust, user-friendly, and feature-packed platform."
                delay={0.2}
              />
              <FeatureCard
                icon={FaChartLine}
                title="Smart Analytics"
                description="Get insights into your eating habits and progress towards your goals."
                delay={0.4}
              />
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>
    </Box>
  );
}

type FeatureCardProps = {
  icon: IconType;
  title: string;
  description: string;
  delay: number;
};

function FeatureCard({ icon, title, description, delay }: FeatureCardProps) {
  return (
    <MotionBox
      p={{ base: 6, md: 8 }}
      borderRadius="2xl"
      textStyle="liquid-glass"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5, boxShadow: "0 20px 40px -5px rgba(0, 0, 0, 0.2)" }}
    >
      <VStack align="start" gap={5}>
        <Box p={3} bg="brand.900" borderRadius="xl" color="brand.300">
          <Icon as={icon} fontSize={{ base: "2xl", md: "3xl" }} />
        </Box>
        <Heading size={{ base: "lg", md: "xl" }}>{title}</Heading>
        <Text color="text.muted" fontSize={{ base: "md", md: "lg" }} lineHeight="tall">
          {description}
        </Text>
      </VStack>
    </MotionBox>
  );
}
