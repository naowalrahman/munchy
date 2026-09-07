import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { createFatSecret } from "./fatsecret";
import { createHandler } from "./handler";
const clientId = process.env.FATSECRET_CLIENT_ID ?? "";
const clientSecret = process.env.FATSECRET_CLIENT_SECRET ?? "";
const tokens = (process.env.APP_ACCESS_TOKENS ?? "").split(",").filter(Boolean);
if (!tokens.length || tokens.some((t) => t.length < 32))
  throw new Error("APP_ACCESS_TOKENS needs at least one random token of 32 or more characters.");
const origins = (process.env.ALLOWED_ORIGINS ?? "").split(",").filter(Boolean);
if (!origins.length) throw new Error("Set ALLOWED_ORIGINS to the exact app origin(s).");
const cacheSeconds = Number(process.env.FATSECRET_CACHE_SECONDS ?? 0);
if (!Number.isFinite(cacheSeconds) || cacheSeconds < 0) throw new Error("Invalid cache duration.");
if (cacheSeconds && process.env.FATSECRET_STORAGE_PERMISSION !== "granted")
  throw new Error("Enable caching only after FatSecret has granted storage permission.");
const dailyLimit = Number(process.env.DAILY_API_LIMIT ?? 4500);
if (!Number.isInteger(dailyLimit) || dailyLimit < 1) throw new Error("Invalid API limit.");
const dir = process.env.DATA_DIR ?? "proxy/data";
mkdirSync(dir, { recursive: true });
const db = new Database(`${dir}/quota.sqlite`);
db.run("PRAGMA journal_mode=WAL");
db.run("CREATE TABLE IF NOT EXISTS usage(day TEXT PRIMARY KEY, count INTEGER NOT NULL)");
const consume = db.transaction(() => {
  const day = new Date().toISOString().slice(0, 10);
  db.run("INSERT OR IGNORE INTO usage VALUES (?,0)", [day]);
  return db.run("UPDATE usage SET count=count+1 WHERE day=? AND count<?", [day, dailyLimit]).changes > 0;
});
const handler = createHandler({
  tokens,
  origins,
  cacheSeconds,
  configured: !!(clientId && clientSecret),
  get: createFatSecret(clientId, clientSecret, process.env.FATSECRET_SCOPE ?? "basic"),
  consume,
});
const server = Bun.serve({
  hostname: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 8787),
  fetch: handler,
});
console.log(`Munchy food proxy listening on ${server.hostname}:${server.port}`);
