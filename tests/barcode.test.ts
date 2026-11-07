import { afterEach, expect, spyOn, test } from "bun:test";
import { createFatSecret, UpstreamError } from "../proxy/src/fatsecret";
import { fetchBarcode } from "../src/utils/food/api";
import { barcodeSchema, defaultSettings } from "../src/utils/model";

afterEach(() => {
  spyOn(globalThis, "fetch").mockRestore();
});

test("barcodes preserve leading zeros, pad to GTIN-13, and reject bad lengths or checksums", () => {
  expect(barcodeSchema.parse("012345678905")).toBe("0012345678905");
  expect(barcodeSchema.parse("96385074")).toBe("0000096385074");
  expect(barcodeSchema.parse("4006381333931")).toBe("4006381333931");
  for (const value of ["", "1234567", "12345678901234", "4006381333932", "01234567890a", "1e11", " 96385074"])
    expect(barcodeSchema.safeParse(value).success).toBe(false);
});

const token = "x".repeat(48);

const food = {
  food: {
    food_id: "123",
    food_name: "Test food",
    servings: { serving: { serving_id: "1", serving_description: "1 serving", calories: "120" } },
  },
};

test("FatSecret error responses carry their code on UpstreamError", async () => {
  spyOn(globalThis, "fetch").mockImplementation(
    Object.assign(
      async (input: Parameters<typeof fetch>[0]) =>
        new Response(
          JSON.stringify(
            String(input).includes("connect/token")
              ? { access_token: "test", expires_in: 3600 }
              : { error: { code: 211 } }
          )
        ),
      { preconnect: globalThis.fetch.preconnect }
    )
  );

  const lookup = createFatSecret(
    "id",
    "secret",
    "basic barcode"
  )("food/barcode/find-by-id/v2", {
    barcode: "0012345678905",
  });

  await expect(lookup).rejects.toBeInstanceOf(UpstreamError);
  await expect(lookup).rejects.toMatchObject({ code: 211, status: 502 });
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
