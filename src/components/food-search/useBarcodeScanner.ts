import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { lookupBarcode, NutritionalData } from "@/app/actions/food";
import { toaster } from "@/components/ui/toaster";
import { SCANNER_ELEMENT_ID } from "./types";

interface UseBarcodeScannerParams {
  isOpen: boolean;
  enabled: boolean;
  onNutritionLoaded: (data: NutritionalData, barcode: string) => void;
  setIsLoadingNutrition: (value: boolean) => void;
}

interface UseBarcodeScannerResult {
  isScannerReady: boolean;
  scannerError: string | null;
  isStartingScanner: boolean;
  startScanner: () => Promise<void>;
  resetScannerState: () => void;
}

export function useBarcodeScanner({
  isOpen,
  enabled,
  onNutritionLoaded,
  setIsLoadingNutrition,
}: UseBarcodeScannerParams): UseBarcodeScannerResult {
  const [isScannerReady, setIsScannerReady] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isStartingScanner, setIsStartingScanner] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasProcessedBarcode = useRef(false);
  const isInitializingRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
    }
    setIsScannerReady(false);
    isInitializingRef.current = false;
  }, []);

  const handleBarcodeScan = useCallback(
    async (decodedText: string) => {
      if (hasProcessedBarcode.current) return;
      hasProcessedBarcode.current = true;

      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          /* ignore */
        }
      }
      setIsScannerReady(false);

      setIsLoadingNutrition(true);
      try {
        const nutritionData = await lookupBarcode(decodedText);
        onNutritionLoaded(nutritionData, decodedText);
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
    },
    [onNutritionLoaded, setIsLoadingNutrition]
  );

  const startScanner = useCallback(async () => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    setIsStartingScanner(true);
    setScannerError(null);
    hasProcessedBarcode.current = false;

    try {
      if (!window.isSecureContext) {
        throw new Error("Camera requires HTTPS. Please use a secure connection.");
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not available in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());

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

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(SCANNER_ELEMENT_ID);
      }

      const cameras = await Html5Qrcode.getCameras();

      if (!cameras || cameras.length === 0) {
        throw new Error("No camera found.");
      }

      const preferredCamera = (() => {
        const withoutUltra = cameras.filter((c) => !/ultra|wide/i.test(c.label));
        const backEnv = withoutUltra.find((c) => /back|rear|environment/i.test(c.label));
        if (backEnv) return backEnv;
        const anyBack = cameras.find((c) => /back|rear|environment/i.test(c.label));
        if (anyBack) return anyBack;
        const defaultCam = withoutUltra[0];
        return defaultCam || cameras[0];
      })();

      await scannerRef.current.start(
        preferredCamera.id,
        {
          fps: 15,
          qrbox: { width: 300, height: 150 },
          disableFlip: false,
        },
        handleBarcodeScan,
        () => {}
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

  useEffect(() => {
    if (enabled && isOpen) {
      const timer = setTimeout(() => {
        startScanner();
      }, 50);

      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    }

    stopScanner();
    hasProcessedBarcode.current = false;
  }, [enabled, isOpen, startScanner, stopScanner]);

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

  const resetScannerState = () => {
    setScannerError(null);
    hasProcessedBarcode.current = false;
    isInitializingRef.current = false;
  };

  return {
    isScannerReady,
    scannerError,
    isStartingScanner,
    startScanner,
    resetScannerState,
  };
}

