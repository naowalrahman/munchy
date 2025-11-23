'use client'

import { Box, Container, Heading, Text, Button, VStack, SimpleGrid, Icon, Stack } from '@chakra-ui/react'
import { FaCamera, FaRobot, FaChartLine } from 'react-icons/fa'
import Link from 'next/link'

export default function LandingPage() {
    return (
        <Box>
            {/* Hero Section */}
            <Box bg="bg.canvas" py={20} px={4}>
                <Container maxW="4xl" textAlign="center">
                    <VStack gap={6}>
                        <Heading size="4xl" fontWeight="bold" lineHeight="1.2">
                            Track Calories with <Box as="span" color="brand.500">AI Precision</Box>
                        </Heading>
                        <Text fontSize="xl" color="text.muted" maxW="2xl">
                            Simply describe your meal or snap a photo. Munchy's AI agent logs your food, calculates calories, and tracks your nutrition instantly.
                        </Text>
                        <Stack direction={{ base: 'column', md: 'row' }} gap={4} pt={4}>
                            <Button asChild size="xl" colorPalette="brand">
                                <Link href="/login?mode=signup">Start Tracking Free</Link>
                            </Button>
                            <Button asChild size="xl" variant="outline" colorPalette="brand">
                                <Link href="#features">Learn More</Link>
                            </Button>
                        </Stack>
                    </VStack>
                </Container>
            </Box>

            {/* Features Section */}
            <Box id="features" py={20} px={4}>
                <Container maxW="7xl">
                    <VStack gap={12}>
                        <Heading size="2xl" textAlign="center">Why Munchy?</Heading>
                        <SimpleGrid columns={{ base: 1, md: 3 }} gap={10} w="full">
                            <FeatureCard
                                icon={FaRobot}
                                title="AI Food Logging"
                                description="Just say 'I had a chicken sandwich and fries' and let our AI handle the rest."
                            />
                            <FeatureCard
                                icon={FaCamera}
                                title="Photo Recognition"
                                description="Snap a picture of your meal. We'll identify the ingredients and portion sizes."
                            />
                            <FeatureCard
                                icon={FaChartLine}
                                title="Smart Analytics"
                                description="Get insights into your eating habits and progress towards your goals."
                            />
                        </SimpleGrid>
                    </VStack>
                </Container>
            </Box>
        </Box>
    )
}

function FeatureCard({ icon, title, description }: { icon: any, title: string, description: string }) {
    return (
        <Box p={8} borderRadius="xl" bg="bg.panel" shadow="md" borderWidth="1px" borderColor="border.muted">
            <VStack align="start" gap={4}>
                <Box p={3} bg="brand.900" borderRadius="lg" color="brand.200">
                    <Icon as={icon} fontSize="2xl" />
                </Box>
                <Heading size="lg">{title}</Heading>
                <Text color="text.muted" fontSize="lg">{description}</Text>
            </VStack>
        </Box>
    )
}
