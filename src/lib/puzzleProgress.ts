/** Progreso de problemas guardado en el navegador. */
export type PuzzleProgress = {
  rating: number;
  solved: string[];
  failed: string[];
  streak: number;
  bestStreak: number;
  rushBest: number;
};

const KEY = "athenaeum-puzzles";
export const DEFAULT_PROGRESS: PuzzleProgress = { rating: 1200, solved: [], failed: [], streak: 0, bestStreak: 0, rushBest: 0 };

export function loadProgress(): PuzzleProgress {
  try {
    const v = localStorage.getItem(KEY);
    return v ? { ...DEFAULT_PROGRESS, ...JSON.parse(v) } : DEFAULT_PROGRESS;
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function saveProgress(p: PuzzleProgress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

/** Cambio de puntuación como en el Elo (K = 24). */
export function puzzleDelta(rating: number, puzzleRating: number, solved: boolean) {
  const expected = 1 / (1 + Math.pow(10, (puzzleRating - rating) / 400));
  return Math.round(24 * ((solved ? 1 : 0) - expected));
}
