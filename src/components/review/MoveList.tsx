"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { MOVE_CLASS } from "@/lib/chess/classify";
import type { AnalyzedMove } from "@/lib/chess/analyzeGame";
import { MoveBadge } from "./MoveBadge";

type Props = { moves: AnalyzedMove[]; ply: number; onSelect: (ply: number) => void };

/** Lista de jugadas en notación algebraica, en dos columnas (blancas / negras). */
export function MoveList({ moves, ply, onSelect }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [ply]);

  const rows: [AnalyzedMove, AnalyzedMove | undefined][] = [];
  for (let i = 0; i < moves.length; i += 2) rows.push([moves[i], moves[i + 1]]);

  const Cell = ({ m }: { m?: AnalyzedMove }) => {
    if (!m) return <span />;
    const active = m.ply === ply;
    const c = MOVE_CLASS[m.classification];
    const highlight = ["brilliant", "inaccuracy", "mistake", "blunder"].includes(m.classification);
    return (
      <button
        ref={active ? activeRef : undefined}
        onClick={() => onSelect(m.ply)}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left font-serif text-[15px] tabular-nums transition",
          active ? "bg-gold/15 text-ink ring-1 ring-gold/40" : "text-ink-2 hover:bg-ink/[0.04]",
        )}
      >
        <MoveBadge cls={m.classification} size="sm" />
        <span style={highlight ? { color: c.color } : undefined}>{m.san}</span>
      </button>
    );
  };

  return (
    <div className="max-h-[320px] overflow-y-auto px-3 py-3 lg:max-h-none lg:flex-1">
      {rows.map(([w, b], i) => (
        <div key={i} className={cn("grid grid-cols-[40px_1fr_1fr] items-center gap-1 border-b border-dotted border-line px-1 py-0.5 last:border-0")}>
          <span className="pl-2 font-serif text-[13px] italic text-ink-4 tabular-nums">{i + 1}.</span>
          <Cell m={w} />
          <Cell m={b} />
        </div>
      ))}
    </div>
  );
}
