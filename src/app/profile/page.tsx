"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Input,
  VStack,
  Heading,
  Text,
  Stack,
  Container,
  HStack,
  Separator,
  Link as ChakraLink,
} from "@chakra-ui/react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { GoalSettings } from "@/components/profile/GoalSettings";
import { motion } from "framer-motion";
import { IoArrowBack } from "react-icons/io5";
import { LuExternalLink } from "react-icons/lu";
import Link from "next/link";
import { Toaster, toaster } from "@/components/ui/toaster";

const MotionBox = motion.create(Box);

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [groqApiKey, setGroqApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) {
        router.push("/login");
        return;
      }
      setUser(user);
      setName(user.user_metadata.full_name || "");
      setGroqApiKey(user.user_metadata.groq_api_key || "");
    };
    getUser();
  }, [router, supabase]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates: { data: { full_name: string }; password?: string } = {
        data: { full_name: name },
      };

      if (password) {
        updates.password = password;
      }

      const { error } = await supabase.auth.updateUser(updates);

      if (error) throw error;

      toaster.create({
        title: "Profile updated!",
        description: "Your profile has been updated successfully.",
        type: "success",
        duration: 3000,
      });

      setPassword(""); // clear password field

      // Refresh user data to update navbar
      router.refresh();
    } catch (err: unknown) {
      toaster.create({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update profile",
        type: "error",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiKeyLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { groq_api_key: groqApiKey },
      });

      if (error) throw error;

      toaster.create({
        title: "API Key updated!",
        description: "Your Groq API key has been saved successfully.",
        type: "success",
        duration: 3000,
      });
    } catch (err: unknown) {
      toaster.create({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update API key",
        type: "error",
        duration: 5000,
      });
    } finally {
      setApiKeyLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Box minH="100vh" bg="background.canvas" py={8}>
      <Container maxW="4xl">
        <VStack align="stretch" gap={8}>
          {/* Header with back button */}
          <MotionBox initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <HStack justify="space-between" align="center">
              <HStack gap={4}>
                <Link href="/dashboard">
                  <Button variant="ghost" colorPalette="brand">
                    <IoArrowBack />
                    Back to Dashboard
                  </Button>
                </Link>
              </HStack>
            </HStack>
          </MotionBox>

          {/* Profile Settings Card */}
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Box
              p={0}
              borderRadius="none"
              bg="background.panel"
              backdropFilter="blur(12px)"
              boxShadow="0 4px 30px rgba(0, 0, 0, 0.1)"
            >
              <VStack gap={6} as="form" onSubmit={handleUpdateProfile}>
                <Heading size="lg" color="text.default">
                  Profile Settings
                </Heading>

                <Stack gap={4} w="full">
                  <Box>
                    <Text mb={2} fontWeight="medium" color="text.default">
                      Email
                    </Text>
                    <Input value={user.email} readOnly disabled color="text.muted" />
                  </Box>

                  <Box>
                    <Text mb={2} fontWeight="medium" color="text.default">
                      Name
                    </Text>
                    <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" />
                  </Box>

                  <Box>
                    <Text mb={2} fontWeight="medium" color="text.default">
                      New Password
                    </Text>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Leave blank to keep current"
                    />
                  </Box>
                </Stack>

                <Button type="submit" colorPalette="brand" w="full" loading={loading}>
                  Update Profile
                </Button>
              </VStack>
            </Box>
          </MotionBox>

          <Separator />

          {/* AI Agent Settings */}
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Box
              p={0}
              borderRadius="none"
              bg="background.panel"
              backdropFilter="blur(12px)"
              boxShadow="0 4px 30px rgba(0, 0, 0, 0.1)"
            >
              <VStack gap={6} as="form" onSubmit={handleUpdateApiKey}>
                <Heading size="lg" color="text.default">
                  AI Agent Settings
                </Heading>

                <Stack gap={4} w="full">
                  <Box>
                    <Text mb={2} fontWeight="medium" color="text.default">
                      Groq API Key
                    </Text>
                    <Input
                      type="password"
                      value={groqApiKey}
                      onChange={(e) => setGroqApiKey(e.target.value)}
                      placeholder="gsk_..."
                    />
                    <Text mt={2} fontSize="sm" color="text.muted">
                      Required to use the AI agent.{" "}
                      <ChakraLink
                        href="https://console.groq.com/keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        color="brand.400"
                        _hover={{ color: "brand.300" }}
                      >
                        Get your API key here <LuExternalLink style={{ display: "inline", verticalAlign: "middle" }} />
                      </ChakraLink>
                    </Text>
                  </Box>
                </Stack>

                <Button type="submit" colorPalette="brand" w="full" loading={apiKeyLoading}>
                  Save API Key
                </Button>
              </VStack>
            </Box>
          </MotionBox>

          <Separator />

          {/* Goal Settings */}
          <GoalSettings />
        </VStack>
      </Container>
      <Toaster />
    </Box>
  );
}
