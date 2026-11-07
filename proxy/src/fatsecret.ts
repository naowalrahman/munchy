import { z } from "zod";

const tokenSchema = z.object({ access_token: z.string(), expires_in: z.number().positive() });

export class UpstreamError extends Error {
  constructor(
    message: string,
    public status = 502,
    public code?: number | undefined
  ) {
    super(message);
  }
}

export function createFatSecret(clientId: string, clientSecret: string, scope = "basic") {
  let token: { value: string; expires: number } | undefined;
  let pending: Promise<string> | undefined;

  async function authenticate() {
    if (token && token.expires > Date.now()) return token.value;
    if (pending) return pending;
    pending = (async () => {
      const response = await fetch("https://oauth.fatsecret.com/connect/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ grant_type: "client_credentials", scope }),
        signal: AbortSignal.timeout(12000),
      });

      if (!response.ok)
        throw new UpstreamError("FatSecret authentication failed. Check the server credentials and IP whitelist.", 503);
      const data = tokenSchema.parse(await response.json());
      token = { value: data.access_token, expires: Date.now() + Math.max(0, data.expires_in - 60) * 1000 };

      return token.value;
    })().finally(() => {
      pending = undefined;
    });

    return pending;
  }

  return async function get(path: string, params: Record<string, string>, retry = true): Promise<unknown> {
    const access = await authenticate();
    const url = new URL(`https://platform.fatsecret.com/rest/${path}`);
    url.search = new URLSearchParams({ ...params, format: "json" }).toString();

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${access}` },
      signal: AbortSignal.timeout(12000),
    });

    const body: unknown = response.ok ? await response.json() : undefined;

    const error = z
      .object({ error: z.object({ code: z.coerce.number(), message: z.string().optional() }) })
      .safeParse(body);

    if (retry && (response.status === 401 || (error.success && error.data.error.code === 13))) {
      token = undefined;
      return get(path, params, false);
    }

    if (!response.ok)
      throw new UpstreamError(
        response.status === 429
          ? "FatSecret daily quota reached. Use saved or custom foods."
          : "FatSecret is unavailable. Try again shortly.",
        response.status === 429 ? 429 : 502
      );
    if (error.success)
      throw new UpstreamError(
        `FatSecret rejected the request (code ${error.data.error.code}). Check API permissions and the VM IP whitelist.`,
        error.data.error.code === 106 ? 429 : 502,
        error.data.error.code
      );

    return body;
  };
}
