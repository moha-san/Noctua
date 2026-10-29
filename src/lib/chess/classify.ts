export type MoveClass =
  | "brilliant"
  | "best"
  | "excellent"
  | "good"
  | "book"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export const MOVE_CLASS: Record<
  MoveClass,
  { label: string; symbol: string; color: string; text: string; bg: string; ring: string }
> = {
  brilliant: { label: "Brillante", symbol: "!!", color: "#2f7d7a", text: "text-move-brilliant", bg: "bg-move-brilliant", ring: "ring-move-brilliant/40" },
  best: { label: "Mejor jugada", symbol: "★", color: "#4f7a4a", text: "text-move-best", bg: "bg-move-best", ring: "ring-move-best/40" },
  excellent: { label: "Excelente", symbol: "!", color: "#6f8f4e", text: "text-move-excellent", bg: "bg-move-excellent", ring: "ring-move-excellent/40" },
  good: { label: "Buena", symbol: "✓", color: "#8f9a6c", text: "text-move-good", bg: "bg-move-good", ring: "ring-move-good/40" },
  book: { label: "Jugada de libro", symbol: "📖", color: "#8b6b4a", text: "text-move-book", bg: "bg-move-book", ring: "ring-move-book/40" },
  inaccuracy: { label: "Dudosa", symbol: "?!", color: "#c4972f", text: "text-move-inaccuracy", bg: "bg-move-inaccuracy", ring: "ring-move-inaccuracy/40" },
  mistake: { label: "Mala", symbol: "?", color: "#c06a2b", text: "text-move-mistake", bg: "bg-move-mistake", ring: "ring-move-mistake/40" },
  blunder: { label: "Error grave", symbol: "??", color: "#9b2f25", text: "text-move-blunder", bg: "bg-move-blunder", ring: "ring-move-blunder/40" },
};

export const CLASS_ORDER: MoveClass[] = [
  "brilliant", "best", "excellent", "good", "book", "inaccuracy", "mistake", "blunder",
];

/**
 * Clasifica una jugada según la caída de probabilidad de victoria del jugador que mueve.
 * @param wcBefore probabilidad de victoria (0-100) del jugador ANTES de mover
 * @param wcAfter  probabilidad de victoria (0-100) del jugador DESPUÉS de mover
 */
export function classifyMove(opts: {
  wcBefore: number;
  wcAfter: number;
  isBest: boolean;
  isBook: boolean;
  isSacrifice: boolean;
}): MoveClass {
  const { wcBefore, wcAfter, isBest, isBook, isSacrifice } = opts;
  if (isBook) return "book";
  const loss = wcBefore - wcAfter;
  // Brillante: sacrificio de material que es la mejor jugada y no estaba ya ganado
  if (isBest && isSacrifice && wcAfter >= 50 && wcBefore < 97) return "brilliant";
  if (isBest || loss <= 0.5) return "best";
  if (loss <= 2.5) return "excellent";
  if (loss <= 6) return "good";
  if (loss <= 12) return "inaccuracy";
  if (loss <= 22) return "mistake";
  return "blunder";
}

/** Precisión (0-100) a partir de la pérdida media, curva similar a la de Lichess. */
export function accuracyFromLoss(loss: number): number {
  const acc = 103.1668 * Math.exp(-0.04354 * loss) - 3.1669;
  return Math.max(0, Math.min(100, acc));
}
