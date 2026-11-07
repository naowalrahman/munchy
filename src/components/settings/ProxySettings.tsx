"use client";

import { useState } from "react";
import { saveSettings } from "@/utils/db/operations";
import { errorMessage } from "@/utils/errors";
import { fetchCapabilities, proxyUrl } from "@/utils/food/api";
import { useStore } from "../shell/Store";

export function ProxySettings() {
  const { data, run } = useStore();
  const [status, setStatus] = useState("");

  return (
    <form
      className="settings-section form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const url = String(f.get("url")).trim().replace(/\/$/, "");

        try {
          if (url) proxyUrl(url);
        } catch (error) {
          return setStatus(errorMessage(error, "Enter a valid address."));
        }

        const settings = { ...data.settings, proxyUrl: url, proxyToken: String(f.get("token")).trim() };
        if (await run(() => [saveSettings(settings)], "Food search connection saved"))
          setStatus("Connection saved. Test it below.");
      }}
    >
      <h2>Food search</h2>
      <p className="muted">
        Only search queries go to this service. Your diary, recipes, and targets stay on this device.
      </p>
      <label>
        Proxy address
        <input
          name="url"
          type="url"
          defaultValue={data.settings.proxyUrl || location.origin}
          placeholder="https://food.example.com"
        />
      </label>
      <label>
        App access token
        <input name="token" type="password" defaultValue={data.settings.proxyToken} autoComplete="off" />
      </label>
      <div className="button-row">
        <button className="primary">Save connection</button>
        <button
          type="button"
          onClick={async () => {
            setStatus("Testing…");

            try {
              const { configured, cacheSeconds } = await fetchCapabilities(data.settings);
              setStatus(
                !configured
                  ? "Proxy reachable, but FatSecret credentials are missing."
                  : cacheSeconds > 0
                    ? "Proxy connected. Offline FatSecret logging is enabled; search also requires IP whitelisting."
                    : "Proxy connected. Search requires IP whitelisting; persistent FatSecret logging needs storage permission on your account."
              );
            } catch (error) {
              setStatus(errorMessage(error, "Could not reach the proxy."));
            }
          }}
        >
          Test connection
        </button>
      </div>
      {status && (
        <p role="status" className="muted">
          {status}
        </p>
      )}
    </form>
  );
}
