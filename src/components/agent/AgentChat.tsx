"use client";

import { runAgent } from "@/app/actions/agent";
import { DisplayMessage } from "@/utils/agent/model";
import { Box, Button, Flex, Heading, HStack, IconButton, Input, Spinner, Text, VStack } from "@chakra-ui/react";
import { AnimatePresence } from "framer-motion";
import { useCallback, useRef, useEffect, useState } from "react";
import { IoArrowBack, IoSend, IoAdd } from "react-icons/io5";
import { useRouter } from "next/navigation";
import { AgentInputItem } from "@openai/agents";
import { liquidGlassStyles } from "@/theme";
import { MessageBubble } from "./MessageBubble";
import { MotionBox } from "@/components/ui/motion-box";

export default function AgentChat() {
  const router = useRouter();
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("munchy-messages");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [history, setHistory] = useState<AgentInputItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("munchy-history");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist chat history to local storage
  useEffect(() => {
    if (history) {
      localStorage.setItem("munchy-history", JSON.stringify(history));
    }
  }, [history]);

  // Persist messages to local storage
  useEffect(() => {
    localStorage.setItem("munchy-messages", JSON.stringify(displayMessages));
  }, [displayMessages]);

  const handleNewChat = () => {
    setDisplayMessages([]);
    setHistory([]);
    localStorage.removeItem("munchy-history");
    localStorage.removeItem("munchy-messages");
    inputRef.current?.focus();
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages, scrollToBottom]);

  const handleSubmit = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    setInput("");
    setIsLoading(true);

    setDisplayMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: trimmedInput,
      },
    ]);

    try {
      const result = await runAgent(trimmedInput, history);

      if (result.error) {
        setDisplayMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Sorry, I encountered an error: ${result.error}`,
          },
        ]);
      } else {
        setDisplayMessages((prev) => [...prev, ...result.newDisplayMessages]);
        setHistory(result.history);
      }
    } catch (error) {
      setDisplayMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Box h="full" position="relative" overflow="hidden">
      {/* Header - Fixed at top */}
      <MotionBox
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        position="fixed"
        top={2}
        left={0}
        right={0}
        mx="auto"
        w="fit-content"
        maxW="4xl"
        px={4}
        zIndex={10}
      >
        <Box px={4} py={0} {...liquidGlassStyles} borderRadius="2xl">
          <HStack justify="space-between">
            <HStack gap={3}>
              <IconButton
                aria-label="Back to dashboard"
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
              >
                <IoArrowBack />
              </IconButton>
              <Box>
                <Heading size="md" color="text.default">
                  Munchy AI 🍎
                </Heading>
              </Box>
            </HStack>
            <IconButton
              aria-label="New chat"
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              disabled={isLoading || displayMessages.length === 0}
            >
              <IoAdd />
            </IconButton>
          </HStack>
        </Box>
      </MotionBox>

      {/* Messages area */}
      <Box
        h="full"
        w="full"
        overflowY="auto"
        px={2}
        pt={"40px"}
        pb={"100px"}
        css={{
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(255, 255, 255, 0.2)",
            borderRadius: "3px",
          },
        }}
      >
        <VStack gap={3} py={4} align="stretch">
          {displayMessages.length === 0 && (
            <MotionBox initial={{ opacity: 0 }} animate={{ opacity: 1 }} textAlign="center" py={12}>
              <Text fontSize="4xl" mb={4}>
                👋
              </Text>
              <Heading size="lg" color="text.default" mb={2}>
                Hi! I'm Munchy
              </Heading>
              <Text color="text.muted" maxW="md" mx="auto">
                I can help you search for foods, log your meals, check your daily nutrition, and answer questions about
                health and nutrition.
              </Text>
              <VStack mt={6} gap={2}>
                <Text fontSize="sm" color="text.muted">
                  Try asking:
                </Text>
                <Flex gap={2} flexWrap="wrap" justify="center">
                  {["What did I eat today?", "Log a banana for breakfast", "How many calories in an avocado?"].map(
                    (suggestion) => (
                      <Button
                        key={suggestion}
                        size="sm"
                        variant="outline"
                        colorPalette="brand"
                        onClick={() => {
                          setInput(suggestion);
                          inputRef.current?.focus();
                        }}
                      >
                        {suggestion}
                      </Button>
                    )
                  )}
                </Flex>
              </VStack>
            </MotionBox>
          )}

          <AnimatePresence mode="popLayout">
            {displayMessages.map((message, index) => (
              <MessageBubble key={index} message={message} index={index} />
            ))}
          </AnimatePresence>

          {isLoading && (
            <MotionBox
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              alignSelf="flex-start"
              px={4}
              py={3}
              borderRadius="2xl"
              borderBottomLeftRadius="md"
              {...liquidGlassStyles}
            >
              <HStack gap={2}>
                <Spinner size="sm" color="brand.400" />
                <Text color="text.muted">Thinking...</Text>
              </HStack>
            </MotionBox>
          )}

          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      {/* Input area - Fixed at bottom */}
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        position="fixed"
        bottom={4}
        left={0}
        right={0}
        mx="auto"
        w="full"
        maxW="4xl"
        px={4}
        zIndex={10}
      >
        <Box p={4} {...liquidGlassStyles} borderRadius="2xl">
          <HStack gap={3}>
            <Input
              ref={inputRef}
              placeholder="Ask me anything about food & nutrition..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              size="lg"
              bg="rgba(0, 0, 0, 0.3)"
              border="1px solid rgba(255, 255, 255, 0.1)"
              _placeholder={{ color: "text.muted" }}
              _focus={{
                borderColor: "brand.500",
                boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)",
              }}
            />
            <IconButton
              aria-label="Send message"
              colorPalette="brand"
              size="lg"
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
            >
              <IoSend />
            </IconButton>
          </HStack>
        </Box>
      </MotionBox>
    </Box>
  );
}
