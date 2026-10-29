import type { MoveClass } from "@/lib/chess/classify";
import { MoveBadge } from "./MoveBadge";

/** Coloca el icono de clasificación sobre la esquina de la casilla destino. */
export function BoardOverlay({ square, cls, orientation }: { square: string; cls: MoveClass; orientation: "white" | "black" }) {
  const file = square.charCodeAt(0) - 97; // a=0
  const rank = Number(square[1]) - 1; // 1=0
  const col = orientation === "white" ? file : 7 - file;
  const row = orientation === "white" ? 7 - rank : rank;
  return (
    <div
      key={square + cls}
      className="pointer-events-none absolute z-10 animate-fade-up"
      style={{ left: `${(col + 1) * 12.5}%`, top: `${row * 12.5}%`, transform: "translate(-62%, -38%)" }}
    >
      <MoveBadge cls={cls} size="lg" className="h-[clamp(18px,4.2cqw,32px)] w-[clamp(18px,4.2cqw,32px)] text-[clamp(8px,1.8cqw,14px)]" />
    </div>
  );
}
