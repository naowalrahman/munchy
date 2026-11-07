"use client";

import { useEffect, useRef, useState } from "react";
import { LuChartNoAxesCombined, LuCheck, LuCookingPot, LuNotebookPen, LuSettings } from "react-icons/lu";
import { watchSystemTheme } from "@/utils/theme";
import { Diary } from "../diary/Diary";
import { Insights } from "../insights/Insights";
import { Recipes } from "../recipes/Recipes";
import { Settings } from "../settings/Settings";
import { AppUpdate } from "./AppUpdate";
import { LocalStore, useStore } from "./Store";

const pages = [
  { id: "diary", label: "Diary", icon: LuNotebookPen, Page: Diary },
  { id: "recipes", label: "Recipes", icon: LuCookingPot, Page: Recipes },
  { id: "insights", label: "Insights", icon: LuChartNoAxesCombined, Page: Insights },
  { id: "settings", label: "Settings", icon: LuSettings, Page: Settings },
] as const;

type PageId = (typeof pages)[number]["id"];

function Toast() {
  const { notice, notify } = useStore();
  const ref = useRef<HTMLDivElement>(null);

  // A manual popover joins the top layer, so notices stay visible above open dialogs.
  useEffect(() => {
    const toast = ref.current;
    if (!toast) return;
    if (toast.matches(":popover-open")) toast.hidePopover();
    if (notice) toast.showPopover();
  }, [notice]);

  return (
    <div ref={ref} popover="manual" className="toast" role="status">
      <LuCheck />
      <span>{notice}</span>
      <button aria-label="Dismiss notification" onClick={() => notify("")}>
        ×
      </button>
    </div>
  );
}

function Workspace() {
  const [page, setPage] = useState<PageId>("diary");
  const [offline, setOffline] = useState(false);

  useEffect(() => watchSystemTheme(), []);
  useEffect(() => {
    const change = () => setOffline(!navigator.onLine);
    change();
    window.addEventListener("online", change);
    window.addEventListener("offline", change);

    return () => {
      window.removeEventListener("online", change);
      window.removeEventListener("offline", change);
    };
  }, []);
  const { Page } = pages.find((p) => p.id === page) ?? pages[0];

  return (
    <>
      <header className="app-header">
        {/* biome-ignore lint/a11y/useValidAnchor: the brand stays a home link; navigation is client-side */}
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
        <Page />
      </main>
      <footer className="app-footer">
        <AppUpdate />
        <a href="https://www.fatsecret.com" rel="noreferrer" target="_blank">
          Food data by fatsecret
        </a>
      </footer>
      <Toast />
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
