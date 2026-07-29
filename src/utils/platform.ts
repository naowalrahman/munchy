/**
 * Capacitor sets `window.Capacitor` on native shells. Use for behavior that must
 * differ between the browser and Android/iOS WebView.
 */
export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
  );
}
