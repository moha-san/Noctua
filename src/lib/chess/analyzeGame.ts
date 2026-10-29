import { Chess, type Move } from "chess.js";
import type { ChessEngine, Evaluation } from "@/lib/engine/types";
import { accuracyFromLoss, classifyMove, type MoveClass } from "./classify";
import { evalToCp, winChance } from "./evaluation";
import { detectOpening } from "./openings";

const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export type AnalyzedMove = {
  ply: number; // 1 = primera jugada de blancas
  san: string;
  from: string;
  to: string;
  color: "w" | "b";
  fenBefore: string;
  fenAfter: string;
  evalAfter: Evaluation;
  bestMoveUci: string | null; // mejor jugada en la posición ANTERIOR
  bestMoveSan: string | null;
  classification: MoveClass;
  winLoss: number;
};

export type GameAnalysis = {
  moves: AnalyzedMove[];
  initialEval: Evaluation;
  opening: string | null;
  accuracy: { w: number; b: number };
  engineName: string;
};

function uciToSan(fen: string, uci: string | null): string | null {
  if (!uci) return null;
  try {
    const c = new Chess(fen);
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return m?.san ?? null;
  } catch {
    return null;
  }
}

function materialBalance(chess: Chess, color: "w" | "b") {
  let s = 0;
  for (const row of chess.board()) for (const p of row) if (p) s += (p.color === color ? 1 : -1) * PIECE_VALUE[p.type];
  return s;
}

/**
 * Analiza una partida completa jugada a jugada.
 * `onProgress` permite pintar la barra de progreso y resultados parciales.
 */
export async function analyzeGame(
  pgn: string,
  engine: ChessEngine,
  opts: { depth?: number; onProgress?: (done: number, total: number) => void; signal?: AbortSignal } = {},
): Promise<GameAnalysis> {
  const game = new Chess();
  game.loadPgn(pgn);
  const history = game.history({ verbose: true }) as Move[];
  const { name: opening, bookPlies } = detectOpening(history.map((m) => m.san));

  const replay = new Chess();
  const fens = [replay.fen()];
  for (const m of history) {
    replay.move(m.san);
    fens.push(replay.fen());
  }

  // 1) Evaluar todas las posiciones
  const evals: Evaluation[] = [];
  for (let i = 0; i < fens.length; i++) {
    if (opts.signal?.aborted) throw new DOMException("Cancelado", "AbortError");
    evals.push(await engine.evaluate(fens[i], opts.depth ?? 12));
    opts.onProgress?.(i + 1, fens.length);
  }

  // 2) Clasificar cada jugada
  const losses = { w: [] as number[], b: [] as number[] };
  const moves: AnalyzedMove[] = history.map((m, i) => {
    const before = evals[i];
    const after = evals[i + 1];
    const sign = m.color === "w" ? 1 : -1;
    const wcBefore = winChance(sign * evalToCp(before));
    // Si la jugada da mate, la evaluación posterior es "mate 0": máxima ventaja
    const mated = new Chess(fens[i + 1]).isCheckmate();
    if (mated) evals[i + 1] = { ...after, cp: sign * 10000, mate: 0 };
    const afterCp = mated ? sign * 10000 : evalToCp(after);
    const wcAfter = winChance(sign * afterCp);
    const uci = m.from + m.to + (m.promotion ?? "");
    const isBest = before.bestMove === uci;

    const pos = new Chess(fens[i + 1]);
    const matBefore = materialBalance(new Chess(fens[i]), m.color);
    const matAfter = materialBalance(pos, m.color);
    // Sacrificio: tras mover, el rival puede ganar material neto ≥ 2
    let isSacrifice = false;
    if (!pos.isGameOver()) {
      for (const reply of pos.moves({ verbose: true }) as Move[]) {
        if (reply.captured && PIECE_VALUE[reply.captured] - (matAfter - matBefore) >= 2 && PIECE_VALUE[reply.captured] >= 3) {
          isSacrifice = true;
          break;
        }
      }
    }

    const loss = Math.max(0, wcBefore - wcAfter);
    losses[m.color].push(loss);
    return {
      ply: i + 1,
      san: m.san,
      from: m.from,
      to: m.to,
      color: m.color,
      fenBefore: fens[i],
      fenAfter: fens[i + 1],
      evalAfter: evals[i + 1],
      bestMoveUci: before.bestMove,
      bestMoveSan: uciToSan(fens[i], before.bestMove),
      classification: classifyMove({ wcBefore, wcAfter, isBest, isBook: i < bookPlies, isSacrifice }),
      winLoss: loss,
    };
  });

  // Precisión = media de la precisión de cada jugada (como Lichess)
  const acc = (a: number[]) => (a.length ? a.reduce((x, l) => x + accuracyFromLoss(l), 0) / a.length : 100);
  return {
    moves,
    initialEval: evals[0],
    opening,
    accuracy: { w: acc(losses.w), b: acc(losses.b) },
    engineName: engine.name,
  };
}
