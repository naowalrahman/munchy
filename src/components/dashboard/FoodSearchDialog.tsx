"use client";

import { Box, VStack, HStack, Text, Input, Button, Heading, Spinner, IconButton } from "@chakra-ui/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { searchFoods, getFoodNutrition, lookupBarcode, FoodSearchResult, NutritionalData } from "@/app/actions/food";
import { motion, AnimatePresence } from "framer-motion";
import { IoClose, IoSearch, IoBarcodeOutline, IoCamera, IoVideocamOff } from "react-icons/io5";
import { logFoodEntry } from "@/app/actions/foodLog";
import { toaster } from "@/components/ui/toaster";
import dynamic from "next/dynamic";
import type { NutritionFactsDrawerProps } from "./NutritionFactsDrawer";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { IoTrash } from "react-icons/io5";

export interface FoodSearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  mealName: string;
  onFoodAdded: () => void;
}

type InputMode = "search" | "scan";
type StagedFood = {
  id: string;
  nutritionData: NutritionalData;
  servingAmount: number;
  servingUnit: string;
  barcode: string | null;
};

const MotionBox = motion.create(Box);
const MotionVStack = motion.create(VStack);

const NutritionFactsDrawer = dynamic<NutritionFactsDrawerProps>(
  () => import("./NutritionFactsDrawer").then((mod) => mod.NutritionFactsDrawer),
  { ssr: false }
);

const SCANNER_ELEMENT_ID = "barcode-scanner";

