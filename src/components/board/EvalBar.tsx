"use client";

import { cn } from "@/lib/cn";
import { evalToCp, formatEval, winChance } from "@/lib/chess/evaluation";
import type { Evaluation } from "@/lib/engine/types";

type Props = {
  evaluation: Pick<Evaluation, "cp" | "mate"> | null;
  orientation?: "white" | "black";
  className?: string;
};

/**
 * Barra de evaluación vertical. La parte blanca crece con la ventaja de blancas.
 * Usa la probabilidad de victoria (no cp lineal) para que se sienta natural.
 */
export function EvalBar({ evaluation, orientation = "white", className }: Props) {
  const cp = evaluation ? evalToCp(evaluation) : 0;
  const white = evaluation ? winChance(cp) : 50;
  const whiteAhead = cp >= 0;
  const label = evaluation ? formatEval(evaluation).replace("+", "") : "0.0";
  const flipped = orientation === "black";

  return (
    <div className={cn("relative w-6 shrink-0 overflow-hidden rounded-[3px] bg-ebony shadow-board sm:w-7", className)}>
      <div
        className={cn("absolute inset-x-0 bg-ivory transition-[height] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]", flipped ? "top-0" : "bottom-0")}
        style={{ height: `${white}%` }}
      />
      {/* Línea central de igualdad */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-gold" />
      <span
        className={cn(
          "absolute inset-x-0 text-center font-serif text-[10px] font-semibold tabular-nums sm:text-[11px]",
          whiteAhead !== flipped ? "bottom-1.5" : "top-1.5",
          whiteAhead ? "text-on-ivory" : "text-ivory",
        )}
      >
        {label}
      </span>
    </div>
  );
}
