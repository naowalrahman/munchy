import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { emptyNutrients, defaultSettings, type Food, type Snapshot } from "../src/utils/model";
import { parseQuantity, portionFactor, unitOptions } from "../src/utils/units";
import { normalizeFood, normalizeSearch } from "../src/utils/food/normalize";
import { recipeFood, totalNutrition } from "../src/utils/nutrition";
import { schema } from "../src/utils/db/schema";
import { cacheFood, dayFor, logEntries } from "../src/utils/db/operations";
import { today, shiftDate } from "../src/utils/dates";
const n = { ...emptyNutrients(), calories: 200, protein: 10, carbohydrate: 30, fat: 4 };
const food: Food = {
  id: "custom:1",
  name: "Test oats",
  source: "custom",
  fetchedAt: 1,
  cacheUntil: Number.MAX_SAFE_INTEGER,
  servings: [{ id: "100g", label: "100 g", unit: "g", amount: 100, nutrients: n }],
};
const portion = { food, servingId: "100g", quantity: 50, unit: "g", factor: 0.5 };
const data: Snapshot = { entries: [], foods: [], recipes: [], days: [], settings: defaultSettings, favorites: [] };
describe("quantities and dimensions", () => {
  test("decimals, fractions and mixed numbers", () => {
    expect(parseQuantity("1 1/2")).toBe(1.5);
    expect(parseQuantity("½")).toBe(0.5);
    expect(parseQuantity("1½")).toBe(1.5);
    expect(parseQuantity(".25")).toBe(0.25);
    for (const s of ["0", "-1", "Infinity", "1/0", "1e2", "hello"]) expect(() => parseQuantity(s)).toThrow();
  });
  test("weight conversions never assume density", () => {
    expect(portionFactor(1, "kg", food.servings[0])).toBe(10);
    expect(portionFactor(1, "oz", food.servings[0])).toBeCloseTo(0.283495);
    expect(() => portionFactor(1, "ml", food.servings[0])).toThrow();
    expect(unitOptions(food.servings[0])).not.toContain("cup (US)");
  });
  test("volume distinguishes US and metric cups", () => {
    const serving = { ...food.servings[0], unit: "ml" as const };
    expect(portionFactor(1, "cup (US)", serving)).toBeCloseTo(2.365882365);
    expect(portionFactor(1, "cup (metric)", serving)).toBe(2.5);
  });
});
test("missing nutrients remain unknown, partial totals carry coverage", () => {
  const result = totalNutrition([
    portion,
    { ...portion, food: { ...food, servings: [{ ...food.servings[0], nutrients: emptyNutrients() }] } },
  ]);
  expect(result.total.protein).toBe(5);
  expect(result.coverage.protein).toBe(1);
  expect(result.total.iron).toBeNull();
});
test("recipes scale servings and final cooked weight independently", () => {
  const result = recipeFood({
    id: "r1",
    name: "Oats",
    servings: 2,
    cookedGrams: 300,
    ingredients: [portion],
    instructions: "",
    tags: "",
    updatedAt: 1,
  });
  expect(result.servings[0].nutrients.calories).toBe(50);
  expect(result.servings[1].nutrients.calories).toBeCloseTo(100 / 3);
  expect(result.servings[1].unit).toBe("g");
});
test("FatSecret object/array normalization preserves missing vs zero and vitamin A micrograms", () => {
  const normalized = normalizeFood(
    {
      food: {
        food_id: "123",
        food_name: "Oats",
        servings: {
          serving: {
            serving_id: "1",
            serving_description: "100 g",
            metric_serving_amount: "100",
            metric_serving_unit: "g",
            calories: "0",
            vitamin_a: "28",
          },
        },
      },
    },
    3600
  );
  expect(normalized.servings[0].nutrients.calories).toBe(0);
  expect(normalized.servings[0].nutrients.iron).toBeNull();
  expect(normalized.servings[0].nutrients.vitamin_a).toBe(28);
  expect(
    normalizeSearch({ foods: { food: { food_id: "1", food_name: "Oats" }, total_results: "1" } }).foods
  ).toHaveLength(1);
  expect(normalizeSearch({ foods: {} }).foods).toHaveLength(0);
});
test("recent cache evicts beyond 200 but diary snapshots remain", () => {
  const db = new Database(":memory:");
  db.run(schema);
  for (let i = 0; i < 205; i++)
    for (const s of cacheFood({ ...food, id: `custom:${i}` })) db.run(s.sql, s.params ?? []);
  expect(db.query("SELECT count(*) as n FROM foods").get()).toEqual({ n: 200 });
  expect(db.query("SELECT id FROM foods WHERE id='custom:204'").get()).not.toBeNull();
  db.close();
});
test("future dates rejected; existing days preserve meal names", () => {
  expect(() => dayFor(data, shiftDate(today(), 1))).toThrow();
  const previous = {
    ...data,
    days: [{ date: today(), meals: ["Brunch"], water: 0, weight: null, note: "", complete: false }],
  };
  expect(dayFor(previous, today()).meals).toEqual(["Brunch"]);
  expect(() =>
    logEntries(previous, [{ ...portion, id: "1", date: today(), meal: "Breakfast", createdAt: 1 }])
  ).toThrow();
});

test("backup merge retains meals used by entries that are not replaced", async () => {
  const { exportBackup, importBackup } = await import("../src/utils/backup");
  const old = { ...portion, id: "old", date: today(), meal: "Brunch", createdAt: 1 };
  const current = {
    ...data,
    entries: [old],
    days: [{ date: today(), meals: ["Brunch"], water: 0, weight: null, note: "", complete: false }],
  };
  const incoming = {
    ...data,
    days: [{ date: today(), meals: ["Breakfast"], water: 0, weight: null, note: "", complete: false }],
  };
  const statements = importBackup(JSON.parse(exportBackup(incoming)), current);
  const db = new Database(":memory:");
  db.run(schema);
  for (const s of statements) db.run(s.sql, s.params ?? []);
  const day = db.query("SELECT payload FROM days").get() as { payload: string };
  expect(JSON.parse(day.payload).meals).toEqual(["Breakfast", "Brunch"]);
  db.close();
});
test("backup rejects inconsistent portion factors and future dates", async () => {
  const { exportBackup, importBackup } = await import("../src/utils/backup");
  const entry = { ...portion, id: "bad", date: today(), meal: "Breakfast", createdAt: 1, factor: 9 };
  const incoming = {
    ...data,
    entries: [entry],
    days: [{ date: today(), meals: ["Breakfast"], water: 0, weight: null, note: "", complete: false }],
  };
  expect(() => importBackup(JSON.parse(exportBackup(incoming)), data)).toThrow("inconsistent");
  incoming.entries = [];
  incoming.days[0].date = shiftDate(today(), 1);
  expect(() => importBackup(JSON.parse(exportBackup(incoming)), data)).toThrow();
});
test("older backups import and keep this device's Drive client ID", async () => {
  const { exportBackup, importBackup } = await import("../src/utils/backup");
  const raw = JSON.parse(exportBackup(data)) as { data: { settings: Record<string, unknown> } };
  delete raw.data.settings.driveClientId;
  const current = { ...data, settings: { ...defaultSettings, driveClientId: "mine.apps.googleusercontent.com" } };
  const statements = importBackup(raw, current);
  const db = new Database(":memory:");
  db.run(schema);
  for (const s of statements) db.run(s.sql, s.params ?? []);
  const row = db.query("SELECT payload FROM settings").get() as { payload: string };
  expect(JSON.parse(row.payload).driveClientId).toBe("mine.apps.googleusercontent.com");
  db.close();
});
