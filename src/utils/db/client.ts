import {
  daySchema,
  defaultSettings,
  entrySchema,
  foodSchema,
  recipeSchema,
  type Snapshot,
  settingsSchema,
} from "../model";
import type { Rows, Statement, WorkerRequest, WorkerResponse } from "./schema";

let worker: Worker | undefined;
let revision = 0;
const pending = new Map<string, { resolve: (r: Rows) => void; reject: (e: Error) => void }>();

function database() {
  if (!worker) {
    worker = new Worker("/db-worker.js");

    worker.onmessage = ({ data }: MessageEvent<WorkerResponse>) => {
      const request = pending.get(data.id);
      if (!request) return;
      pending.delete(data.id);
      if ("error" in data) request.reject(new Error(data.error));
      else request.resolve(data.result);
    };

    worker.onerror = () => {
      for (const p of pending.values()) p.reject(new Error("Could not open SQLite. Reload the app while online."));
      pending.clear();
      worker?.terminate();
      worker = undefined;
    };
  }

  return worker;
}

export async function transaction(statements: Statement[] = []): Promise<Snapshot> {
  const rows = await new Promise<Rows>((resolve, reject) => {
    const request: WorkerRequest = { id: crypto.randomUUID(), statements, revision };
    pending.set(request.id, { resolve, reject });
    database().postMessage(request);
  });

  revision = rows.revision;

  const payloads = (table: "entries" | "foods" | "recipes" | "days") =>
    rows[table].map((r): unknown => JSON.parse(String(r.payload)));

  const [settings] = rows.settings;

  return {
    entries: payloads("entries").map((e) => entrySchema.parse(e)),
    foods: payloads("foods").map((f) => foodSchema.parse(f)),
    recipes: payloads("recipes").map((r) => recipeSchema.parse(r)),
    days: payloads("days").map((d) => daySchema.parse(d)),
    settings: settings ? settingsSchema.parse(JSON.parse(String(settings.payload))) : defaultSettings,
    favorites: rows.favorites.map((r) => String(r.id)),
  };
}
