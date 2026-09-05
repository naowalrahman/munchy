import type { Serving } from "./model";
const mass: Record<string, number> = { g: 1, kg: 1000, oz: 28.349523125, lb: 453.59237 };
const volume: Record<string, number> = {
  ml: 1,
  l: 1000,
  "tsp (US)": 4.92892159375,
  "tbsp (US)": 14.78676478125,
  "cup (US)": 236.5882365,
  "fl oz (US)": 29.5735295625,
  "cup (metric)": 250,
};
export function parseQuantity(text: string) {
  const normalized = text.trim().replace(/½/g, " 1/2").replace(/¼/g, " 1/4").replace(/¾/g, " 3/4").trim();
  const mixed = normalized.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
  const n = mixed
    ? Number(mixed[1] ?? 0) + Number(mixed[2]) / Number(mixed[3])
    : /^\d*\.?\d+$/.test(normalized)
      ? Number(normalized)
      : NaN;
  if (!Number.isFinite(n) || n <= 0 || n > 100000)
    throw new Error("Enter a positive amount, such as 150, 0.5 or 1 1/2.");
  return n;
}
export function unitOptions(serving: Serving) {
  return ["serving", ...Object.keys(serving.unit === "g" ? mass : serving.unit === "ml" ? volume : {})];
}
export function portionFactor(quantity: number, unit: string, serving: Serving) {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Amount must be positive.");
  if (unit === "serving") return quantity;
  const conversions = serving.unit === "g" ? mass : serving.unit === "ml" ? volume : {};
  if (!(unit in conversions)) throw new Error("This food has no verified conversion for that unit.");
  return (quantity * conversions[unit]) / serving.amount;
}
