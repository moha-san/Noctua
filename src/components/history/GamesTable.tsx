"use client";

import Link from "next/link";
import { Microscope } from "lucide-react";
import { cn } from "@/lib/cn";
import { saveReviewPgn } from "@/lib/reviewStore";
import type { GameRow } from "@/hooks/useHistory";

export const RESULT_STYLE = {
  win: { label: "Victoria", cls: "bg-good/10 text-good ring-good/20", dot: "bg-good" },
  loss: { label: "Derrota", cls: "bg-bad/10 text-bad ring-bad/20", dot: "bg-bad" },
  draw: { label: "Tablas", cls: "bg-ink-4/15 text-ink-2 ring-ink-4/20", dot: "bg-ink-4" },
};

const accColor = (a: number) => (a >= 85 ? "text-good" : a >= 70 ? "text-warn" : "text-bad");
const SOURCE = { play: "Contra el ordenador", tournament: "Torneo", sample: "Ejemplo" } as const;

/** Tabla de partidas reutilizada en Inicio y en Mis partidas. */
export function GamesTable({ rows, showSource = false }: { rows: GameRow[]; showSource?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-sm">
        <thead>
          <tr className="border-y border-line text-left">
            {["Rival", "Resultado", "Precisión", ...(showSource ? ["Elo"] : []), "Jugadas", "Ritmo", ""].map((h, i) => (
              <th key={i} className="label px-4 py-4 font-semibold first:pl-6 first:sm:pl-8">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((g) => {
            const r = RESULT_STYLE[g.result];
            return (
              <tr key={g.id} className="group transition-colors hover:bg-ink/[0.02]">
                <td className="px-6 py-4 sm:pl-8">
                  <div className="flex items-center gap-3">
                    <span className={cn("h-3.5 w-3.5 shrink-0 rounded-[4px] ring-1 ring-line", g.color === "w" ? "bg-ivory" : "bg-ebony")} title={g.color === "w" ? "Jugaste con blancas" : "Jugaste con negras"} />
                    <div className="min-w-0">
                      <p className="truncate font-serif text-[16px] text-ink">{g.opponent} <span className="font-normal text-ink-4">({g.opponentRating})</span></p>
                      <p className="truncate text-xs text-ink-4">{g.opening} · {g.date}{showSource ? ` · ${SOURCE[g.source]}` : ""}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ring-1", r.cls)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", r.dot)} />{r.label}
                  </span>
                </td>
                <td className={cn("px-4 py-4 font-serif text-[16px] tabular-nums", g.accuracy == null ? "text-ink-4" : accColor(g.accuracy))}>{g.accuracy == null ? "—" : `${g.accuracy.toFixed(1)}%`}</td>
                {showSource && (
                  <td className={cn("px-4 py-4 font-serif text-[16px] tabular-nums", g.ratingChange == null ? "text-ink-4" : g.ratingChange > 0 ? "text-good" : g.ratingChange < 0 ? "text-bad" : "text-ink-3")}>
                    {g.ratingChange == null ? "—" : `${g.ratingChange > 0 ? "+" : ""}${g.ratingChange}`}
                  </td>
                )}
                <td className="px-4 py-4 tabular-nums text-ink-3">{g.moves}</td>
                <td className="px-4 py-4 text-ink-3">{g.timeControl}</td>
                <td className="whitespace-nowrap px-4 py-4 text-right sm:pr-6">
                  <Link
                    href={g.reviewHref}
                    onClick={() => g.source !== "sample" && saveReviewPgn(g.pgn, g.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3.5 py-1.5 text-xs font-medium text-ink-2 transition hover:border-gold hover:text-ink"
                  >
                    <Microscope className="h-3.5 w-3.5" /> Analizar
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
