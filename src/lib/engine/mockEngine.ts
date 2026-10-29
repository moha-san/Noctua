import { Chess, type Move } from "chess.js";
import type { ChessEngine, Evaluation } from "./types";

const VALUES: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
const CENTER = new Set(["d4", "e4", "d5", "e5"]);

/** Evaluación estática muy simple: material + centro + movilidad (desde blancas). */
function staticEval(chess: Chess): number {
  if (chess.isCheckmate()) return chess.turn() === "w" ? -100000 : 100000;
  if (chess.isDraw()) return 0;
  let score = 0;
  for (const row of chess.board()) {
    for (const sq of row) {
      if (!sq) continue;
      const s = sq.color === "w" ? 1 : -1;
      score += s * VALUES[sq.type];
      if (CENTER.has(sq.square)) score += s * 15;
    }
  }
  const mobility = chess.moves().length * (chess.turn() === "w" ? 1 : -1);
  return score + mobility * 2;
}

/** Búsqueda negamax de 2 plies: suficiente para "simular" un motor en el frontend. */
function search(chess: Chess, depth: number, alpha: number, beta: number): number {
  const sign = chess.turn() === "w" ? 1 : -1;
  if (depth === 0 || chess.isGameOver()) return sign * staticEval(chess);
  let best = -Infinity;
  const moves = chess.moves({ verbose: true }) as Move[];
  moves.sort((a, b) => Number(!!b.captured) - Number(!!a.captured));
  for (const m of moves) {
    chess.move(m);
    const v = -search(chess, depth - 1, -beta, -alpha);
    chess.undo();
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

/** Motor de reserva cuando Stockfish no está disponible (SSR, sin WASM, etc.). */
export class MockEngine implements ChessEngine {
  readonly name = "Motor simulado";
  readonly isReal = false;
  async init() {}
  async evaluate(fen: string, _depth?: number, opts: { skill?: number } = {}): Promise<Evaluation> {
    const chess = new Chess(fen);
    const skill = opts.skill ?? 20;
    const sign = chess.turn() === "w" ? 1 : -1;
    if (chess.isGameOver()) {
      const mated = chess.isCheckmate();
      return { cp: mated ? (chess.turn() === "w" ? -10000 : 10000) : 0, mate: mated ? 0 : null, bestMove: null, pv: [], depth: 0 };
    }
    let bestMove: Move | null = null;
    let bestScore = -Infinity;
    for (const m of chess.moves({ verbose: true }) as Move[]) {
      chess.move(m);
      const v = -search(chess, 1, -Infinity, Infinity);
      chess.undo();
      if (v > bestScore) {
        bestScore = v;
        bestMove = m;
      }
    }
    // Con nivel bajo, a veces elige una jugada legal cualquiera
    if (skill < 20 && Math.random() > 0.35 + skill / 30) {
      const all = chess.moves({ verbose: true }) as Move[];
      bestMove = all[Math.floor(Math.random() * all.length)] ?? bestMove;
    }
    // Pequeña pausa para no bloquear la UI durante análisis largos
    await new Promise((r) => setTimeout(r, 0));
    const uci = bestMove ? bestMove.from + bestMove.to + (bestMove.promotion ?? "") : null;
    const isMate = Math.abs(bestScore) > 50000;
    return {
      cp: isMate ? null : Math.round(bestScore * sign),
      mate: isMate ? sign * (bestScore > 0 ? 1 : -1) : null,
      bestMove: uci,
      pv: uci ? [uci] : [],
      depth: 2,
    };
  }
  stop() {}
  destroy() {}
}
