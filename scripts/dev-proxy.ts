import { randomBytes } from "node:crypto";
import { chmod } from "node:fs/promises";
process.env.FATSECRET_CLIENT_ID = (await Bun.file("secrets/client-id.txt").text()).trim();
process.env.FATSECRET_CLIENT_SECRET = (await Bun.file("secrets/client-secret.txt").text()).trim();
const tokenFile = Bun.file("secrets/app-access-token.txt");
const token = (await tokenFile.exists()) ? (await tokenFile.text()).trim() : randomBytes(32).toString("hex");
if (!(await tokenFile.exists())) {
  await Bun.write(tokenFile, token + "\n");
  await chmod("secrets/app-access-token.txt", 0o600);
}
process.env.APP_ACCESS_TOKENS = token;
process.env.ALLOWED_ORIGINS = "http://localhost:3000";
await import("../proxy/src/server");
