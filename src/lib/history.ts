/** Historial local de partidas (jugar y torneos) y Elo propio. Todo vive en el navegador. */
export type SavedGame = {
  id: string;
  date: string; // ISO
  source: "play" | "tournament";
  opponent: string;
  opponentRating: number;
  color: "w" | "b";
  result: "win" | "loss" | "draw";
  reason: string;
  timeControl: string;
  moves: number;
  pgn: string;
  ratingChange: number;
  /** Precisión del usuario, cuando la partida se ha analizado */
  accuracy?: number;
};

const GAMES = "athenaeum-games";
const RATING = "athenaeum-rating";
export const HISTORY_EVENT = "athenaeum-history";

const read = <T,>(k: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};

export function loadGames(): SavedGame[] {
  return typeof window === "undefined" ? [] : read<SavedGame[]>(GAMES, []);
}

export function loadRating(base: number): number {
  return typeof window === "undefined" ? base : read<number>(RATING, base);
}

/** Cambio de Elo con K=24. */
export function eloChange(me: number, opp: number, score: number, k = 24) {
  const expected = 1 / (1 + Math.pow(10, (opp - me) / 400));
  return Math.round(k * (score - expected));
}

export function saveGame(g: Omit<SavedGame, "id" | "date" | "ratingChange">, baseRating: number): SavedGame {
  const rating = loadRating(baseRating);
  const score = g.result === "win" ? 1 : g.result === "draw" ? 0.5 : 0;
  // Partidas muy cortas no cuentan para el Elo
  const change = g.moves >= 4 ? eloChange(rating, g.opponentRating, score) : 0;
  const saved: SavedGame = { ...g, id: `${Date.now().toString(36)}`, date: new Date().toISOString(), ratingChange: change };
  try {
    localStorage.setItem(GAMES, JSON.stringify([saved, ...loadGames()].slice(0, 200)));
    localStorage.setItem(RATING, JSON.stringify(rating + change));
    window.dispatchEvent(new Event(HISTORY_EVENT));
  } catch {}
  return saved;
}

export function clearHistory() {
  try {
    localStorage.removeItem(GAMES);
    localStorage.removeItem(RATING);
    window.dispatchEvent(new Event(HISTORY_EVENT));
  } catch {}
}

export const RESULT_LABEL = { win: "Victoria", loss: "Derrota", draw: "Tablas" } as const;

/** Guarda la precisión calculada en el análisis. */
export function setGameAccuracy(id: string, accuracy: number) {
  try {
    const games = loadGames().map((g) => (g.id === id ? { ...g, accuracy: Math.round(accuracy * 10) / 10 } : g));
    localStorage.setItem(GAMES, JSON.stringify(games));
    window.dispatchEvent(new Event(HISTORY_EVENT));
  } catch {}
}
