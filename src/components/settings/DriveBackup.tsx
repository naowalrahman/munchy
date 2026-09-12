"use client";
import { useEffect, useState } from "react";
import { useStore } from "../shell/Store";
import { upsert } from "@/utils/db/client";
import { exportBackup, importBackup } from "@/utils/backup";
import { today } from "@/utils/dates";
import { backupToDrive, listBackups, loadGoogle, readBackup, type DriveFile } from "@/utils/drive";
export function DriveBackup({ onRestore }: { onRestore: (raw: unknown) => void }) {
  const { data, run } = useStore();
  const clientId = data.settings.driveClientId;
  const [status, setStatus] = useState("");
  const [files, setFiles] = useState<DriveFile[]>();
  const [busy, setBusy] = useState(false);
  // Load Google's script up front: awaiting it inside the click handler loses the user
  // gesture, and the sign-in popup gets blocked.
  useEffect(() => {
    if (clientId) void loadGoogle().catch(() => {});
  }, [clientId]);
  async function attempt(pending: string, work: () => Promise<string>) {
    if (!navigator.onLine) {
      setStatus("You are offline. Connect and try again.");
      return;
    }
    setBusy(true);
    setStatus(pending);
    try {
      setStatus(await work());
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="settings-section form-stack"
      onSubmit={async (e) => {
        e.preventDefault();
        const id = String(new FormData(e.currentTarget).get("clientId")).trim();
        try {
          await run([upsert("settings", "main", { ...data.settings, driveClientId: id })], "Google Drive saved");
          setStatus(id ? "Client ID saved. Back up whenever you like." : "Google Drive backups turned off.");
        } catch {
          setStatus("Could not save the client ID.");
        }
      }}
    >
      <h2>Google Drive</h2>
      <p className="muted">Manual backups to a “Munchy backups” folder in your Drive.</p>
      <label>
        OAuth client ID
        <input
          name="clientId"
          type="text"
          defaultValue={clientId}
          autoComplete="off"
          placeholder="…apps.googleusercontent.com"
        />
      </label>
      <div className="button-row">
        <button className="primary">Save client ID</button>
        <button
          type="button"
          disabled={!clientId || busy}
          onClick={() =>
            void attempt("Backing up…", async () => {
              const file = await backupToDrive(clientId, `munchy-${today()}.json`, exportBackup(data));
              return `Saved ${file.name} to Google Drive.`;
            })
          }
        >
          Back up now
        </button>
        <button
          type="button"
          disabled={!clientId || busy}
          onClick={() =>
            void attempt("Looking for backups…", async () => {
              const found = await listBackups(clientId);
              setFiles(found);
              return found.length ? "Pick a backup to restore." : "No Munchy backups in this Drive account yet.";
            })
          }
        >
          Restore from Drive
        </button>
      </div>
      {files && files.length > 0 && (
        <div className="food-results">
          {files.map((file) => (
            <button
              type="button"
              className="food-result"
              key={file.id}
              disabled={busy}
              onClick={() =>
                void attempt("Downloading…", async () => {
                  const raw = await readBackup(clientId, file.id);
                  importBackup(raw, data);
                  setFiles(undefined);
                  onRestore(raw);
                  return "";
                })
              }
            >
              <span>
                <strong>{file.name}</strong>
                <small>{file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : "In your Drive"}</small>
              </span>
              <span>↓</span>
            </button>
          ))}
        </div>
      )}
      {status && (
        <p role="status" className="muted">
          {status}
        </p>
      )}
      <p className="fine-print">
        Create an OAuth client ID in the Google Cloud console: APIs &amp; Services → Credentials → Web application, with
        this site’s address as an authorised JavaScript origin, and the Drive API enabled. Keep the consent screen in
        Testing with your own account as a test user. The drive.file scope needs no review.
      </p>
    </form>
  );
}
