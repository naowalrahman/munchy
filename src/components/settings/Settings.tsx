"use client";
import { useState } from "react";
import { useStore } from "../shell/Store";
import { settingsSchema, nutrientKeys } from "@/utils/model";
import { nutrients, portionNutrition } from "@/utils/nutrition";
import { upsert } from "@/utils/db/client";
import { download, exportBackup, importBackup } from "@/utils/backup";
import { request } from "@/utils/food/api";
import { today } from "@/utils/dates";
import { z } from "zod";
import { Modal } from "../ui/Modal";
export function Settings() {
  const { data, run, notify } = useStore();
  const [status, setStatus] = useState("");
  const [backup, setBackup] = useState<unknown>();
  const [storage, setStorage] = useState("");
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Make it yours</h1>
          <p>Your meals, your targets, your data.</p>
        </div>
      </div>
      <div className="settings-layout">
        <section>
          <form
            className="settings-section form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                const names = String(f.get("meals"))
                  .split("\n")
                  .map((v) => v.trim())
                  .filter(Boolean);
                if (new Set(names.map((n) => n.toLowerCase())).size !== names.length)
                  throw new Error("Use unique meal names.");
                const goals: Record<string, number> = {};
                for (const k of nutrientKeys) {
                  if (f.get(k)) goals[k] = Number(f.get(k));
                }
                const settings = settingsSchema.parse({ ...data.settings, defaultMeals: names, goals });
                await run([upsert("settings", "main", settings)], "Preferences saved");
              } catch (e) {
                notify(e instanceof Error ? e.message : "Could not save.");
              }
            }}
          >
            <h2>Default meals</h2>
            <label>
              One meal per line
              <textarea name="meals" rows={4} defaultValue={data.settings.defaultMeals.join("\n")} />
            </label>
            <p className="muted">
              These names apply when a new day is first saved. Existing diaries keep their meal names. Future food
              logging is disabled.
            </p>
            <h2>Personal daily targets</h2>
            <p className="muted">Optional. Set your own targets; blank fields have no target.</p>
            <div className="nutrient-inputs">
              {nutrientKeys.map((k) => (
                <label key={k}>
                  {nutrients[k].label}, {nutrients[k].unit}
                  <input type="number" min="0.01" step="any" name={k} defaultValue={data.settings.goals[k] ?? ""} />
                </label>
              ))}
            </div>
            <button className="primary">Save preferences</button>
          </form>
        </section>
        <aside>
          <form
            className="settings-section form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                const url = String(f.get("url")).trim().replace(/\/$/, "");
                if (url) {
                  const parsed = new URL(url);
                  if (parsed.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(parsed.hostname))
                    throw new Error("Use an HTTPS address.");
                }
                await run(
                  [
                    upsert("settings", "main", {
                      ...data.settings,
                      proxyUrl: url,
                      proxyToken: String(f.get("token")).trim(),
                    }),
                  ],
                  "Food search connection saved"
                );
                setStatus("Connection saved. Test it below.");
              } catch (e) {
                setStatus(String(e));
              }
            }}
          >
            <h2>Food search connection</h2>
            <p className="muted">
              Only food queries go to this service. Your diary, recipes, and goals stay on this device.
            </p>
            <label>
              Proxy address
              <input
                name="url"
                type="url"
                defaultValue={data.settings.proxyUrl || (typeof location !== "undefined" ? location.origin : "")}
                placeholder="https://food.example.com"
              />
            </label>
            <label>
              App access token
              <input name="token" type="password" defaultValue={data.settings.proxyToken} autoComplete="off" />
            </label>
            <button className="primary">Save connection</button>
            <button
              type="button"
              onClick={async () => {
                setStatus("Testing…");
                try {
                  const result = z
                    .object({ configured: z.boolean(), cacheSeconds: z.number() })
                    .parse(await request(data.settings, "/v1/capabilities"));
                  setStatus(
                    result.configured
                      ? result.cacheSeconds > 0
                        ? "Proxy connected. Offline FatSecret logging is enabled; search also requires IP whitelisting."
                        : "Proxy connected. Search requires IP whitelisting; persistent FatSecret logging needs storage permission on your account."
                      : "Proxy reachable, but FatSecret credentials are missing."
                  );
                } catch (e) {
                  setStatus(String(e));
                }
              }}
            >
              Test connection
            </button>
            {status && <p role="status">{status}</p>}
            <p className="fine-print">
              FatSecret Basic is US-only and does not include caching. The proxy enables offline caching only with
              configured storage permission. Custom foods work offline without a connection.
            </p>
          </form>
          <section className="settings-section form-stack">
            <h2>Keep your data</h2>
            <p>
              {data.entries.length} food entries · {data.recipes.length} recipes · {data.foods.length}/200 recent foods
            </p>
            <p className="muted">
              Each device has its own diary. Export a backup to transfer or protect it. Clearing site data removes this
              device’s diary.
            </p>
            <button onClick={() => download(`munchy-${today()}.json`, exportBackup(data))}>Export full backup</button>
            <button
              onClick={() => {
                const cell = (s: unknown) => {
                  const text = String(s ?? "");
                  return '"' + (/^[=+@\-]/.test(text) ? "'" : "") + text.replaceAll('"', '""') + '"';
                };
                const rows = [
                  ["Date", "Meal", "Food", "Quantity", "Unit", ...nutrientKeys],
                  ...data.entries.map((e) => [
                    e.date,
                    e.meal,
                    e.food.name,
                    e.quantity,
                    e.unit,
                    ...nutrientKeys.map((k) => portionNutrition(e)[k] ?? ""),
                  ]),
                ];
                download(
                  `munchy-nutrients-${today()}.csv`,
                  rows.map((r) => r.map(cell).join(",")).join("\n"),
                  "text/csv"
                );
              }}
            >
              Export nutrition CSV
            </button>
            <label className="file-label">
              Import backup
              <input
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    if (f.size > 50 * 1024 * 1024) throw new Error("Backup exceeds 50 MB.");
                    const raw: unknown = JSON.parse(await f.text());
                    importBackup(raw, data);
                    setBackup(raw);
                  } catch (e) {
                    notify(String(e));
                  }
                  e.target.value = "";
                }}
              />
            </label>
            <button
              onClick={async () => {
                const persisted = await navigator.storage?.persist?.();
                const estimate = await navigator.storage?.estimate?.();
                setStorage(
                  `${persisted ? "Persistent storage granted." : "Browser manages storage; keep regular backups."} ${((estimate?.usage ?? 0) / 1048576).toFixed(1)} MB in use.`
                );
              }}
            >
              Protect local storage
            </button>
            {storage && <p role="status">{storage}</p>}
          </section>
          <section className="settings-section">
            <h2>Install Munchy</h2>
            <p>
              <b>Android:</b> open this app in Chrome, then choose “Install app” or “Add to Home screen” from its menu.
            </p>
            <p>
              <b>macOS:</b> in Safari, choose File → Add to Dock. Chrome also supports installing it as an app.
            </p>
            <p className="muted">
              Open once while online to download the app. Saved foods and your diary then work offline.
            </p>
          </section>
        </aside>
      </div>
      {backup !== undefined && (
        <Modal title="Import this backup?" onClose={() => setBackup(undefined)}>
          <p>
            Matching records will be replaced; other local records will remain. Your food proxy connection is preserved.
          </p>
          <button onClick={() => download(`munchy-before-import-${today()}.json`, exportBackup(data))}>
            Back up this device first
          </button>
          <button
            className="primary"
            onClick={() =>
              void run(importBackup(backup, data), "Backup imported")
                .then(() => setBackup(undefined))
                .catch(() => {})
            }
          >
            Import backup
          </button>
        </Modal>
      )}
    </>
  );
}
