"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { transaction } from "@/utils/db/client";
import type { Statement } from "@/utils/db/schema";
import { errorMessage } from "@/utils/errors";
import type { Snapshot } from "@/utils/model";
import { BootScreen } from "./BootScreen";

interface Store {
  data: Snapshot;
  /**
   * Builds and commits statements atomically. Any failure, from validation in `build` or from storage,
   * is shown as a notice; the promise resolves to whether the change was saved and never rejects.
   */
  run: (build: () => Statement[], message?: string) => Promise<boolean>;
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
        .catch((e: unknown) => setError(errorMessage(e, "Local storage failed."))),
    []
  );

  useEffect(() => {
    void refresh();
    const channel = new BroadcastChannel("munchy-updates");
    channel.onmessage = () => void refresh();

    return () => channel.close();
  }, [refresh]);

  const run = useCallback(
    async (build: () => Statement[], message?: string) => {
      setBusy(true);

      try {
        setData(await transaction(build()));
        if (message) notify(message);
        const channel = new BroadcastChannel("munchy-updates");
        channel.postMessage("changed");
        channel.close();

        return true;
      } catch (e) {
        notify(errorMessage(e, "Could not save."));
        await refresh();

        return false;
      } finally {
        setBusy(false);
      }
    },
    [refresh]
  );

  if (error)
    return (
      <main className="boot">
        <h1>Local storage couldn’t open</h1>
        <p>{error}</p>
        <button onClick={() => location.reload()}>Try again</button>
      </main>
    );
  if (!data) return <BootScreen message="Opening your diary on this device…" />;

  return <Context.Provider value={{ data, run, notice, notify, busy }}>{children}</Context.Provider>;
}

export function useStore() {
  const s = useContext(Context);
  if (!s) throw new Error("LocalStore is missing.");

  return s;
}
