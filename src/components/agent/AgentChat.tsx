"use client";

import { runAgent, DisplayMessage } from "@/app/actions/agent";
import { AgentInputItem } from "@openai/agents";
import { Box, Button, Flex, Heading, HStack, IconButton, Input, Spinner, Text, VStack } from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useRef, useEffect, useState } from "react";
import { IoArrowBack, IoSend } from "react-icons/io5";
import { useRouter } from "next/navigation";

const MotionBox = motion.create(Box);

const glassStyles = {
  bg: "rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
};

function MessageBubble({ message, index }: { message: DisplayMessage; index: number }) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";

  if (isTool) {
    return (
      <MotionBox
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        alignSelf="center"
        maxW="90%"
        w="full"
        px={4}
        py={3}
        borderRadius="xl"
        bg="rgba(49, 151, 149, 0.15)"
        border="1px solid rgba(49, 151, 149, 0.3)"
        fontSize="sm"
      >
        <HStack gap={2} mb={2}>
          <Box
            w={2}
            h={2}
            borderRadius="full"
            bg="brand.400"
            animation={message.toolResult ? undefined : "pulse 1s infinite"}
          />
          <Text fontWeight="semibold" color="brand.300">
            🔧 {message.toolName}
          </Text>
        </HStack>
        {message.toolArgs && Object.keys(message.toolArgs).length > 0 && (
          <Box
            bg="rgba(0, 0, 0, 0.2)"
            p={2}
            borderRadius="md"
            mb={2}
            fontFamily="mono"
            fontSize="xs"
            color="text.muted"
          >
            <Text fontWeight="medium" color="text.default" mb={1}>
              Input:
            </Text>
            <Text whiteSpace="pre-wrap">{JSON.stringify(message.toolArgs, null, 2)}</Text>
          </Box>
        )}
        {message.toolResult && (
          <Box
            bg="rgba(0, 0, 0, 0.2)"
            p={2}
            borderRadius="md"
            fontFamily="mono"
            fontSize="xs"
            color="text.muted"
            maxH="200px"
            overflowY="auto"
          >
            <Text fontWeight="medium" color="text.default" mb={1}>
              Result:
            </Text>
            <Text whiteSpace="pre-wrap">{(message.toolResult as { text?: string })?.text}</Text>
          </Box>
        )}
        {!message.toolResult && (
          <HStack gap={2}>
            <Spinner size="xs" color="brand.400" />
            <Text color="text.muted" fontSize="xs">
              Running...
            </Text>
          </HStack>
        )}
      </MotionBox>
    );
  }

  return (
    <MotionBox
      initial={{ opacity: 0, x: isUser ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      alignSelf={isUser ? "flex-end" : "flex-start"}
      maxW="80%"
      px={4}
      py={3}
      borderRadius="2xl"
      {...(isUser
        ? {
            bg: "linear-gradient(135deg, rgba(49, 151, 149, 0.8), rgba(56, 178, 172, 0.6))",
            borderBottomRightRadius: "md",
          }
        : {
            ...glassStyles,
            borderBottomLeftRadius: "md",
          })}
    >
      <Text color={isUser ? "white" : "text.default"} whiteSpace="pre-wrap" lineHeight="tall">
        {message.content}
      </Text>
    </MotionBox>
  );
}

export default function AgentChat() {
  const router = useRouter();
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [previousResponseId, setPreviousResponseId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      const result = await (previousResponseId ? runAgent(trimmedInput, previousResponseId) : runAgent(trimmedInput));

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
        setPreviousResponseId(result.responseId);
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
    <VStack h="calc(100dvh - 64px)" gap={0}>
      {/* Header */}
      <MotionBox
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        w="full"
        px={4}
        py={4}
        {...glassStyles}
        borderRadius="2xl"
        mb={4}
      >
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
              <Text fontSize="sm" color="text.muted">
                Your nutrition assistant
              </Text>
            </Box>
          </HStack>
        </HStack>
      </MotionBox>

      {/* Messages area */}
      <Box
        flex={1}
        w="full"
        overflowY="auto"
        px={2}
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
              {...glassStyles}
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

      {/* Input area */}
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        w="full"
        p={4}
        {...glassStyles}
        borderRadius="2xl"
        mt={4}
      >
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
      </MotionBox>
    </VStack>
  );
}
