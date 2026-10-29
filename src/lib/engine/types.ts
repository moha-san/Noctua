/** Evaluación siempre expresada desde el punto de vista de BLANCAS. */
export type Evaluation = {
  /** Centipeones (positivo = ventaja blanca). null si hay mate. */
  cp: number | null;
  /** Mate en N (positivo = blancas dan mate). null si no hay mate. */
  mate: number | null;
  /** Mejor jugada en formato UCI (ej. "e2e4"). */
  bestMove: string | null;
  /** Variante principal en UCI. */
  pv: string[];
  depth: number;
};

export interface ChessEngine {
  readonly name: string;
  readonly isReal: boolean;
  init(): Promise<void>;
  /** `skill` 0-20 (como el "Skill Level" de Stockfish): por debajo de 20 juega peor a propósito. */
  evaluate(fen: string, depth?: number, opts?: { skill?: number }): Promise<Evaluation>;
  stop(): void;
  destroy(): void;
}
