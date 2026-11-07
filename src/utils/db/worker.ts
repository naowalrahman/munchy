// Built to public/db-worker.js by scripts/assets.ts and run as a classic worker beside the vendored sql.js.
import {
  migrations,
  type Row,
  type Rows,
  type Statement,
  schema,
  schemaVersion,
  type WorkerRequest,
  type WorkerResponse,
} from "./schema";

interface Database {
  exec(sql: string): { values: unknown[][] }[];
  run(sql: string, params?: Statement["params"]): void;
  prepare(sql: string): { step(): boolean; getAsObject(): Row; free(): void };
  export(): Uint8Array;
  close(): void;
}

declare function importScripts(...urls: string[]): void;
declare function initSqlJs(config: {
  locateFile: (name: string) => string;
}): Promise<{ Database: new (data?: Uint8Array) => Database }>;

importScripts("/vendor/sql-wasm.js");
const engine = initSqlJs({ locateFile: (name) => `/vendor/${name}` });

const storage = new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open("munchy-local", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("sqlite");
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

async function load() {
  const store = await storage;
  return new Promise<Uint8Array | undefined>((resolve, reject) => {
    const request = store.transaction("sqlite").objectStore("sqlite").get("main");
    request.onsuccess = () => resolve(request.result instanceof Uint8Array ? request.result : undefined);
    request.onerror = () => reject(request.error);
  });
}

async function persist(data: Uint8Array) {
  const store = await storage;
  return new Promise<void>((resolve, reject) => {
    const tx = store.transaction("sqlite", "readwrite");
    tx.objectStore("sqlite").put(data, "main");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Storage write aborted."));
  });
}

const scalar = (db: Database, sql: string) => Number(db.exec(sql)[0]?.values[0]?.[0] ?? 0);

function select(db: Database, sql: string) {
  const rows: Row[] = [];
  const stmt = db.prepare(sql);
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();

  return rows;
}

async function transact({ statements, revision: expected }: WorkerRequest): Promise<Rows> {
  const SQL = await engine;
  const saved = await load();
  const db = new SQL.Database(saved);

  try {
    const version = scalar(db, "PRAGMA user_version");
    if (version > schemaVersion)
      throw new Error("This diary was created by a newer Munchy version. Update the app before opening it.");

    db.run(schema);
    for (const sql of migrations.slice(Math.max(0, version - 1))) db.run(sql);
    db.run(`PRAGMA user_version = ${schemaVersion}`);

    const revision = scalar(db, "SELECT value FROM revision");
    if (statements.length && expected !== revision)
      throw new Error("The diary changed in another window. Review the latest values and try again.");

    db.run("BEGIN");
    for (const { sql, params } of statements) db.run(sql, params ?? []);
    if (statements.length) db.run("UPDATE revision SET value=value+1");
    db.run("COMMIT");

    const all = (table: string, order = "") => select(db, `SELECT * FROM ${table}${order}`);

    const rows: Rows = {
      entries: all("entries"),
      foods: all("foods", " ORDER BY last_logged DESC, rowid DESC"),
      recipes: all("recipes"),
      days: all("days"),
      settings: all("settings"),
      favorites: all("favorites"),
      revision: revision + (statements.length ? 1 : 0),
    };

    if (statements.length || !saved || version !== schemaVersion) await persist(db.export());

    return rows;
  } finally {
    db.close();
  }
}

async function respond({ data }: MessageEvent<WorkerRequest>) {
  const reply = (response: WorkerResponse) => postMessage(response);

  try {
    if (!("locks" in navigator)) throw new Error("This browser lacks safe local storage locking. Update your browser.");
    reply({ id: data.id, result: await navigator.locks.request("munchy-sqlite", () => transact(data)) });
  } catch (error) {
    reply({ id: data.id, error: error instanceof Error ? error.message : "Local database failed." });
  }
}

addEventListener("message", (event: MessageEvent<WorkerRequest>) => void respond(event));
