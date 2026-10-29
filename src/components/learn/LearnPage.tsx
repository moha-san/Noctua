"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { OpeningExplorer } from "./OpeningExplorer";
import { EndgameTrainer } from "./EndgameTrainer";
import { OpeningDrill } from "./OpeningDrill";

const TABS = [
  ["openings", "Aperturas", "Explora las líneas principales con su nombre y la valoración del motor."],
  ["drill", "Practicar", "Juega un bando de una apertura y adivina la jugada del libro en cada momento."],
  ["endgames", "Finales", "Practica los finales básicos contra Stockfish hasta dominarlos."],
] as const;

export function LearnPage({ initialTab = "openings" }: { initialTab?: "openings" | "drill" | "endgames" }) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>(initialTab);
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-xl text-[15px] leading-relaxed text-ink-3">{TABS.find((t) => t[0] === tab)![2]}</p>
        <div className="flex rounded-full border border-line bg-paper p-1">
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={cn("rounded-full px-5 py-2 text-[14px] transition", tab === k ? "bg-wood text-on-gold dark:bg-gold" : "text-ink-3 hover:text-ink")}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {tab === "openings" ? <OpeningExplorer /> : tab === "drill" ? <OpeningDrill /> : <EndgameTrainer />}
    </div>
  );
}
