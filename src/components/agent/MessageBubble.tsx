import { DisplayMessage } from "@/utils/agent/model";
import { liquidGlassStyles } from "@/theme";
import { Box, Collapsible, HStack, Icon, Spinner, Text } from "@chakra-ui/react";
import { MotionBox } from "@/components/ui/motion-box";
import { LuChevronDown, LuChevronRight } from "react-icons/lu";
import { Markdown } from "@/components/Markdown";

function ToolCallDetails({ summary, details }: { summary: string; details?: string }) {
  return (
    <Collapsible.Root>
      <Collapsible.Trigger
        py={1}
        px={2}
        mb={1}
        borderRadius="md"
        bg="rgba(0, 0, 0, 0.2)"
        cursor="pointer"
        display="flex"
        alignItems="center"
        gap={1}
        fontSize="xs"
        fontWeight="medium"
        color="text.default"
        _hover={{ bg: "rgba(0, 0, 0, 0.3)" }}
      >
        <Collapsible.Context>
          {({ open }) => (
            <>
              <Icon asChild boxSize={3} color="brand.400">
                {open ? <LuChevronDown /> : <LuChevronRight />}
              </Icon>
              {summary}
            </>
          )}
        </Collapsible.Context>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <Box bg="rgba(0, 0, 0, 0.2)" p={2} borderRadius="md" mb={2} fontFamily="mono" fontSize="xs" color="text.muted">
          <Text whiteSpace="pre-wrap">{details ?? `No ${summary}`}</Text>
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

export function MessageBubble({ message, index }: { message: DisplayMessage; index: number }) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";

  if (isTool) {
    return (
      <MotionBox
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        alignSelf="flex-start"
        maxW="80%"
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
          <ToolCallDetails summary="Input" details={JSON.stringify(message.toolArgs, null, 2)} />
        )}

        {message.toolResult && (
          <ToolCallDetails summary="Result" details={(message.toolResult as { text?: string })?.text} />
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
            ...liquidGlassStyles,
            borderBottomLeftRadius: "md",
          })}
    >
      {isUser ? (
        <Text color="white" whiteSpace="pre-wrap" lineHeight="tall">
          {message.content}
        </Text>
      ) : (
        <Box>
          <Markdown>{message.content}</Markdown>
        </Box>
      )}
    </MotionBox>
  );
}
