import { expect, test } from "bun:test";
import { createHandler } from "../proxy/src/handler";
const token = "x".repeat(48);
let calls = 0;
const get = async () => {
  calls++;
  return { foods: {} };
};
function make(consume = () => true) {
  return createHandler({
    tokens: [token],
    origins: ["https://munchy.test"],
    cacheSeconds: 0,
    configured: true,
    get,
    consume,
  });
}
const req = (path: string, headers: Record<string, string> = {}) =>
  new Request(`https://proxy.test${path}`, {
    headers: { Authorization: `Bearer ${token}`, Origin: "https://munchy.test", ...headers },
  });
test("rejects unauthenticated and foreign-origin requests without calling upstream", async () => {
  calls = 0;
  const h = make();
  expect((await h(req("/v1/search?q=oats", { Authorization: "" }))).status).toBe(401);
  expect((await h(req("/v1/search?q=oats", { Origin: "https://evil.test" }))).status).toBe(403);
  expect(calls).toBe(0);
});
test("allowlist blocks arbitrary methods, paths and invalid input", async () => {
  const h = make();
  expect((await h(req("/v1/search?q=x"))).status).toBe(400);
  expect((await h(req("/v1/search?q=oats&page=-1"))).status).toBe(400);
  expect((await h(req("/v1/foods/https://evil.test"))).status).toBe(404);
  expect((await h(new Request("https://proxy.test/v1/search", { method: "POST" }))).status).toBe(405);
});
test("valid requests and Basic capabilities", async () => {
  const h = make();
  const r = await h(req("/v1/search?q=oats"));
  expect(r.status).toBe(200);
  expect(r.headers.get("Access-Control-Allow-Origin")).toBe("https://munchy.test");
  const body = await (await h(req("/v1/capabilities"))).json();
  expect(body.cacheSeconds).toBe(0);
});
test("daily quota stops calls and rate limit survives repeated requests", async () => {
  expect((await make(() => false)(req("/v1/search?q=oats"))).status).toBe(429);
  const h = make();
  for (let i = 0; i < 60; i++) expect((await h(req("/v1/capabilities"))).status).toBe(200);
  expect((await h(req("/v1/capabilities"))).status).toBe(429);
});
