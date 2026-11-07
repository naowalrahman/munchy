import { copyFile, mkdir } from "node:fs/promises";

await mkdir("public/vendor", { recursive: true });
for (const name of ["sql-wasm.js", "sql-wasm.wasm"])
  await copyFile(`node_modules/sql.js/dist/${name}`, `public/vendor/${name}`);

const worker = await Bun.build({
  entrypoints: ["src/utils/db/worker.ts"],
  outdir: "public",
  naming: "db-worker.js",
  target: "browser",
  format: "iife",
  minify: true,
});

if (!worker.success) throw new AggregateError(worker.logs, "Could not build the database worker.");