export function FoodSearchDialog({ isOpen, onClose, mealName, onFoodAdded }: FoodSearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFood, setSelectedFood] = useState<NutritionalData | null>(null);
  const [isNutritionDrawerOpen, setIsNutritionDrawerOpen] = useState(false);
  const [isLoadingNutrition, setIsLoadingNutrition] = useState(false);
  const [stagedItems, setStagedItems] = useState<StagedFood[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Barcode scanning state
  const [inputMode, setInputMode] = useState<InputMode>("search");
  const [isScannerReady, setIsScannerReady] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isStartingScanner, setIsStartingScanner] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null); // Track barcode for scanned foods
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasProcessedBarcode = useRef(false);
  const isInitializingRef = useRef(false);

  // Stop and clear the scanner
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop();
        }
        // Clear the scanner to reset its internal state
        scannerRef.current.clear();
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
    }
    setIsScannerReady(false);
    isInitializingRef.current = false;
  }, []);

  // Handle successful barcode scan
  const handleBarcodeScan = useCallback(async (decodedText: string) => {
    if (hasProcessedBarcode.current) return;
    hasProcessedBarcode.current = true;

    // Stop scanner
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    setIsScannerReady(false);

    // Look up the barcode
    setIsLoadingNutrition(true);
    try {
      const nutritionData = await lookupBarcode(decodedText);
      setSelectedFood(nutritionData);
      setScannedBarcode(decodedText); // Store the barcode for later use when logging
      setIsNutritionDrawerOpen(true);
    } catch (error) {
      console.error("Barcode lookup error:", error);
      toaster.create({
        title: "Product not found",
        description: error instanceof Error ? error.message : "Could not find product. Try searching by name.",
        type: "error",
      });
      hasProcessedBarcode.current = false;
      isInitializingRef.current = false;
    } finally {
      setIsLoadingNutrition(false);
    }
  }, []);

  // Start the scanner
  const startScanner = useCallback(async () => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    setIsStartingScanner(true);
    setScannerError(null);
    hasProcessedBarcode.current = false;

    try {
      // Check requirements
      if (!window.isSecureContext) {
        throw new Error("Camera requires HTTPS. Please use a secure connection.");
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not available in this browser.");
      }

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());

      // Clean up existing scanner
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
            await scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch {
          /* ignore cleanup errors */
        }
      }

      // Create scanner and get cameras (reuse instance for faster init)
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(SCANNER_ELEMENT_ID);
      }

      const cameras = await Html5Qrcode.getCameras();

      if (!cameras || cameras.length === 0) {
        throw new Error("No camera found.");
      }

      // Prefer non‑ultrawide back camera on mobile, otherwise default/front
      const preferredCamera = (() => {
        const withoutUltra = cameras.filter((c) => !/ultra|wide/i.test(c.label));
        const backEnv = withoutUltra.find((c) => /back|rear|environment/i.test(c.label));
        if (backEnv) return backEnv;
        const anyBack = cameras.find((c) => /back|rear|environment/i.test(c.label));
        if (anyBack) return anyBack;
        const defaultCam = withoutUltra[0];
        return defaultCam || cameras[0];
      })();

      // Start scanning
      // disableFlip: false ensures scanner tries both orientations (helps with mirrored webcams)
      // Wider scan box for easier barcode capture
      await scannerRef.current.start(
        preferredCamera.id,
        {
          fps: 15,
          qrbox: { width: 300, height: 150 },
          disableFlip: false,
        },
        handleBarcodeScan,
        () => {} // Ignore per-frame errors
      );

      setIsScannerReady(true);
    } catch (error) {
      console.error("Scanner error:", error);
      const message = error instanceof Error ? error.message : "Failed to start camera";
      setScannerError(
        message.includes("NotAllowed")
          ? "Camera permission denied."
          : message.includes("NotFound")
            ? "No camera found."
            : message.includes("NotReadable")
              ? "Camera in use by another app."
              : message
      );
    } finally {
      setIsStartingScanner(false);
      isInitializingRef.current = false;
    }
  }, [handleBarcodeScan]);

  // Initialize scanner when switching to scan mode
  useEffect(() => {
    if (inputMode === "scan" && isOpen) {
      // Small delay to ensure DOM element is ready
      const timer = setTimeout(() => {
        startScanner();
      }, 50);

      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [inputMode, isOpen, startScanner, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
            scannerRef.current.stop().catch((error) => {
              console.error("Error stopping scanner on unmount:", error);
            });
          }
          scannerRef.current.clear();
        } catch (error) {
          console.error("Error during scanner cleanup on unmount:", error);
        }
        scannerRef.current = null;
      }
    };
  }, []);

  // Debounced search
  useEffect(() => {
    if (inputMode !== "search") return;

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchFoods(searchQuery, 20);
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
        toaster.create({
          title: "Search failed",
          description: error instanceof Error ? error.message : "Failed to search foods",
          type: "error",
        });
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, inputMode]);

  const handleFoodClick = async (food: FoodSearchResult) => {
    setIsLoadingNutrition(true);
    try {
      const nutritionData = await getFoodNutrition(food.fdcId);
      setSelectedFood(nutritionData);
      setScannedBarcode(null); // Clear barcode since this is from search, not scan
      setIsNutritionDrawerOpen(true);
    } catch (error) {
      console.error("Error loading nutrition:", error);
      toaster.create({
        title: "Failed to load nutrition",
        description: error instanceof Error ? error.message : "Could not load nutrition information",
        type: "error",
      });
    } finally {
      setIsLoadingNutrition(false);
    }
  };

  // Helper function to normalize unit names for comparison
  const normalizeUnit = (unit: string): string => {
    const unitMap: Record<string, string> = {
      g: "g",
      gram: "g",
      grams: "g",
      oz: "oz",
      ounce: "oz",
      ounces: "oz",
      lb: "lb",
      pound: "lb",
      pounds: "lb",
      ml: "ml",
      milliliter: "ml",
      milliliters: "ml",
      cup: "cup",
      cups: "cup",
      tbsp: "tbsp",
      tablespoon: "tbsp",
      tablespoons: "tbsp",
      tsp: "tsp",
      teaspoon: "tsp",
      teaspoons: "tsp",
      piece: "piece",
      pieces: "piece",
      slice: "slice",
      slices: "slice",
    };

    const normalized = unit.toLowerCase().trim();
    return unitMap[normalized] || normalized;
  };

  const stageFood = (servingAmount: number, servingUnit: string, nutritionData: NutritionalData) => {
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setStagedItems((prev) => [
      ...prev,
      { id, nutritionData, servingAmount, servingUnit, barcode: scannedBarcode || null },
    ]);

    toaster.create({
      title: "Staged item",
      description: `${nutritionData.description} added to pending list`,
      type: "success",
    });

    // Reset selection; drawer onClose will restart scanner when needed
    setScannedBarcode(null);
    setSelectedFood(null);
    setIsNutritionDrawerOpen(false);
  };

  const handleRemoveStaged = (id: string) => {
    setStagedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveAll = async () => {
    if (stagedItems.length === 0) return;
    setIsSaving(true);

    const savedIds = new Set<string>();

    try {
      for (const item of stagedItems) {
        let multiplier = item.servingAmount;
        const servingSizeForCalc = item.nutritionData.servingSize || 100;
        const servingSizeUnitNormalized = normalizeUnit(item.nutritionData.servingSizeUnit || "g");
        const currentUnitNormalized = normalizeUnit(item.servingUnit);

        if (servingSizeForCalc > 0) {
          if (currentUnitNormalized === "serving") {
            multiplier = item.servingAmount;
          } else if (currentUnitNormalized === servingSizeUnitNormalized) {
            multiplier = item.servingAmount / servingSizeForCalc;
          }
        }

        const response = await logFoodEntry({
          meal_name: mealName,
          food_fdc_id: item.nutritionData.fdcId,
          food_description: item.nutritionData.description,
          serving_amount: item.servingAmount,
          serving_unit: item.servingUnit,
          calories: item.nutritionData.calories * multiplier,
          protein: item.nutritionData.protein ? item.nutritionData.protein.amount * multiplier : null,
          carbohydrates: item.nutritionData.carbohydrates ? item.nutritionData.carbohydrates.amount * multiplier : null,
          total_fat: item.nutritionData.totalFat ? item.nutritionData.totalFat.amount * multiplier : null,
          barcode: item.barcode,
        });

        if (!response.success) {
          throw new Error(response.error || "Failed to save an item");
        }

        savedIds.add(item.id);
      }

      toaster.create({
        title: "Foods added",
        description: `${stagedItems.length} item(s) added to ${mealName}`,
        type: "success",
      });
      setStagedItems([]);
      setScannedBarcode(null);
      onFoodAdded();
      onClose();
    } catch (error) {
      console.error("Error saving staged items:", error);

      // Keep only items that were not saved to avoid duplicate re-saves
      if (savedIds.size > 0) {
        setStagedItems((prev) => prev.filter((item) => !savedIds.has(item.id)));
      }

      toaster.create({
        title: savedIds.size > 0 ? "Partially saved" : "Save failed",
        description:
          error instanceof Error
            ? error.message
            : savedIds.size > 0
              ? "Some items were saved before an error occurred."
              : "Could not save items",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDrawerClose = () => {
    setIsNutritionDrawerOpen(false);
    setSelectedFood(null);
    setScannedBarcode(null);
    hasProcessedBarcode.current = false;
    isInitializingRef.current = false;
    if (inputMode === "scan" && isOpen) {
      startScanner();
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    // Scanner cleanup is handled by the effect
    setSearchQuery("");
    setSearchResults([]);
    setSelectedFood(null);
    setScannedBarcode(null); // Clear barcode when closing
    setIsNutritionDrawerOpen(false);
    setStagedItems([]);
    setInputMode("search");
    setScannerError(null);
    hasProcessedBarcode.current = false;
    isInitializingRef.current = false;
    onClose();
  };

  const handleModeToggle = (newMode: InputMode) => {
    if (newMode === inputMode || isSaving) return;

    // Scanner start/stop is handled by the effect when inputMode changes
    setInputMode(newMode);
    setScannerError(null);
    hasProcessedBarcode.current = false;
    isInitializingRef.current = false;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <MotionBox
            position="fixed"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="blackAlpha.700"
            zIndex={999}
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* Dialog */}
      <AnimatePresence>
        {isOpen && (
          <MotionBox
            position="fixed"
            top="50%"
            left="50%"
            w={{ base: "95vw", md: "600px" }}
            maxH="85vh"
            bg="background.canvas"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="border.default"
            boxShadow="2xl"
            zIndex={1000}
            p={6}
            initial={{ x: "-50%", y: "-50%", opacity: 0, scale: 0.95 }}
            animate={{ x: "-50%", y: "-50%", opacity: 1, scale: 1 }}
            exit={{ x: "-50%", y: "-50%", opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            overflowY="auto"
          >
            <VStack align="stretch" gap={4} h="full">
              {/* Header */}
              <HStack justify="space-between" align="center">
                <Heading size="lg" color="text.default">
                  {inputMode === "search" ? "Search Foods" : "Scan Barcode"}
                </Heading>
                <Button onClick={handleClose} variant="ghost" size="sm" colorPalette="gray">
                  <IoClose size={24} />
                </Button>
              </HStack>

              <Text color="text.muted" fontSize="sm">
                Add to:{" "}
                <Text as="span" color="brand.500" fontWeight="semibold">
                  {mealName}
                </Text>
              </Text>

              {/* Mode Toggle */}
              <HStack gap={2}>
                <Button
                  flex={1}
                  variant={inputMode === "search" ? "solid" : "outline"}
                  colorPalette={inputMode === "search" ? "brand" : "gray"}
                  onClick={() => handleModeToggle("search")}
                  size="md"
                >
                  <IoSearch size={18} />
                  <Text ml={2}>Search</Text>
                </Button>
                <Button
                  flex={1}
                  variant={inputMode === "scan" ? "solid" : "outline"}
                  colorPalette={inputMode === "scan" ? "brand" : "gray"}
                  onClick={() => handleModeToggle("scan")}
                  size="md"
                >
                  <IoBarcodeOutline size={18} />
                  <Text ml={2}>Scan</Text>
                </Button>
              </HStack>

              {/* Search Mode */}
              {inputMode === "search" && (
                <>
                  {/* Search Input */}
                  <Box position="relative" w="full">
                    <Box
                      position="absolute"
                      left={3}
                      top="50%"
                      transform="translateY(-50%)"
                      color="text.muted"
                      zIndex={1}
                    >
                      <IoSearch size={20} />
                    </Box>
                    <Input
                      placeholder="Search for foods..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      size="lg"
                      pl={10}
                      bg="background.subtle"
                      borderColor="border.default"
                      _hover={{ borderColor: "brand.500" }}
                      _focus={{
                        borderColor: "brand.500",
                        boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)",
                      }}
                    />
                  </Box>

                  {/* Loading State */}
                  {isSearching && (
                    <HStack justify="center" py={8}>
                      <Spinner size="lg" colorPalette="brand" />
                    </HStack>
                  )}

                  {/* Search Results */}
                  {!isSearching && searchResults.length > 0 && (
                    <Box
                      flex="1"
                      overflowY="auto"
                      maxH="400px"
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="border.default"
                    >
                      <MotionVStack
                        align="stretch"
                        gap={0}
                        initial="hidden"
                        animate="visible"
                        variants={{
                          visible: {
                            transition: {
                              staggerChildren: 0.03,
                            },
                          },
                        }}
                      >
                        {searchResults.map((food, index) => (
                          <MotionBox
                            key={food.fdcId}
                            p={4}
                            borderBottomWidth={index < searchResults.length - 1 ? "1px" : "0"}
                            borderColor="border.default"
                            cursor="pointer"
                            _hover={{
                              bg: "background.subtle",
                              transform: "translateX(4px)",
                              borderLeftWidth: "3px",
                              borderLeftColor: "brand.500",
                            }}
                            onClick={() => handleFoodClick(food)}
                            variants={{
                              hidden: { opacity: 0, x: -20 },
                              visible: { opacity: 1, x: 0 },
                            }}
                            transition={{ duration: 0.2 }}
                          >
                            <VStack align="start" gap={1}>
                              <Text color="text.default" fontWeight="medium">
                                {food.description}
                              </Text>
                              {food.brandName && (
                                <Text fontSize="sm" color="text.muted">
                                  {food.brandName}
                                </Text>
                              )}
                              {food.servingSize && food.servingSizeUnit && (
                                <Text fontSize="xs" color="text.muted">
                                  Serving: {food.servingSize} {food.servingSizeUnit}
                                </Text>
                              )}
                            </VStack>
                          </MotionBox>
                        ))}
                      </MotionVStack>
                    </Box>
                  )}

                  {/* No Results */}
                  {!isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
                    <Box py={8} textAlign="center">
                      <Text color="text.muted">No foods found. Try a different search term.</Text>
                    </Box>
                  )}

                  {/* Empty State */}
                  {!isSearching && searchQuery.trim().length < 2 && (
                    <Box py={8} textAlign="center">
                      <Text color="text.muted">Start typing to search for foods</Text>
                    </Box>
                  )}
                </>
              )}

              {/* Scan Mode */}
              {inputMode === "scan" && (
                <VStack gap={4} align="stretch">
                  {/* Scanner Container */}
                  <Box position="relative" borderRadius="lg" overflow="hidden" bg="black" minH="280px">
                    {/* Scanner Element */}
                    <Box
                      id={SCANNER_ELEMENT_ID}
                      w="full"
                      h="full"
                      css={{
                        "& video": {
                          borderRadius: "0.5rem",
                          transform: "scaleX(1) !important", // Prevent mirroring
                        },
                        "& img": {
                          display: "none",
                        },
                      }}
                    />

                    {/* Scanner Frame Overlay */}
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

                    {/* Loading Overlay */}
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

                    {/* Error State */}
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
                        <Button size="sm" colorPalette="brand" onClick={startScanner}>
                          <IoCamera size={16} />
                          <Text ml={2}>Try Again</Text>
                        </Button>
                      </Box>
                    )}
                  </Box>

                  {/* Scanner Instructions */}
                  <Text color="text.muted" fontSize="sm" textAlign="center">
                    Point your camera at a product barcode
                  </Text>
                </VStack>
              )}

              {/* Staged Items */}
              <VStack align="stretch" gap={2} borderWidth="1px" borderColor="border.default" borderRadius="md" p={3}>
                <HStack justify="space-between">
                  <Heading size="sm" color="text.default">
                    Staged items
                  </Heading>
                  <Text fontSize="xs" color="text.muted">
                    Saved when you press Save
                  </Text>
                </HStack>
                {stagedItems.length === 0 ? (
                  <Text fontSize="sm" color="text.muted">
                    Nothing staged yet. Search or scan to add items.
                  </Text>
                ) : (
                  <VStack align="stretch" gap={2} maxH="180px" overflowY="auto">
                    {stagedItems.map((item) => (
                      <HStack
                        key={item.id}
                        justify="space-between"
                        align="start"
                        borderWidth="1px"
                        borderColor="border.default"
                        borderRadius="md"
                        p={2}
                        bg="background.subtle"
                      >
                        <Box>
                          <Text fontWeight="semibold" color="text.default">
                            {item.nutritionData.description}
                          </Text>
                          {item.nutritionData.brandName && (
                            <Text fontSize="xs" color="text.muted">
                              {item.nutritionData.brandName}
                            </Text>
                          )}
                          <Text fontSize="sm" color="text.default">
                            {item.servingAmount} {item.servingUnit}
                            {item.barcode ? " · scanned" : ""}
                          </Text>
                        </Box>
                        <IconButton
                          aria-label="Remove staged item"
                          size="xs"
                          variant="ghost"
                          colorPalette="red"
                          onClick={() => handleRemoveStaged(item.id)}
                        >
                          <IoTrash />
                        </IconButton>
                      </HStack>
                    ))}
                  </VStack>
                )}
              </VStack>

              {/* Actions */}
              <HStack gap={3} pt={1}>
                <Button
                  variant="outline"
                  colorPalette="gray"
                  onClick={handleClose}
                  flex={1}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  colorPalette="brand"
                  flex={1}
                  onClick={handleSaveAll}
                  loading={isSaving}
                  disabled={stagedItems.length === 0 || isSaving}
                >
                  Save {stagedItems.length > 0 ? `(${stagedItems.length})` : ""}
                </Button>
              </HStack>
            </VStack>
          </MotionBox>
        )}
      </AnimatePresence>

      {/* Nutrition Facts Drawer */}
      {isLoadingNutrition ? (
        <Box position="fixed" top="50%" left="50%" transform="translate(-50%, -50%)" zIndex={1002}>
          <Spinner size="xl" colorPalette="brand" />
        </Box>
      ) : (
        isNutritionDrawerOpen &&
        selectedFood && (
          <NutritionFactsDrawer
            key={selectedFood.fdcId}
            nutritionData={selectedFood}
            mealName={mealName}
            isOpen={isNutritionDrawerOpen}
            onClose={handleDrawerClose}
            onAddToMeal={stageFood}
          />
        )
      )}
    </>
  );
}
