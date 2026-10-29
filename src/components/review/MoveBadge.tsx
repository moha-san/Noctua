import { cn } from "@/lib/cn";
import { MOVE_CLASS, type MoveClass } from "@/lib/chess/classify";

/** Icono circular de clasificación (estilo Chessigma / chess.com). */
export function MoveBadge({ cls, size = "md", className }: { cls: MoveClass; size?: "sm" | "md" | "lg"; className?: string }) {
  const c = MOVE_CLASS[cls];
  const dims = { sm: "h-4 w-4 text-[8px]", md: "h-5 w-5 text-[10px]", lg: "h-8 w-8 text-sm" }[size];
  return (
    <span
      title={c.label}
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-serif font-bold leading-none text-white shadow-[0_2px_6px_rgba(60,40,20,0.35)] ring-[1.5px] ring-white/70", dims, className)}
      style={{ backgroundColor: c.color }}
    >
      {cls === "book" ? "▤" : c.symbol}
    </span>
  );
}
