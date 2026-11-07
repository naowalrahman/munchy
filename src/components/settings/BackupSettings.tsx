"use client";

import { useState } from "react";
import { type Backup, download, exportBackup, exportCsv, importStatements, parseBackup } from "@/utils/backup";
import { today } from "@/utils/dates";
import { errorMessage } from "@/utils/errors";
import { useStore } from "../shell/Store";
import { Modal } from "../ui/Modal";
import { DriveBackup } from "./DriveBackup";

export function BackupSettings() {
  const { data, run, notify } = useStore();
  const [backup, setBackup] = useState<Backup | null>(null);
  const [storage, setStorage] = useState("");

  return (
    <>
      <section className="settings-section form-stack">
        <h2>Backups</h2>
        <p className="muted">
          {data.entries.length} food entries, {data.recipes.length} recipes, and {data.foods.length} of 200 recent foods
          on this device. Clearing your browser data will remove them, so make regular backups.
        </p>
        <div className="button-row">
          <button onClick={() => download(`munchy-${today()}.json`, exportBackup(data))}>Export backup</button>
          <button onClick={() => download(`munchy-nutrients-${today()}.csv`, exportCsv(data), "text/csv")}>
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
                setBackup(parseBackup(JSON.parse(await f.text())));
              } catch (error) {
                notify(errorMessage(error, "Could not read this backup."));
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
      <DriveBackup onRestore={setBackup} />
      {backup && (
        <Modal title="Import this backup?" onClose={() => setBackup(null)}>
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
                void run(() => importStatements(backup, data), "Backup imported").then((ok) => {
                  if (ok) setBackup(null);
                })
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
