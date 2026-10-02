"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "../shell/Store";
import { barcodeSchema, type Food } from "@/utils/model";
import { fetchBarcode } from "@/utils/food/api";

export function BarcodeScanner({ onPick, onBack }: { onPick: (food: Food) => void; onBack: () => void }) {
  const { data } = useStore();
  const [value, setValue] = useState("");
  const [camera, setCamera] = useState<"off" | "starting" | "on">("off");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const cameraAbort = useRef<AbortController | null>(null);
  const lookupAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    const pause = () => {
      if (document.hidden) {
        cameraAbort.current?.abort();
        setCamera("off");
      }
    };
    document.addEventListener("visibilitychange", pause);
    return () => {
      document.removeEventListener("visibilitychange", pause);
      cameraAbort.current?.abort();
      lookupAbort.current?.abort();
    };
  }, []);

  function stopCamera() {
    cameraAbort.current?.abort();
    setCamera("off");
  }

  async function lookup(raw: string) {
    if (lookupAbort.current && !lookupAbort.current.signal.aborted) return;
    const barcode = barcodeSchema.safeParse(raw.trim());
    if (!barcode.success) {
      setError(barcode.error.issues[0].message);
      return;
    }
    stopCamera();
    setValue(raw);
    setError("");
    setBusy(true);
    const controller = new AbortController();
    lookupAbort.current = controller;
    try {
      const food = await fetchBarcode(data.settings, barcode.data, controller.signal);
      if (!controller.signal.aborted) onPick(food);
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Barcode lookup failed.");
    } finally {
      if (!controller.signal.aborted) {
        lookupAbort.current = null;
        setBusy(false);
      }
    }
  }

  async function startCamera() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("Camera scanning needs HTTPS and a browser with camera access. You can enter the barcode below.");
      return;
    }
    stopCamera();
    const controller = new AbortController();
    cameraAbort.current = controller;
    setCamera("starting");
    setError("");
    try {
      const { startScanner } = await import("@/utils/food/scanner");
      if (controller.signal.aborted || !video.current) return;
      await startScanner(video.current, controller.signal, (barcode) => void lookup(barcode));
      if (!controller.signal.aborted) setCamera("on");
    } catch (e) {
      if (controller.signal.aborted) return;
      stopCamera();
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Camera access was denied. Allow it in your browser settings, or enter the barcode below."
          : "Could not start the camera. Check that it is available, or enter the barcode below."
      );
    }
  }

  return (
    <div className="form-stack barcode-scanner">
      <button className="text-button" onClick={onBack}>
        Back to foods
      </button>
      <p className="muted">Point your camera at the barcode on the package. Keep it steady and well lit.</p>
      <div className="barcode-preview" hidden={camera === "off"}>
        <video ref={video} autoPlay muted playsInline aria-label="Barcode camera preview" />
        <div className="barcode-guide" aria-hidden="true" />
      </div>
      {camera === "off" ? (
        <button onClick={() => void startCamera()} disabled={busy || !data.settings.proxyUrl}>
          Start camera
        </button>
      ) : (
        <button onClick={stopCamera}>Stop camera</button>
      )}
      {camera !== "off" && (
        <p className="muted" role="status">
          {camera === "starting" ? "Starting camera…" : "Looking for a barcode…"}
        </p>
      )}
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          void lookup(value);
        }}
      >
        <label>
          Barcode number
          <input
            autoFocus
            inputMode="numeric"
            autoComplete="off"
            placeholder="8, 12, or 13 digits"
            value={value}
            disabled={busy}
            onChange={(e) => setValue(e.target.value)}
            aria-describedby="barcode-help"
          />
        </label>
        <p id="barcode-help" className="muted">
          You can also type the number printed beneath the barcode.
        </p>
        <button className="primary" disabled={busy || !value.trim() || !data.settings.proxyUrl}>
          Find food
        </button>
      </form>
      {!data.settings.proxyUrl && <p className="error">Connect your food search in Settings to look up barcodes.</p>}
      {busy && (
        <p className="muted" role="status">
          Finding food…
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
