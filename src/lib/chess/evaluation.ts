import type { Evaluation } from "@/lib/engine/types";

/** Convierte una evaluación a un valor "cp" acotado (mates = ±10000). */
export function evalToCp(e: Pick<Evaluation, "cp" | "mate">): number {
  // mate === 0 → posición de jaque mate; el ganador va en el signo de cp (±10000)
  if (e.mate !== null) return e.mate === 0 ? e.cp ?? 0 : Math.sign(e.mate) * (10000 - Math.abs(e.mate));
  return e.cp ?? 0;
}

/** Probabilidad de victoria de blancas (0-100), fórmula tipo Lichess. */
export function winChance(cp: number): number {
  const c = Math.max(-1500, Math.min(1500, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * c)) - 1);
}

/** Texto para mostrar: "+1.4", "-0.3", "M3", "-M2". */
export function formatEval(e: Pick<Evaluation, "cp" | "mate">): string {
  if (e.mate !== null) return e.mate === 0 ? ((e.cp ?? 0) >= 0 ? "1-0" : "0-1") : `${e.mate < 0 ? "-" : ""}M${Math.abs(e.mate)}`;
  const v = (e.cp ?? 0) / 100;
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}`;
}
