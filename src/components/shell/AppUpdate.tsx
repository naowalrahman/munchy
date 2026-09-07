"use client";
import { useEffect, useState } from "react";

export function AppUpdate() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let disposed = false;
    void navigator.serviceWorker.ready.then((registration) => {
      if (disposed) return;
      setWaiting(registration.waiting);
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (!disposed && worker.state === "installed" && navigator.serviceWorker.controller) setWaiting(worker);
        });
      });
    });
    return () => {
      disposed = true;
    };
  }, []);
  if (!waiting) return null;
  return (
    <button
      className="update-app"
      onClick={() => {
        navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), { once: true });
        waiting.postMessage({ type: "ACTIVATE_UPDATE" });
      }}
    >
      Update ready, reload now
    </button>
  );
}
