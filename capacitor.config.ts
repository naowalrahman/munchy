import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();
const allowCleartext = process.env.CAPACITOR_ANDROID_CLEARTEXT === "1";

const config: CapacitorConfig = {
  appId: "com.usemunchy.app",
  appName: "Munchy",
  webDir: "www",
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          ...(allowCleartext ? { cleartext: true } : {}),
        },
      }
    : {}),
};

export default config;
