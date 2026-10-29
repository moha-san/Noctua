"use client";

import { useMemo } from "react";
import { evalToCp } from "@/lib/chess/evaluation";
import type { GameAnalysis } from "@/lib/chess/analyzeGame";

const LIMIT = 800;

/**
 * Gráfico de ventaja a lo largo de la partida (SVG propio, sin dependencias).
 * Marfil = ventaja de blancas, ébano = ventaja de negras. Clic para saltar a una jugada.
 */
export function EvalGraph({ analysis, ply, onSelect }: { analysis: GameAnalysis; ply: number; onSelect: (p: number) => void }) {
  const values = useMemo(
    () => [analysis.initialEval, ...analysis.moves.map((m) => m.evalAfter)].map((e) => Math.max(-LIMIT, Math.min(LIMIT, evalToCp(e)))),
    [analysis],
  );
  const W = 100;
  const H = 40;
  const n = Math.max(1, values.length - 1);
  const x = (i: number) => (i / n) * W;
  const y = (v: number) => H / 2 - (v / LIMIT) * (H / 2);
  const line = values.map((v, i) => `${x(i)},${y(v)}`).join(" L ");
  const area = `M 0,${H} L ${line} L ${W},${H} Z`;

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onSelect(Math.round(((e.clientX - rect.left) / rect.width) * n));
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      onClick={handleClick}
      className="block h-20 w-full cursor-pointer overflow-hidden rounded-[4px] bg-ebony ring-1 ring-line"
      role="img"
      aria-label="Gráfico de evaluación"
    >
      <path d={area} fill="#f6f1e6" />
      <path d={`M ${line}`} fill="none" stroke="#d9c9a8" strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
      <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="#b08a3e" strokeOpacity={0.7} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
      <line x1={x(ply)} x2={x(ply)} y1={0} y2={H} stroke="#b08a3e" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
