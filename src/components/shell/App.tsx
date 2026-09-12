"use client";
import { useEffect, useState } from "react";
import { LuNotebookPen, LuCookingPot, LuChartNoAxesCombined, LuSettings, LuCheck } from "react-icons/lu";
import { LocalStore, useStore } from "./Store";
import { Diary } from "../diary/Diary";
import { Recipes } from "../recipes/Recipes";
import { Insights } from "../insights/Insights";
import { Settings } from "../settings/Settings";
import { AppUpdate } from "./AppUpdate";
import { watchSystemTheme } from "@/utils/theme";
type Page = "diary" | "recipes" | "insights" | "settings";
const pages = [
  { id: "diary", label: "Diary", icon: LuNotebookPen },
  { id: "recipes", label: "Recipes", icon: LuCookingPot },
  { id: "insights", label: "Insights", icon: LuChartNoAxesCombined },
  { id: "settings", label: "Settings", icon: LuSettings },
] as const;
function Workspace() {
  const [page, setPage] = useState<Page>("diary");
  const [offline, setOffline] = useState(false);
  const { notice, notify } = useStore();
  useEffect(() => watchSystemTheme(), []);
  useEffect(() => {
    const change = () => setOffline(!navigator.onLine);
    change();
    window.addEventListener("online", change);
    window.addEventListener("offline", change);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      void navigator.serviceWorker
        .register("/sw.js")
        .catch(() => notify("Offline installation failed. Reload while online to retry."));
    return () => {
      window.removeEventListener("online", change);
      window.removeEventListener("offline", change);
    };
  }, [notify]);
  return (
    <>
      <header className="app-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("diary");
          }}
        >
          munchy<span className="brand-mark">✳</span>
        </a>
        <nav aria-label="Main navigation">
          {pages.map((p) => (
            <button key={p.id} aria-current={page === p.id ? "page" : undefined} onClick={() => setPage(p.id)}>
              <p.icon />
              <span>{p.label}</span>
            </button>
          ))}
        </nav>
        {offline && (
          <span className="device-status">
            <span />
            Offline, diary still works
          </span>
        )}
      </header>
      <main className="workspace">
        {page === "diary" ? (
          <Diary />
        ) : page === "recipes" ? (
          <Recipes />
        ) : page === "insights" ? (
          <Insights />
        ) : (
          <Settings />
        )}
      </main>
      <footer className="app-footer">
        <AppUpdate />
        <a href="https://www.fatsecret.com" rel="noreferrer" target="_blank">
          Food data by fatsecret
        </a>
      </footer>
      {notice && (
        <div className="toast" role="status">
          <LuCheck />
          <span>{notice}</span>
          <button aria-label="Dismiss notification" onClick={() => notify("")}>
            ×
          </button>
        </div>
      )}
    </>
  );
}
export default function App() {
  return (
    <LocalStore>
      <Workspace />
    </LocalStore>
  );
}
