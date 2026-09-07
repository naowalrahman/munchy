import { mkdir, copyFile } from "node:fs/promises";
await mkdir("public/vendor", { recursive: true });
for (const name of ["sql-wasm.js", "sql-wasm.wasm"])
  await copyFile(`node_modules/sql.js/dist/${name}`, `public/vendor/${name}`);
