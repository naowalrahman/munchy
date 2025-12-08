import AuthForm from "@/components/AuthForm";
import { Box, Container, Flex } from "@chakra-ui/react";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Box minH="100dvh" bg="bg.canvas">
      <Container maxW="7xl" py={{ base: 12, md: 20 }} px={{ base: 4, md: 0 }}>
        <Flex justify="center">
          <Suspense fallback={<Box>Loading...</Box>}>
            <AuthForm />
          </Suspense>
        </Flex>
      </Container>
    </Box>
  );
}
