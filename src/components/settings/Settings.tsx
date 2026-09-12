"use client";
import { useEffect, useState } from "react";
import { useStore } from "../shell/Store";
import { settingsSchema, nutrientKeys } from "@/utils/model";
import { nutrients, portionNutrition } from "@/utils/nutrition";
import { upsert } from "@/utils/db/client";
import { download, exportBackup, importBackup } from "@/utils/backup";
import { request } from "@/utils/food/api";
import { today } from "@/utils/dates";
import { z } from "zod";
import { Modal } from "../ui/Modal";
import { DriveBackup } from "./DriveBackup";
import { readThemeSetting, saveThemeSetting, type ThemeSetting } from "@/utils/theme";
const themeOptions: { id: ThemeSetting; label: string }[] = [
  { id: "system", label: "Match device" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];
export function Settings() {
  const { data, run, notify } = useStore();
  const [status, setStatus] = useState("");
  const [backup, setBackup] = useState<unknown>();
  const [storage, setStorage] = useState("");
  const [theme, setTheme] = useState<ThemeSetting>("system");
  useEffect(() => setTheme(readThemeSetting()), []);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Settings</h1>
          <p>Meals, targets, food search, and backups.</p>
        </div>
      </div>
      <div className="settings-layout">
        <section>
          <section className="settings-section">
            <h2>Appearance</h2>
            <div className="segmented" role="group" aria-label="Appearance">
              {themeOptions.map((o) => (
                <button
                  key={o.id}
                  aria-pressed={theme === o.id}
                  onClick={() => {
                    setTheme(o.id);
                    saveThemeSetting(o.id);
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </section>
          <section className="settings-section">
            <h2>Logging</h2>
            <label className="check-label">
              <input
                type="checkbox"
                checked={data.settings.searchAgain}
                onChange={(e) =>
                  void run(
                    [upsert("settings", "main", { ...data.settings, searchAgain: e.target.checked })],
                    e.target.checked ? "Search will reopen after adding" : "Search will close after adding"
                  ).catch(() => {})
                }
              />
              Search again after adding a food to a meal
            </label>
          </section>
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
            <p className="muted">Used for each new day. Days you have already logged keep their own meals.</p>
            <h2>Daily targets</h2>
            <p className="muted">Optional. Leave a field blank to skip that target.</p>
            <div className="nutrient-inputs">
              {nutrientKeys.map((k) => (
                <label key={k}>
                  {nutrients[k].label}, {nutrients[k].unit}
                  <input type="number" min="0.01" step="any" name={k} defaultValue={data.settings.goals[k] ?? ""} />
                </label>
              ))}
            </div>
            <button className="primary">Save meals and targets</button>
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
            <h2>Food search</h2>
            <p className="muted">
              Only search queries go to this service. Your diary, recipes, and targets stay on this device.
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
            <div className="button-row">
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
            </div>
            {status && (
              <p role="status" className="muted">
                {status}
              </p>
            )}
          </form>
          <section className="settings-section form-stack">
            <h2>Backups</h2>
            <p className="muted">
              {data.entries.length} food entries, {data.recipes.length} recipes, and {data.foods.length} of 200 recent
              foods on this device. Clearing your browser data will remove them, so make regular backups.
            </p>
            <div className="button-row">
              <button onClick={() => download(`munchy-${today()}.json`, exportBackup(data))}>Export backup</button>
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
                Export CSV
              </button>
            </div>
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
              Ask the browser to keep this data
            </button>
            {storage && (
              <p role="status" className="muted">
                {storage}
              </p>
            )}
          </section>
          <DriveBackup onRestore={(raw) => setBackup(raw)} />
          <section className="settings-section">
            <h2>Install as an app</h2>
            <p className="muted">
              On Android, open this page in your browser and choose Install app from the menu. On a Mac, use Add to Dock
              in Safari or Install in Chrome. Open it once while online, and the diary works offline after that.
            </p>
          </section>
        </aside>
      </div>
      {backup !== undefined && (
        <Modal title="Import this backup?" onClose={() => setBackup(undefined)}>
          <p className="muted">
            Matching records are replaced and everything else stays. Your food search connection is kept.
          </p>
          <div className="button-row">
            <button onClick={() => download(`munchy-before-import-${today()}.json`, exportBackup(data))}>
              Export current data first
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
          </div>
        </Modal>
      )}
    </>
  );
}
