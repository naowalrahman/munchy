import { z } from "zod";
import type { Settings } from "../model";
import { normalizeFood, normalizeSearch } from "./normalize";
export interface Capabilities {
  cacheSeconds: number;
  configured: boolean;
}
export async function request(settings: Settings, path: string, signal?: AbortSignal): Promise<unknown> {
  if (!settings.proxyUrl) throw new Error("Connect your food search in Settings, or create a custom food.");
  const url = new URL(settings.proxyUrl);
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname))
    throw new Error("The food proxy must use HTTPS.");
  const response = await fetch(`${settings.proxyUrl.replace(/\/$/, "")}${path}`, {
    headers: { Authorization: `Bearer ${settings.proxyToken}` },
    signal,
    cache: "no-store",
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const e = z.object({ error: z.string() }).safeParse(body);
    throw new Error(e.success ? e.data.error : `Food search unavailable (${response.status}).`);
  }
  return body;
}
export const searchFoods = async (settings: Settings, q: string, page: number, signal?: AbortSignal) =>
  normalizeSearch(await request(settings, `/v1/search?q=${encodeURIComponent(q)}&page=${page}`, signal));
export async function fetchFood(settings: Settings, id: string) {
  const response = z
    .object({ data: z.unknown(), cacheSeconds: z.number().nonnegative() })
    .parse(await request(settings, `/v1/foods/${encodeURIComponent(id.replace(/^fs:/, ""))}`));
  return normalizeFood(response.data, response.cacheSeconds);
}
