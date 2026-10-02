import { BrowserMultiFormatOneDReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

export async function startScanner(video: HTMLVideoElement, signal: AbortSignal, onScan: (value: string) => void) {
  // ZXing 0.23's UPC-E expansion helper can loop indefinitely; keep that format disabled.
  const hints = new Map<DecodeHintType, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A]],
  ]);
  const reader = new BrowserMultiFormatOneDReader(hints, { delayBetweenScanAttempts: 250 });
  signal.throwIfAborted();
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
  });
  const stopTracks = () => {
    stream.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  };
  if (signal.aborted) {
    stopTracks();
    signal.throwIfAborted();
  }
  signal.addEventListener("abort", stopTracks, { once: true });
  try {
    const controls = await reader.decodeFromStream(stream, video, (result) => {
      if (!result || signal.aborted) return;
      onScan(result.getText());
    });
    if (signal.aborted) controls.stop();
    else signal.addEventListener("abort", () => controls.stop(), { once: true });
  } catch (error) {
    stopTracks();
    throw error;
  }
}
