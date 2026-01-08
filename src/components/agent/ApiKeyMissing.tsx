import { Box, Button, Heading, Text, VStack, Link as ChakraLink } from "@chakra-ui/react";
import { LuExternalLink, LuKey, LuSettings } from "react-icons/lu";
import Link from "next/link";
import { liquidGlassStyles } from "@/utils/liquidGlassStyles";
import { MotionBox } from "@/components/ui/motion";

export function ApiKeyMissing() {
  return (
    <Box h="full" display="flex" alignItems="center" justifyContent="center">
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        maxW="md"
        w="full"
        p={8}
        borderRadius="2xl"
        {...liquidGlassStyles}
      >
        <VStack gap={6} textAlign="center">
          <Box p={4} borderRadius="full" bg="brand.500/10">
            <LuKey size={48} color="var(--chakra-colors-brand-400)" />
          </Box>

          <VStack gap={2}>
            <Heading size="lg" color="text.default">
              API Key Required
            </Heading>
            <Text color="text.muted">
              To use the AI agent, you need to set your Groq API key in your profile settings.
            </Text>
          </VStack>

          <VStack gap={3} w="full">
            <Link href="/profile" style={{ width: "100%" }}>
              <Button colorPalette="brand" size="lg" w="full">
                <LuSettings />
                Go to Profile Settings
              </Button>
            </Link>

            <Text fontSize="sm" color="text.muted">
              Don't have an API key?{" "}
              <ChakraLink
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
                color="brand.400"
                _hover={{ color: "brand.300" }}
              >
                Get one free from Groq <LuExternalLink style={{ display: "inline", verticalAlign: "middle" }} />
              </ChakraLink>
            </Text>
          </VStack>
        </VStack>
      </MotionBox>
    </Box>
  );
}
