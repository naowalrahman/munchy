"use client";
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { transaction } from "@/utils/db/client";
import type { Statement } from "@/utils/db/schema";
import type { Snapshot } from "@/utils/model";
interface Store {
  data: Snapshot;
  run: (s: Statement[], message?: string) => Promise<void>;
  notice: string;
  notify: (s: string) => void;
  busy: boolean;
}
const Context = createContext<Store | null>(null);
export function LocalStore({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [notice, notify] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(
    () =>
      transaction()
        .then(setData)
        .catch((e) => setError(String(e))),
    []
  );
  useEffect(() => {
    void refresh();
    const channel = new BroadcastChannel("munchy-updates");
    channel.onmessage = () => void refresh();
    return () => channel.close();
  }, [refresh]);
  const run = useCallback(async (statements: Statement[], message = "Saved") => {
    setBusy(true);
    try {
      setData(await transaction(statements));
      notify(message);
      const channel = new BroadcastChannel("munchy-updates");
      channel.postMessage("changed");
      channel.close();
    } catch (e) {
      setData(await transaction());
      notify(e instanceof Error ? e.message : "Could not save.");
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);
  if (error)
    return (
      <main className="boot">
        <h1>Local storage couldn’t open</h1>
        <p>{error}</p>
        <button onClick={() => location.reload()}>Try again</button>
      </main>
    );
  if (!data)
    return (
      <main className="boot">
        <span className="brand">
          munchy<span className="brand-mark">✳</span>
        </span>
        <p className="muted">Opening your diary on this device…</p>
      </main>
    );
  return <Context.Provider value={{ data, run, notice, notify, busy }}>{children}</Context.Provider>;
}
export function useStore() {
  const s = useContext(Context);
  if (!s) throw new Error("LocalStore is missing.");
  return s;
}
