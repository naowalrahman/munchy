"use client";

import { useState } from "react";
import { saveSettings } from "@/utils/db/operations";
import { issueText, mealsSchema, nutrientKeys, type Settings as SettingsModel } from "@/utils/model";
import { nutrients } from "@/utils/nutrition";
import { readThemeSetting, saveThemeSetting, type ThemeSetting } from "@/utils/theme";
import { useStore } from "../shell/Store";
import { BackupSettings } from "./BackupSettings";
import { ProxySettings } from "./ProxySettings";

const themeOptions: { id: ThemeSetting; label: string }[] = [
  { id: "system", label: "Match device" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

export function Settings() {
  const { data, run, notify } = useStore();
  const [theme, setTheme] = useState(readThemeSetting);

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
            {/* biome-ignore lint/a11y/useSemanticElements: segmented control styling relies on a plain div */}
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
                    () => [saveSettings({ ...data.settings, searchAgain: e.target.checked })],
                    e.target.checked ? "Search will reopen after adding" : "Search will close after adding"
                  )
                }
              />
              Search again after adding a food to a meal
            </label>
          </section>
          <form
            className="settings-section form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);

              const meals = mealsSchema.safeParse(
                String(f.get("meals"))
                  .split("\n")
                  .map((v) => v.trim())
                  .filter(Boolean)
              );

              if (!meals.success) return notify(issueText(meals.error));
              const goals: SettingsModel["goals"] = {};
              for (const k of nutrientKeys) if (f.get(k)) goals[k] = Number(f.get(k));
              void run(
                () => [saveSettings({ ...data.settings, defaultMeals: meals.data, goals })],
                "Preferences saved"
              );
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
          <ProxySettings />
          <BackupSettings />
          <section className="settings-section">
            <h2>Install as an app</h2>
            <p className="muted">
              On Android, open this page in your browser and choose Install app from the menu. On a Mac, use Add to Dock
              in Safari or Install in Chrome. Open it once while online, and the diary works offline after that.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
