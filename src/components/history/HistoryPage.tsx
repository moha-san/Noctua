"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { History, Swords, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { clearHistory } from "@/lib/history";
import { Card } from "@/components/ui/Card";
import { GamesTable } from "./GamesTable";
import { useHistory } from "@/hooks/useHistory";

const FILTERS = [
  ["all", "Todas"],
  ["win", "Victorias"],
  ["draw", "Tablas"],
  ["loss", "Derrotas"],
] as const;

/** Mis partidas: todo el historial con filtros y acceso al análisis. */
export function HistoryPage() {
  const { rows, saved, rating, ratingDelta } = useHistory();
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>("all");
  const [includeSamples, setIncludeSamples] = useState(true);
  const [confirm, setConfirm] = useState(false);

  const visible = useMemo(
    () => rows.filter((r) => (filter === "all" || r.result === filter) && (includeSamples || r.source !== "sample")),
    [rows, filter, includeSamples],
  );
  const own = saved.length;
  const wins = saved.filter((g) => g.result === "win").length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {[
          ["Elo en la plataforma", rating, ratingDelta ? `${ratingDelta > 0 ? "+" : ""}${ratingDelta} desde el inicio` : "Juega para moverlo"],
          ["Partidas jugadas aquí", own, own ? `${wins} victorias` : "Aún ninguna"],
          ["Porcentaje de victorias", own ? `${Math.round((wins / own) * 100)}%` : "—", "Solo partidas propias"],
          ["Última partida", saved[0] ? (saved[0].result === "win" ? "Victoria" : saved[0].result === "loss" ? "Derrota" : "Tablas") : "—", saved[0]?.opponent ?? "Sin datos"],
        ].map(([label, value, hint]) => (
          <div key={label as string} className="card px-5 py-6 sm:px-7">
            <p className="label">{label}</p>
            <p className="mt-4 truncate font-serif text-[30px] leading-none text-ink tabular-nums sm:text-[36px]">{value}</p>
            <p className="mt-3 truncate text-[12.5px] text-ink-4">{hint}</p>
          </div>
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 pt-6 sm:px-8 sm:pt-7">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className={cn("rounded-full border px-4 py-1.5 text-[13px] transition", filter === k ? "border-gold bg-gold/10 text-ink" : "border-line text-ink-3 hover:border-ink-4")}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 text-[13px] text-ink-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" className="accent-[rgb(var(--gold))]" checked={includeSamples} onChange={(e) => setIncludeSamples(e.target.checked)} />
              Mostrar partidas de ejemplo
            </label>
            {own > 0 &&
              (confirm ? (
                <span className="flex items-center gap-2">
                  ¿Borrar {own} partidas?
                  <button className="text-bad underline" onClick={() => { clearHistory(); setConfirm(false); }}>Sí</button>
                  <button className="underline" onClick={() => setConfirm(false)}>No</button>
                </span>
              ) : (
                <button className="flex items-center gap-1.5 hover:text-bad" onClick={() => setConfirm(true)}><Trash2 className="h-3.5 w-3.5" /> Borrar historial</button>
              ))}
          </div>
        </div>
        <div className="mt-6">
          {visible.length ? (
            <GamesTable rows={visible} showSource />
          ) : (
            <div className="grid place-items-center gap-4 border-t border-line px-6 py-16 text-center">
              <History className="h-10 w-10 text-ink-4" strokeWidth={1.2} />
              <p className="font-serif text-[20px] text-ink">No hay partidas con este filtro</p>
              <p className="max-w-sm text-[14px] text-ink-3">Las partidas que juegues contra el ordenador o en torneos aparecerán aquí automáticamente.</p>
              <Link href="/play" className="btn-primary mt-2 px-6 py-2.5"><Swords className="h-4 w-4" /> Jugar ahora</Link>
            </div>
          )}
        </div>
        <div className="h-3" />
      </Card>
    </div>
  );
}
