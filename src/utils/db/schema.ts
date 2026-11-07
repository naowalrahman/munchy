export const schema = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS entries(id TEXT PRIMARY KEY, date TEXT NOT NULL, meal TEXT NOT NULL, food_id TEXT NOT NULL, payload TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS entries_date ON entries(date, meal);
CREATE INDEX IF NOT EXISTS entries_food ON entries(food_id);
CREATE TABLE IF NOT EXISTS foods(id TEXT PRIMARY KEY, last_logged INTEGER NOT NULL, payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS recipes(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS days(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings(id TEXT PRIMARY KEY, payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS favorites(id TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS revision(value INTEGER NOT NULL);
INSERT INTO revision(value) SELECT 0 WHERE NOT EXISTS (SELECT 1 FROM revision);
`;

/** `migrations[i]` upgrades a version i + 1 database; `schema` alone is version 1. */
export const migrations = [
  // Recipes are derived from the recipes table, so their snapshots no longer occupy the recent-foods cache.
  "DELETE FROM foods WHERE id LIKE 'recipe:%'",
];

export const schemaVersion = 1 + migrations.length;

type Table = "entries" | "foods" | "recipes" | "days" | "settings" | "favorites";

export type Row = Record<string, string | number>;

export type Rows = Record<Table, Row[]> & { revision: number };

export interface Statement {
  sql: string;
  params?: (string | number | null)[];
}

export interface WorkerRequest {
  id: string;
  statements: Statement[];
  revision: number;
}

export type WorkerResponse = { id: string; result: Rows } | { id: string; error: string };
