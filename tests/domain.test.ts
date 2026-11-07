import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { exportBackup, importStatements, parseBackup } from "../src/utils/backup";
import { shiftDate, today } from "../src/utils/dates";
import { cacheFood, copyRecipe, dayFor, logEntries } from "../src/utils/db/operations";
import { migrations, type Statement, schema } from "../src/utils/db/schema";
import { normalizeFood, normalizeSearch } from "../src/utils/food/normalize";
import {
  type Day,
  defaultSettings,
  emptyNutrients,
  entrySchema,
  type Food,
  type Recipe,
  type Snapshot,
} from "../src/utils/model";
import { nutrientSources, portionNutrition, recipeFood, totalNutrition } from "../src/utils/nutrition";
import { parseQuantity, portionFactor, unitOptions } from "../src/utils/units";

function apply(statements: Statement[]) {
  const db = new Database(":memory:");
  db.run(schema);
  for (const s of statements) db.run(s.sql, s.params ?? []);

  return db;
}

const payload = (db: Database, table: string) =>
  JSON.parse(db.query<{ payload: string }, []>(`SELECT payload FROM ${table}`).get()?.payload ?? "null");

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

  const [portionServing, weightServing] = result.servings;
  expect(portionServing.nutrients.calories).toBe(50);
  expect(weightServing?.nutrients.calories).toBeCloseTo(100 / 3);
  expect(weightServing?.unit).toBe("g");
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
  const db = apply(Array.from({ length: 205 }, (_, i) => cacheFood({ ...food, id: `custom:${i}` })).flat());
  expect(db.query("SELECT count(*) as n FROM foods").get()).toEqual({ n: 200 });
  expect(db.query("SELECT id FROM foods WHERE id='custom:204'").get()).not.toBeNull();
  db.close();
});

const recipe: Recipe = {
  id: "r1",
  name: "x".repeat(200),
  servings: 1,
  cookedGrams: null,
  ingredients: [portion],
  instructions: "",
  tags: "",
  updatedAt: 1,
};

const partialRecipe: Recipe = {
  ...recipe,
  name: "Partial nutrition",
  servings: 2,
  cookedGrams: 400,
  ingredients: [
    {
      ...portion,
      food: {
        ...food,
        servings: [
          {
            ...food.servings[0],
            nutrients: { ...n, potassium: 600, calcium: 120, iron: 4, vitamin_c: 0 },
          },
        ],
      },
    },
    portion,
  ],
};

test("logged recipe servings and cooked weights retain partial micronutrients, zeroes and unknowns", () => {
  const prepared = recipeFood(partialRecipe);
  const day = dayFor(data, today());

  for (const [servingId, quantity, unit, factor] of [
    ["portion", 1, "serving", 1],
    ["weight", 200, "g", 2],
  ] as const) {
    const db = apply(
      logEntries(day, [{ portion: { food: prepared, servingId, quantity, unit, factor }, meal: "Breakfast" }])
    );

    const entry = entrySchema.parse(payload(db, "entries"));
    const values = portionNutrition(entry);
    expect(values.potassium).toBe(150);
    expect(values.calcium).toBe(30);
    expect(values.iron).toBe(1);
    expect(values.vitamin_c).toBe(0);
    expect(values.vitamin_d).toBeNull();
    const totals = totalNutrition([entry]);
    expect(totals.total.potassium).toBe(150);
    expect(totals.coverage.potassium).toBe(1);
    expect(totals.coverage.calories).toBe(2);
    expect(totals.count).toBe(2);
    expect(nutrientSources([entry], "potassium").ranked[0]?.partial).toBe(true);
    expect(nutrientSources([entry], "vitamin_c").zero[0]?.partial).toBe(true);
    expect(nutrientSources([entry], "vitamin_d").missing).toEqual([entry]);
    db.close();
  }
});

test("nested recipes preserve ingredient coverage rather than making partial values complete", () => {
  const inner = {
    ...portion,
    food: recipeFood(partialRecipe),
    servingId: "portion",
    factor: 1,
    unit: "serving",
    quantity: 1,
  };

  const outer = recipeFood({ ...recipe, ingredients: [inner, portion] });
  const result = totalNutrition([{ ...inner, food: outer }]);
  expect(result.total.potassium).toBe(150);
  expect(result.coverage.potassium).toBe(1);
  expect(result.coverage.calories).toBe(3);
  expect(result.count).toBe(3);
  expect(result.total.vitamin_c).toBe(0);
  expect(result.total.vitamin_d).toBeNull();
});

test("recipes stay out of the recent-foods cache, including rows cached by older versions", () => {
  expect(cacheFood(recipeFood(recipe))).toEqual([]);
  const db = apply([...cacheFood(food), { sql: "INSERT INTO foods VALUES('recipe:r1', 1, '{}')" }]);
  for (const sql of migrations) db.run(sql);
  expect(db.query("SELECT id FROM foods").all()).toEqual([{ id: food.id }]);
  db.close();
});
test("duplicating a recipe with a maximum-length name stays readable", () => {
  const db = apply([copyRecipe(recipe)]);
  const copy = payload(db, "recipes");
  expect(copy.name).toHaveLength(200);
  expect(copy.name.endsWith(" (copy)")).toBe(true);
  db.close();
});
test("future dates rejected; existing days preserve meal names", () => {
  expect(() => logEntries(dayFor(data, shiftDate(today(), 1)), [{ portion, meal: "Breakfast" }])).toThrow();

  const previous: Snapshot = {
    ...data,
    days: [{ date: today(), meals: ["Brunch"], water: 0, weight: null, note: "", complete: false }],
  };

  expect(dayFor(previous, today()).meals).toEqual(["Brunch"]);
  expect(() => logEntries(dayFor(previous, today()), [{ portion, meal: "Breakfast" }])).toThrow();
});

test("backup merge retains meals used by entries that are not replaced", () => {
  const old = { ...portion, id: "old", date: today(), meal: "Brunch", createdAt: 1 };

  const current: Snapshot = {
    ...data,
    entries: [old],
    days: [{ date: today(), meals: ["Brunch"], water: 0, weight: null, note: "", complete: false }],
  };

  const incoming: Snapshot = {
    ...data,
    days: [{ date: today(), meals: ["Breakfast"], water: 0, weight: null, note: "", complete: false }],
  };

  const db = apply(importStatements(parseBackup(JSON.parse(exportBackup(incoming))), current));
  expect(payload(db, "days").meals).toEqual(["Breakfast", "Brunch"]);
  db.close();
});
test("backup rejects inconsistent portion factors and future dates", () => {
  const entry = { ...portion, id: "bad", date: today(), meal: "Breakfast", createdAt: 1, factor: 9 };
  const day: Day = { date: today(), meals: ["Breakfast"], water: 0, weight: null, note: "", complete: false };
  const incoming: Snapshot = { ...data, entries: [entry], days: [day] };
  expect(() => parseBackup(JSON.parse(exportBackup(incoming)))).toThrow("inconsistent");
  incoming.entries = [];
  incoming.days = [{ ...day, date: shiftDate(today(), 1) }];
  expect(() => parseBackup(JSON.parse(exportBackup(incoming)))).toThrow();
});
test("older backups import and keep this device's Drive client ID", () => {
  const raw = JSON.parse(exportBackup(data));
  delete raw.data.settings.driveClientId;
  const current = { ...data, settings: { ...defaultSettings, driveClientId: "mine.apps.googleusercontent.com" } };
  const db = apply(importStatements(parseBackup(raw), current));
  expect(payload(db, "settings").driveClientId).toBe("mine.apps.googleusercontent.com");
  db.close();
});
