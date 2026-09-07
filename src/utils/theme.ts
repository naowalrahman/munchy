export type ThemeSetting = "system" | "light" | "dark";
const KEY = "munchy-theme";
const query = "(prefers-color-scheme: dark)";
export function readThemeSetting(): ThemeSetting {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}
export function resolveTheme(setting: ThemeSetting): "light" | "dark" {
  if (setting !== "system") return setting;
  return typeof matchMedia === "function" && matchMedia(query).matches ? "dark" : "light";
}
export function applyTheme(setting: ThemeSetting) {
  document.documentElement.dataset.theme = resolveTheme(setting);
}
export function saveThemeSetting(setting: ThemeSetting) {
  try {
    if (setting === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, setting);
  } catch {}
  applyTheme(setting);
}
/** Keeps the page in step with the OS while the setting is "system". Returns an unsubscribe. */
export function watchSystemTheme() {
  if (typeof matchMedia !== "function") return () => {};
  const media = matchMedia(query);
  const update = () => applyTheme(readThemeSetting());
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}
/** Runs before first paint so the page never flashes the wrong theme. Mirrors readThemeSetting + applyTheme. */
export const themeBootScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(KEY)});var d=t==="dark"||(t!=="light"&&matchMedia(${JSON.stringify(query)}).matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}})()`;
