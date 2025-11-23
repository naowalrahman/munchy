'use client'

import { Box, Flex, Heading, Button, HStack } from '@chakra-ui/react'
import Link from 'next/link'

export default function Navbar() {
    return (
        <Box as="nav" py={4} px={8} bg="bg.panel" shadow="sm">
            <Flex justify="space-between" align="center" maxW="7xl" mx="auto">
                <Link href="/">
                    <Heading size="lg" color="brand.500" letterSpacing="tight">
                        Munchy
                    </Heading>
                </Link>

                <HStack gap={4}>
                    <Button asChild variant="ghost" colorPalette="brand">
                        <Link href="/login">Log In</Link>
                    </Button>
                    <Button asChild colorPalette="brand">
                        <Link href="/login?mode=signup">Get Started</Link>
                    </Button>
                </HStack>
            </Flex>
        </Box>
    )
}
