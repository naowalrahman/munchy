const UNIT_MAP: Record<string, string> = {
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

export function normalizeUnit(unit: string): string {
  return UNIT_MAP[unit.toLowerCase().trim()] || unit.toLowerCase().trim();
}
