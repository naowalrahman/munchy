import { afterEach, expect, spyOn, test } from "bun:test";
import { barcodeSchema, defaultSettings } from "../src/utils/model";
import { fetchBarcode } from "../src/utils/food/api";
import { createHandler } from "../proxy/src/handler";
import { createFatSecret, UpstreamError } from "../proxy/src/fatsecret";

afterEach(() => {
  spyOn(globalThis, "fetch").mockRestore();
});
function mockFetch(fn: (input: Parameters<typeof fetch>[0], init?: RequestInit) => Promise<Response>) {
  return spyOn(globalThis, "fetch").mockImplementation(Object.assign(fn, { preconnect: globalThis.fetch.preconnect }));
}

test("barcodes preserve leading zeros, pad to GTIN-13, and reject bad lengths or checksums", () => {
  expect(barcodeSchema.parse("012345678905")).toBe("0012345678905");
  expect(barcodeSchema.parse("96385074")).toBe("0000096385074");
  expect(barcodeSchema.parse("4006381333931")).toBe("4006381333931");
  for (const value of ["", "1234567", "12345678901234", "4006381333932", "01234567890a", "1e11", " 96385074"])
    expect(barcodeSchema.safeParse(value).success).toBe(false);
});

const token = "x".repeat(48);
const req = (barcode: string, access = token) =>
  new Request(`https://proxy.test/v1/barcode?barcode=${barcode}`, {
    headers: { Authorization: `Bearer ${access}`, Origin: "https://munchy.test" },
  });
const food = {
  food: {
    food_id: "123",
    food_name: "Test food",
    servings: {
      serving: {
        serving_id: "1",
        serving_description: "1 serving",
        calories: "120",
      },
    },
  },
};

test("barcode lookup uses one quota unit and normalizes details with the configured storage duration", async () => {
  const calls: { path: string; params: Record<string, string> }[] = [];
  let consumed = 0;
  const handler = createHandler({
    tokens: [token],
    origins: ["https://munchy.test"],
    configured: true,
    cacheSeconds: 3600,
    consume: () => {
      consumed++;
      return true;
    },
    get: async (path, params) => {
      calls.push({ path, params });
      return food;
    },
  });
  mockFetch(async (input, init) => handler(new Request(String(input), init)));
  const result = await fetchBarcode(
    { ...defaultSettings, proxyUrl: "https://proxy.test", proxyToken: token },
    " 012345678905 "
  );
  expect(calls).toEqual([{ path: "food/barcode/find-by-id/v2", params: { barcode: "0012345678905" } }]);
  expect(consumed).toBe(1);
  expect(result.id).toBe("fs:123");
  expect(result.servings[0].nutrients.calories).toBe(120);
  expect(result.cacheUntil - result.fetchedAt).toBeCloseTo(3600000, -1);
});

test("barcode endpoint enforces auth, origin, validation, and quota before upstream", async () => {
  let calls = 0;
  let consumed = 0;
  const handler = createHandler({
    tokens: [token],
    origins: ["https://munchy.test"],
    configured: true,
    cacheSeconds: 0,
    consume: () => {
      consumed++;
      return false;
    },
    get: async () => {
      calls++;
      return food;
    },
  });
  expect((await handler(req("012345678905", ""))).status).toBe(401);
  expect(
    (
      await handler(
        new Request(req("012345678905"), { headers: { Authorization: `Bearer ${token}`, Origin: "https://evil.test" } })
      )
    ).status
  ).toBe(403);
  expect((await handler(req("012345678906"))).status).toBe(400);
  expect(consumed).toBe(0);
  expect((await handler(req("012345678905"))).status).toBe(429);
  expect(consumed).toBe(1);
  expect(calls).toBe(0);
});

test("barcode requests share the per-token rate limit", async () => {
  let calls = 0;
  const handler = createHandler({
    tokens: [token],
    origins: ["https://munchy.test"],
    configured: true,
    cacheSeconds: 0,
    consume: () => true,
    get: async () => {
      calls++;
      return food;
    },
  });
  for (let i = 0; i < 60; i++) expect((await handler(req("012345678905"))).status).toBe(200);
  expect((await handler(req("012345678905"))).status).toBe(429);
  expect(calls).toBe(60);
});

test("FatSecret not-found and missing barcode permission produce actionable errors", async () => {
  for (const [code, status, message] of [
    [211, 404, "No food found"],
    [14, 503, "Barcode lookup is not enabled"],
  ] as const) {
    mockFetch(
      async (input) =>
        new Response(
          JSON.stringify(
            String(input).includes("connect/token") ? { access_token: "test", expires_in: 3600 } : { error: { code } }
          )
        )
    );
    try {
      await createFatSecret(
        "id",
        "secret",
        "basic barcode"
      )("food/barcode/find-by-id/v2", { barcode: "0012345678905" });
      throw new Error("Expected an upstream error");
    } catch (e) {
      expect(e).toBeInstanceOf(UpstreamError);
      expect((e as UpstreamError).status).toBe(status);
      expect((e as Error).message).toContain(message);
    }
    spyOn(globalThis, "fetch").mockRestore();
  }
});

test("client rejects invalid barcodes and malformed proxy details", async () => {
  const fetch = spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ data: food, cacheSeconds: -1 }))
  );
  const settings = { ...defaultSettings, proxyUrl: "https://proxy.test", proxyToken: token };
  await expect(fetchBarcode(settings, "bad")).rejects.toThrow("Enter an 8, 12, or 13-digit barcode");
  expect(fetch).not.toHaveBeenCalled();
  await expect(fetchBarcode(settings, "012345678905")).rejects.toThrow();
});
