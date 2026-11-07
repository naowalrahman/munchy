import { afterEach, expect, spyOn, test } from "bun:test";
import { UpstreamError } from "../proxy/src/fatsecret";
import { createHandler, type ProxyConfig } from "../proxy/src/handler";
import { fetchBarcode } from "../src/utils/food/api";
import { defaultSettings } from "../src/utils/model";

afterEach(() => {
  spyOn(globalThis, "fetch").mockRestore();
});

const token = "x".repeat(48);
let calls = 0;

const get = async () => {
  calls++;
  return { foods: {} };
};

function make(overrides: Partial<ProxyConfig> = {}) {
  return createHandler({
    tokens: [token],
    origins: ["https://munchy.test"],
    cacheSeconds: 0,
    configured: true,
    get,
    consume: () => true,
    ...overrides,
  });
}

const req = (path: string, headers: Record<string, string> = {}) =>
  new Request(`https://proxy.test${path}`, {
    headers: { Authorization: `Bearer ${token}`, Origin: "https://munchy.test", ...headers },
  });

const food = {
  food: {
    food_id: "123",
    food_name: "Test food",
    servings: { serving: { serving_id: "1", serving_description: "1 serving", calories: "120" } },
  },
};

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
  expect((await make({ consume: () => false })(req("/v1/search?q=oats"))).status).toBe(429);
  const h = make();
  for (let i = 0; i < 60; i++) expect((await h(req("/v1/capabilities"))).status).toBe(200);
  expect((await h(req("/v1/capabilities"))).status).toBe(429);
});

test("barcode lookup uses one quota unit and normalizes details with the configured storage duration", async () => {
  const requests: { path: string; params: Record<string, string> }[] = [];
  let consumed = 0;

  const h = make({
    cacheSeconds: 3600,
    consume: () => {
      consumed++;
      return true;
    },
    get: async (path, params) => {
      requests.push({ path, params });
      return food;
    },
  });

  spyOn(globalThis, "fetch").mockImplementation(
    Object.assign(
      async (input: Parameters<typeof fetch>[0], init?: RequestInit) => h(new Request(String(input), init)),
      {
        preconnect: globalThis.fetch.preconnect,
      }
    )
  );

  const result = await fetchBarcode(
    { ...defaultSettings, proxyUrl: "https://proxy.test", proxyToken: token },
    " 012345678905 "
  );

  expect(requests).toEqual([{ path: "food/barcode/find-by-id/v2", params: { barcode: "0012345678905" } }]);
  expect(consumed).toBe(1);
  expect(result.id).toBe("fs:123");
  expect(result.servings[0].nutrients.calories).toBe(120);
  expect(result.cacheUntil - result.fetchedAt).toBeCloseTo(3600000, -1);
});

test("barcode endpoint enforces auth, origin, validation, and quota before upstream", async () => {
  calls = 0;
  let consumed = 0;

  const h = make({
    consume: () => {
      consumed++;
      return false;
    },
  });

  const barcode = (value: string, headers: Record<string, string> = {}) => req(`/v1/barcode?barcode=${value}`, headers);
  expect((await h(barcode("012345678905", { Authorization: "" }))).status).toBe(401);
  expect((await h(barcode("012345678905", { Origin: "https://evil.test" }))).status).toBe(403);
  expect((await h(barcode("012345678906"))).status).toBe(400);
  expect(consumed).toBe(0);
  expect((await h(barcode("012345678905"))).status).toBe(429);
  expect(consumed).toBe(1);
  expect(calls).toBe(0);
});

test("barcode route maps FatSecret codes to actionable errors; other routes keep the generic status", async () => {
  for (const [code, status, message] of [
    [211, 404, "No food found"],
    [14, 503, "Barcode lookup is not enabled"],
  ] as const) {
    const h = make({
      get: async () => {
        throw new UpstreamError("x", 502, code);
      },
    });

    const barcode = await h(req("/v1/barcode?barcode=012345678905"));
    expect(barcode.status).toBe(status);
    expect((await barcode.json()).error).toContain(message);
    const search = await h(req("/v1/search?q=oats"));
    expect(search.status).toBe(502);
    expect(await search.json()).toEqual({ error: "x" });
  }
});
