import { timingSafeEqual } from "node:crypto";
import { barcodeSchema, issueText } from "../../src/utils/model";
import { UpstreamError } from "./fatsecret";

export interface ProxyConfig {
  tokens: string[];
  origins: string[];
  cacheSeconds: number;
  configured: boolean;
  get: (path: string, params: Record<string, string>) => Promise<unknown>;
  consume: () => boolean;
}

interface Route {
  path: string;
  params: Record<string, string>;
  details: boolean;
  errors?: Record<number, UpstreamError>;
}

const barcodeDisabled = new UpstreamError(
  "Barcode lookup is not enabled on this proxy. Check the FatSecret barcode permission and FATSECRET_SCOPE.",
  503
);

const barcodeErrors = {
  211: new UpstreamError("No food found for this barcode. Try searching by name or add a food from its label.", 404),
  10: barcodeDisabled,
  14: barcodeDisabled,
};

function resolveRoute(url: URL): Route | { invalid: string } | null {
  if (url.pathname === "/v1/barcode") {
    const barcode = barcodeSchema.safeParse(url.searchParams.get("barcode"));
    if (!barcode.success) return { invalid: issueText(barcode.error) };

    return {
      path: "food/barcode/find-by-id/v2",
      params: { barcode: barcode.data },
      details: true,
      errors: barcodeErrors,
    };
  }

  if (url.pathname === "/v1/search") {
    const q = url.searchParams.get("q")?.trim() ?? "";
    const page = url.searchParams.get("page") ?? "0";
    if (q.length < 2 || q.length > 100 || !/^\d{1,4}$/.test(page))
      return { invalid: "Search needs 2–100 characters and a valid page." };

    return {
      path: "foods/search/v1",
      params: { search_expression: q, page_number: page, max_results: "20" },
      details: false,
    };
  }

  const foodId = url.pathname.match(/^\/v1\/foods\/(\d{1,20})$/)?.[1];

  return foodId ? { path: "food/v4", params: { food_id: foodId }, details: true } : null;
}

export function createHandler(config: ProxyConfig) {
  const windows = new Map<string, { count: number; reset: number }>();

  return async (req: Request) => {
    const url = new URL(req.url);
    const origin = req.headers.get("origin");
    const allowed = !origin || config.origins.includes(origin);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      Vary: "Origin",
    };

    if (origin && allowed) headers["Access-Control-Allow-Origin"] = origin;
    const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (!allowed) return json({ error: "This app origin is not allowed by the food proxy." }, 403);
    if (req.method === "OPTIONS")
      return new Response(null, {
        status: 204,
        headers: {
          ...headers,
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization",
          "Access-Control-Max-Age": "600",
        },
      });
    if (req.method !== "GET") return json({ error: "Method not allowed." }, 405);
    if (url.pathname === "/health") return json({ ok: true });
    const supplied = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";

    const valid = config.tokens.find((t) => {
      const a = Buffer.from(t);
      const b = Buffer.from(supplied);

      return a.length === b.length && timingSafeEqual(a, b);
    });

    if (!valid) return json({ error: "The app access token is missing or invalid. Update it in Settings." }, 401);
    const now = Date.now();
    for (const [key, window] of windows) if (window.reset <= now) windows.delete(key);
    const window = windows.get(valid) ?? { count: 0, reset: now + 60000 };
    window.count++;
    windows.set(valid, window);

    if (window.count > 60) {
      headers["Retry-After"] = "60";
      return json({ error: "Too many requests. Wait a minute and use saved foods." }, 429);
    }

    if (url.pathname === "/v1/capabilities")
      return json({ configured: config.configured, cacheSeconds: config.cacheSeconds });
    if (!config.configured) return json({ error: "FatSecret credentials are not configured on the proxy." }, 503);
    const route = resolveRoute(url);
    if (!route) return json({ error: "Not found." }, 404);
    if ("invalid" in route) return json({ error: route.invalid }, 400);
    if (!config.consume()) return json({ error: "The daily API budget has been reached. Use saved foods." }, 429);

    try {
      const data = await config.get(route.path, route.params);
      return json(route.details ? { data, cacheSeconds: config.cacheSeconds } : data);
    } catch (e) {
      if (!(e instanceof UpstreamError))
        return json({ error: "Food service timed out or returned an invalid response. Try again." }, 502);
      const mapped = e.code === undefined ? undefined : route.errors?.[e.code];
      const error = mapped ?? e;

      return json({ error: error.message }, error.status);
    }
  };
}
