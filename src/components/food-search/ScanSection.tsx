import { Box, Button, Spinner, Text, VStack } from "@chakra-ui/react";
import { IoCamera, IoVideocamOff } from "react-icons/io5";
import { SCANNER_ELEMENT_ID } from "./types";

interface ScanSectionProps {
  isScannerReady: boolean;
  isStartingScanner: boolean;
  scannerError: string | null;
  onRetry: () => void;
}

export function ScanSection({ isScannerReady, isStartingScanner, scannerError, onRetry }: ScanSectionProps) {
  return (
    <VStack gap={4} align="stretch">
      <Box position="relative" borderRadius="lg" overflow="hidden" bg="black" minH="280px">
        <Box
          id={SCANNER_ELEMENT_ID}
          w="full"
          h="full"
          css={{
            "& video": {
              borderRadius: "0.5rem",
              transform: "scaleX(1) !important",
            },
            "& img": {
              display: "none",
            },
          }}
        />

        {isScannerReady && (
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            w="300px"
            h="150px"
            borderWidth="3px"
            borderColor="brand.500"
            borderRadius="md"
            pointerEvents="none"
          />
        )}

        {isStartingScanner && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="blackAlpha.700"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexDirection="column"
            gap={3}
          >
            <Spinner size="lg" colorPalette="brand" />
            <Text color="white" fontSize="sm">
              Starting camera...
            </Text>
          </Box>
        )}

        {scannerError && !isStartingScanner && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="background.subtle"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexDirection="column"
            gap={3}
            p={4}
          >
            <IoVideocamOff size={48} color="var(--chakra-colors-text-muted)" />
            <Text color="text.muted" textAlign="center" fontSize="sm">
              {scannerError}
            </Text>
            <Button size="sm" colorPalette="brand" onClick={onRetry}>
              <IoCamera size={16} />
              <Text ml={2}>Try Again</Text>
            </Button>
          </Box>
        )}
      </Box>

      <Text color="text.muted" fontSize="sm" textAlign="center">
        Point your camera at a product barcode
      </Text>
    </VStack>
  );
}
