"use client";

import { useState } from "react";
import { type Food, isStorable, type Portion } from "@/utils/model";
import { recipeFood } from "@/utils/nutrition";
import { lastPortion } from "@/utils/suggestions";
import { useStore } from "../shell/Store";
import { Modal } from "../ui/Modal";
import { BarcodeScanner } from "./BarcodeScanner";
import { CustomFood } from "./CustomFood";
import { PortionEditor } from "./PortionEditor";
import { SearchPanel } from "./SearchPanel";
import { useFoodSearch } from "./useFoodSearch";

type View = { kind: "search" } | { kind: "custom" } | { kind: "scan" } | { kind: "portion"; food: Food };

const titles = { custom: "New food", scan: "Scan barcode", portion: "How much?" } as const;

export function FoodPicker({
  meal,
  onClose,
  onPick,
}: {
  meal?: string;
  onClose: () => void;
  /** Resolves to whether the portion was accepted; the picker stays open otherwise. */
  onPick: (portion: Portion) => Promise<boolean> | boolean;
}) {
  const { data } = useStore();
  const search = useFoodSearch(data.settings);
  const [view, setView] = useState<View>({ kind: "search" });

  const favorites = new Set(data.favorites);

  const local = [...data.recipes.map(recipeFood), ...data.foods.filter(isStorable)].sort(
    (a, b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id))
  );

  const pick = (food: Food) => setView({ kind: "portion", food });
  const back = () => setView({ kind: "search" });

  return (
    <Modal
      title={view.kind === "search" ? (meal ? `Add to ${meal}` : "Add an ingredient") : titles[view.kind]}
      onClose={() => {
        search.cancel();
        onClose();
      }}
    >
      {view.kind === "search" && (
        <SearchPanel
          search={search}
          local={local}
          favorites={favorites}
          onPick={pick}
          onCustom={() => setView({ kind: "custom" })}
          onScan={() => {
            search.cancel();
            setView({ kind: "scan" });
          }}
        />
      )}
      {view.kind === "scan" && <BarcodeScanner onBack={back} onPick={pick} />}
      {view.kind === "custom" && (
        <>
          <button className="text-button" onClick={back}>
            Back to search
          </button>
          <CustomFood onSave={pick} />
        </>
      )}
      {view.kind === "portion" && (
        <>
          <button className="text-button" onClick={back}>
            Back to foods
          </button>
          {!isStorable(view.food) && (
            <p className="error">
              Your FatSecret plan allows search without storage, so this food can’t be saved. Add it as a new food from
              its label instead.
            </p>
          )}
          <PortionEditor
            key={view.food.id}
            food={view.food}
            initial={lastPortion(data, view.food.id, meal)}
            onSave={async (p) => {
              if (!(await onPick(p))) return;
              if (!meal || !data.settings.searchAgain) return onClose();
              search.reset();
              back();
            }}
            label={meal ? `Log to ${meal}` : "Add ingredient"}
          />
        </>
      )}
    </Modal>
  );
}
