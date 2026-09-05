/* global importScripts, initSqlJs */
importScripts("/vendor/sql-wasm.js");
const engine = initSqlJs({ locateFile: (name) => `/vendor/${name}` });
const storage = new Promise((resolve, reject) => {
  const request = indexedDB.open("munchy-local", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("sqlite");
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
async function bytes() {
  const store = await storage;
  return new Promise((resolve, reject) => {
    const req = store.transaction("sqlite").objectStore("sqlite").get("main");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function persist(data) {
  const store = await storage;
  return new Promise((resolve, reject) => {
    const tx = store.transaction("sqlite", "readwrite");
    tx.objectStore("sqlite").put(data, "main");
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Storage write aborted."));
  });
}
self.onmessage = async ({ data }) => {
  try {
    if (!navigator.locks) throw new Error("This browser lacks safe local storage locking. Update your browser.");
    const result = await navigator.locks.request("munchy-sqlite", async () => {
      const SQL = await engine;
      const saved = await bytes();
      const db = new SQL.Database(saved);
      try {
        const version = db.exec("PRAGMA user_version")[0]?.values[0][0] ?? 0;
        if (version > 1)
          throw new Error("This diary was created by a newer Munchy version. Update the app before opening it.");
        db.run(data.schema);
        const revision = Number(db.exec("SELECT value FROM revision")[0].values[0][0]);
        if (data.statements?.length && data.revision !== revision)
          throw new Error("The diary changed in another window. Review the latest values and try again.");
        db.run("BEGIN");
        for (const statement of data.statements ?? []) db.run(statement.sql, statement.params ?? []);
        if (data.statements?.length) db.run("UPDATE revision SET value=value+1");
        db.run("COMMIT");
        const rows = { revision: [{ value: revision + (data.statements?.length ? 1 : 0) }] };
        for (const table of ["entries", "foods", "recipes", "days", "settings", "favorites"]) {
          rows[table] = [];
          const stmt = db.prepare(
            `SELECT * FROM ${table}${table === "foods" ? " ORDER BY last_logged DESC, rowid DESC" : ""}`
          );
          while (stmt.step()) rows[table].push(stmt.getAsObject());
          stmt.free();
        }
        if (data.statements?.length || !saved) await persist(db.export());
        return rows;
      } finally {
        db.close();
      }
    });
    self.postMessage({ id: data.id, result });
  } catch (error) {
    self.postMessage({ id: data.id, error: error instanceof Error ? error.message : "Local database failed." });
  }
};
