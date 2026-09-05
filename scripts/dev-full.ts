const upstream = (process.env.MUNCHY_UPSTREAM ?? "https://munchy.129.80.164.67.sslip.io").replace(/\/$/, "");
const port = Number(process.env.MUNCHY_RELAY_PORT ?? 8787);
const appOrigin = process.env.MUNCHY_APP_ORIGIN ?? "http://localhost:3000";
const file = Bun.file("secrets/app-access-token.txt");
const token = (process.env.MUNCHY_APP_TOKEN ?? ((await file.exists()) ? await file.text() : "")).trim();
if (!token)
  throw new Error("Set MUNCHY_APP_TOKEN or put the proxy's app access token in secrets/app-access-token.txt.");

const cors = {
  "Access-Control-Allow-Origin": appOrigin,
  Vary: "Origin",
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};
const relay = Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS")
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization",
          "Access-Control-Max-Age": "600",
        },
      });
    if (req.method !== "GET")
      return new Response(JSON.stringify({ error: "Method not allowed." }), { status: 405, headers: cors });
    if (url.pathname !== "/health" && !url.pathname.startsWith("/v1/"))
      return new Response(JSON.stringify({ error: "Not found." }), { status: 404, headers: cors });
    const supplied = req.headers
      .get("authorization")
      ?.replace(/^Bearer\s*/i, "")
      .trim();
    try {
      // The browser's Origin never reaches the deployed proxy, whose allowlist holds only the production origin.
      const response = await fetch(`${upstream}${url.pathname}${url.search}`, {
        headers: { Authorization: `Bearer ${supplied || token}` },
        signal: AbortSignal.timeout(20000),
      });
      return new Response(await response.text(), { status: response.status, headers: cors });
    } catch {
      return new Response(JSON.stringify({ error: `The food proxy at ${upstream} is unreachable.` }), {
        status: 502,
        headers: cors,
      });
    }
  },
});
console.log(`Food search relay: http://localhost:${relay.port} -> ${upstream}`);
console.log(
  `In Settings, save proxy address http://localhost:${relay.port}; the app access token may stay blank here.`
);
const dev = Bun.spawn(["bun", "--bun", "next", "dev"], { stdio: ["inherit", "inherit", "inherit"] });
const code = await dev.exited;
await relay.stop(true);
process.exit(code);

export {};
