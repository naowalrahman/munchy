import { Box, Code, Heading, Link, List, Table, Text, Separator, Flex, Badge } from "@chakra-ui/react";
import { Streamdown } from "streamdown";
import React from "react";
import { liquidGlassStyles } from "@/theme";
import { codeToHtml } from "shiki";

const components = {
  h1: ({ children }: { children: React.ReactNode }) => (
    <Heading as="h1" size="2xl" mt={6} mb={4} color="text.default">
      {children}
    </Heading>
  ),
  h2: ({ children }: { children: React.ReactNode }) => (
    <Heading as="h2" size="xl" mt={5} mb={3} color="text.default">
      {children}
    </Heading>
  ),
  h3: ({ children }: { children: React.ReactNode }) => (
    <Heading as="h3" size="lg" mt={4} mb={2} color="text.default">
      {children}
    </Heading>
  ),
  h4: ({ children }: { children: React.ReactNode }) => (
    <Heading as="h4" size="md" mt={3} mb={2} color="text.default">
      {children}
    </Heading>
  ),
  p: ({ children }: { children: React.ReactNode }) => (
    <Text mb={4} lineHeight="relaxed" color="text.default">
      {children}
    </Text>
  ),
  ul: ({ children }: { children: React.ReactNode }) => (
    <List.Root mb={4} ps={5} listStyle="disc">
      {children}
    </List.Root>
  ),
  ol: ({ children }: { children: React.ReactNode }) => (
    <List.Root as="ol" mb={4} ps={5} listStyle="decimal">
      {children}
    </List.Root>
  ),
  li: ({ children }: { children: React.ReactNode }) => (
    <List.Item mb={1} color="text.default" _marker={{ color: "brand.400" }}>
      {children}
    </List.Item>
  ),
  a: ({ href, children }: { href?: string; children: React.ReactNode }) => (
    <Link href={href} color="brand.400" fontWeight="medium" textDecoration="underline" _hover={{ color: "brand.300" }}>
      {children}
    </Link>
  ),
  blockquote: ({ children }: { children: React.ReactNode }) => (
    <Box
      borderLeftWidth="4px"
      borderColor="brand.500"
      pl={4}
      py={1}
      my={4}
      bg="rgba(49, 151, 149, 0.1)"
      borderRadius="sm"
      fontStyle="italic"
      color="text.muted"
    >
      {children}
    </Box>
  ),
  code: ({ children, className }: { children: string; className?: string }) => {
    const language = className?.replace("language-", "") || "";
    const isInline = !language;

    if (isInline) {
      return (
        <Code variant="outline" size="md" px={1}>
          {children}
        </Code>
      );
    }

    return (
      <Box my={4} position="relative" borderRadius="md" overflow="hidden" border="1px solid rgba(255,255,255,0.1)">
        {language && (
          <Flex
            bg="rgba(255,255,255,0.05)"
            px={3}
            py={1}
            justify="space-between"
            align="center"
            borderBottom="1px solid rgba(255,255,255,0.1)"
          >
            <Badge variant="plain" color="text.muted" fontSize="10px" textTransform="uppercase" letterSpacing="wider">
              {language}
            </Badge>
          </Flex>
        )}
        <Box as="pre" p={4} bg="rgba(0,0,0,0.3)" overflowX="auto" className={className}>
          {children}
        </Box>
      </Box>
    );
  },
  hr: () => <Separator my={6} borderColor="rgba(255,255,255,0.1)" />,
  table: ({ children }: { children: React.ReactNode }) => (
    <Box overflowX="auto" my={6} borderRadius="xl" {...liquidGlassStyles} overflow="hidden">
      <Table.Root size="sm" variant="line" interactive>
        {children}
      </Table.Root>
    </Box>
  ),
  thead: ({ children }: { children: React.ReactNode }) => (
    <Table.Header bg="rgba(255, 255, 255, 0.05)" borderBottom="1px solid rgba(255, 255, 255, 0.1)">
      {children}
    </Table.Header>
  ),
  tbody: ({ children }: { children: React.ReactNode }) => <Table.Body>{children}</Table.Body>,
  tr: ({ children }: { children: React.ReactNode }) => (
    <Table.Row borderBottom="1px solid rgba(255, 255, 255, 0.05)" _hover={{ bg: "rgba(255, 255, 255, 0.02)" }}>
      {children}
    </Table.Row>
  ),
  th: ({ children }: { children: React.ReactNode }) => (
    <Table.ColumnHeader
      p={4}
      fontWeight="bold"
      color="brand.400"
      textAlign="left"
      textTransform="uppercase"
      fontSize="xs"
      letterSpacing="wider"
    >
      {children}
    </Table.ColumnHeader>
  ),
  td: ({ children }: { children: React.ReactNode }) => (
    <Table.Cell p={4} color="text.default" fontSize="sm">
      {children}
    </Table.Cell>
  ),
  strong: ({ children }: { children: React.ReactNode }) => (
    <Text as="strong" fontWeight="bold" color="brand.300">
      {children}
    </Text>
  ),
  em: ({ children }: { children: React.ReactNode }) => (
    <Text as="em" fontStyle="italic" color="text.muted">
      {children}
    </Text>
  ),
};

export function Markdown({ children }: { children: string }) {
  return (
    <Streamdown mode="static" components={components as any} shikiTheme={["github-light", "github-dark"]}>
      {children}
    </Streamdown>
  );
}
