import { resolve, sep } from "node:path";
const root = resolve("out");
Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  hostname: "127.0.0.1",
  async fetch(req) {
    const path = decodeURIComponent(new URL(req.url).pathname);
    const filePath = resolve(root, `.${path.endsWith("/") ? `${path}index.html` : path}`);
    if (!filePath.startsWith(root + sep)) return new Response("Not found", { status: 404 });
    const file = Bun.file(filePath);
    return (await file.exists())
      ? new Response(file, { headers: { "Cache-Control": path === "/sw.js" ? "no-cache" : "no-cache" } })
      : new Response("Not found", { status: 404 });
  },
});
console.log("Munchy is available at http://localhost:3000");
