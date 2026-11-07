"use client";

import { useEffect, useState } from "react";
import { useStore } from "./Store";

/** Owns the service worker: registers it and offers to activate a waiting update. */
export function AppUpdate() {
  const { notify } = useStore();
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let disposed = false;
    if (process.env.NODE_ENV === "production")
      void navigator.serviceWorker
        .register("/sw.js")
        .catch(() => notify("Offline installation failed. Reload while online to retry."));
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
  }, [notify]);
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
