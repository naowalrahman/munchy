import { schema, type Statement } from "./schema";
import {
  defaultSettings,
  entrySchema,
  foodSchema,
  recipeSchema,
  daySchema,
  settingsSchema,
  type Snapshot,
} from "../model";
type Rows = Record<string, Record<string, string | number>[]>;
let worker: Worker | undefined;
let revision = 0;
const pending = new Map<string, { resolve: (r: Rows) => void; reject: (e: Error) => void }>();
function database() {
  if (!worker) {
    worker = new Worker("/db-worker.js");
    worker.onmessage = ({ data }: { data: { id: string; result: Rows; error?: string } }) => {
      const request = pending.get(data.id);
      if (!request) return;
      pending.delete(data.id);
      if (data.error) request.reject(new Error(data.error));
      else request.resolve(data.result);
    };
    worker.onerror = () => {
      pending.forEach((p) => p.reject(new Error("Could not open SQLite. Reload the app while online.")));
      pending.clear();
      worker?.terminate();
      worker = undefined;
    };
  }
  return worker;
}
export async function transaction(statements: Statement[] = []): Promise<Snapshot> {
  const rows = await new Promise<Rows>((resolve, reject) => {
    const id = crypto.randomUUID();
    pending.set(id, { resolve, reject });
    database().postMessage({ id, statements, schema, revision });
  });
  revision = Number(rows.revision[0].value);
  const json = (table: string) => rows[table].map((r) => JSON.parse(String(r.payload)) as unknown);
  return {
    entries: json("entries").map((e) => entrySchema.parse(e)),
    foods: json("foods").map((f) => foodSchema.parse(f)),
    recipes: json("recipes").map((r) => recipeSchema.parse(r)),
    days: json("days").map((d) => daySchema.parse(d)),
    settings: rows.settings.length
      ? settingsSchema.parse(JSON.parse(String(rows.settings[0].payload)))
      : defaultSettings,
    favorites: rows.favorites.map((r) => String(r.id)),
  };
}
export const upsert = (table: "recipes" | "days" | "settings", id: string, value: unknown): Statement => ({
  sql: `INSERT OR REPLACE INTO ${table}(id,payload) VALUES(?,?)`,
  params: [id, JSON.stringify(value)],
});
