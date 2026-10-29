"use client";

import { Chess } from "chess.js";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronsLeft, FlipVertical2, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { BOOK, lineMoves, type BookLine } from "@/lib/data/openingBook";
import type { Evaluation } from "@/lib/engine/types";
import { formatEval } from "@/lib/chess/evaluation";
import { useStockfish } from "@/hooks/useStockfish";
import { playSound, soundForMove } from "@/lib/sound";
import { Board } from "@/components/board/Board";
import { EvalBar } from "@/components/board/EvalBar";
import { useSan } from "@/lib/notation";

const startsWith = (a: string[], prefix: string[]) => prefix.every((m, i) => a[i] === m);

/** Explorador de aperturas: libro con nombres + valoración de Stockfish. */
export function OpeningExplorer() {
  const fmt = useSan();
  const [moves, setMoves] = useState<string[]>([]);
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [query, setQuery] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const { engine, isReal } = useStockfish();

  const { fen, lastMove } = useMemo(() => {
    const c = new Chess();
    let last: { from: string; to: string } | null = null;
    for (const m of moves) last = c.move(m);
    return { fen: c.fen(), lastMove: last };
  }, [moves]);

  // Línea con nombre más profunda contenida en las jugadas actuales
  const current = useMemo(() => {
    let best: BookLine | null = null;
    for (const l of BOOK) {
      const lm = lineMoves(l);
      if (lm.length <= moves.length && startsWith(moves, lm) && (!best || lm.length > lineMoves(best).length)) best = l;
    }
    return best;
  }, [moves]);

  // Continuaciones del libro desde aquí
  const continuations = useMemo(() => {
    const map = new Map<string, BookLine[]>();
    for (const l of BOOK) {
      const lm = lineMoves(l);
      if (lm.length > moves.length && startsWith(lm, moves)) {
        const next = lm[moves.length];
        map.set(next, [...(map.get(next) ?? []), l]);
      }
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [moves]);

  useEffect(() => {
    if (!engine) return;
    let cancelled = false;
    setEvaluation(null);
    engine.evaluate(fen, isReal ? 14 : 2).then((e) => !cancelled && setEvaluation(e));
    return () => {
      cancelled = true;
    };
  }, [engine, fen, isReal]);

  const bestSan = useMemo(() => {
    if (!evaluation?.bestMove) return null;
    try {
      return new Chess(fen).move({ from: evaluation.bestMove.slice(0, 2), to: evaluation.bestMove.slice(2, 4), promotion: evaluation.bestMove[4] }).san;
    } catch {
      return null;
    }
  }, [evaluation, fen]);

  const play = (san: string) => {
    const c = new Chess(fen);
    try {
      const m = c.move(san);
      soundForMove(m);
      setMoves([...moves, m.san]);
      return true;
    } catch {
      return false;
    }
  };

  const onDrop = ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) => {
    if (!targetSquare) return false;
    const c = new Chess(fen);
    try {
      const m = c.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
      soundForMove(m);
      setMoves([...moves, m.san]);
      return true;
    } catch {
      return false;
    }
  };

  const families = useMemo(() => {
    const q = query.trim().toLowerCase();
    const groups = new Map<string, BookLine[]>();
    for (const l of BOOK) {
      if (q && !`${l.name} ${l.eco}`.toLowerCase().includes(q)) continue;
      groups.set(l.family, [...(groups.get(l.family) ?? []), l]);
    }
    return [...groups.entries()];
  }, [query]);

  const inBook = continuations.length > 0 || (current && lineMoves(current).length === moves.length);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-12">
      <section className="mx-auto w-full max-w-[min(100%,calc(100dvh-340px))]">
        <div className="mb-3 min-h-[56px]">
          <p className="label text-gold">{current ? `${current.eco} · ${current.family}` : moves.length ? "Fuera del libro" : "Posición inicial"}</p>
          <p className="mt-1 truncate font-serif text-[24px] text-ink">{current?.name ?? (moves.length ? "Línea sin nombre" : "Elige la primera jugada")}</p>
        </div>
        <div className="flex gap-4">
          <EvalBar evaluation={evaluation} orientation={orientation} />
          <div className="min-w-0 flex-1">
            <Board
              id="explorer"
              position={fen}
              boardOrientation={orientation}
              onPieceDrop={onDrop}
              squareStyles={lastMove ? { [lastMove.from]: { background: "rgba(196,160,72,0.4)" }, [lastMove.to]: { background: "rgba(196,160,72,0.55)" } } : {}}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button className="icon-btn" title="Volver al inicio" aria-label="Volver al inicio" onClick={() => setMoves([])} disabled={!moves.length}><ChevronsLeft className="h-4 w-4" /></button>
          <button className="icon-btn" title="Deshacer jugada" aria-label="Deshacer jugada" onClick={() => setMoves(moves.slice(0, -1))} disabled={!moves.length}><ChevronLeft className="h-4 w-4" /></button>
          <button className="icon-btn" title="Girar tablero" aria-label="Girar tablero" onClick={() => setOrientation((o) => (o === "white" ? "black" : "white"))}><FlipVertical2 className="h-4 w-4" /></button>
        </div>
      </section>

      <aside className="space-y-6">
        <div className="card p-6">
          <p className="label">Jugadas</p>
          <p className="mt-2 min-h-[24px] font-serif text-[15.5px] leading-relaxed text-ink">
            {moves.length === 0 ? <span className="italic text-ink-4">Mueve una pieza o elige una continuación.</span> : moves.map((m, i) => (
              <button key={i} onClick={() => setMoves(moves.slice(0, i + 1))} className="mr-1.5 rounded px-0.5 hover:bg-gold/15">
                {i % 2 === 0 && <span className="text-ink-4">{i / 2 + 1}.</span>}{m}
              </button>
            ))}
          </p>
          {current && <p className="mt-4 border-t border-line pt-4 text-[14px] leading-relaxed text-ink-3">{current.desc}</p>}
          <div className="mt-4 flex items-center justify-between rounded-xl bg-paper-2 px-4 py-3 text-[13.5px]">
            <span className="text-ink-3">Motor{isReal ? " (Stockfish)" : ""}</span>
            <span className="tabular-nums text-ink">{evaluation ? `${formatEval(evaluation)}${bestSan ? ` · mejor: ${bestSan}` : ""}` : "Calculando…"}</span>
          </div>
        </div>

        <div className="card p-3">
          <p className="px-3 pb-2 pt-3 label">{inBook ? "Continuaciones del libro" : "Sin más líneas en el libro"}</p>
          {continuations.length === 0 && <p className="px-3 pb-3 text-[13.5px] text-ink-4">Puedes seguir moviendo libremente; el motor sigue valorando la posición.</p>}
          {continuations.map(([san, lines]) => (
            <button key={san} onClick={() => play(san)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-ink/[0.04]">
              <span className="w-14 shrink-0 font-serif text-[17px] text-ink">{fmt(san)}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink-3">{[...new Set(lines.map((l) => l.name))].slice(0, 3).join(" · ")}</span>
              <span className="text-[12px] tabular-nums text-ink-4">{lines.length}</span>
            </button>
          ))}
        </div>

        <div className="card p-3">
          <label className="mx-2 mt-2 flex items-center gap-2 rounded-full border border-line bg-paper px-3.5 py-2">
            <Search className="h-4 w-4 text-ink-4" />
            <input className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-4" placeholder="Buscar apertura o código ECO" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <div className="mt-2 max-h-[380px] overflow-y-auto">
            {families.map(([family, lines]) => (
              <div key={family} className="py-1">
                <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-4">{family}</p>
                {lines.map((l) => (
                  <button key={l.name} onClick={() => setMoves(lineMoves(l))} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition", current?.name === l.name ? "bg-gold/10" : "hover:bg-ink/[0.04]")}>
                    <span className="w-9 shrink-0 text-[12px] tabular-nums text-ink-4">{l.eco}</span>
                    <span className="truncate font-serif text-[15px] text-ink">{l.name}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
