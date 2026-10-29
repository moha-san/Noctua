/** Niveles del ordenador en "Jugar". skill = Skill Level de Stockfish (0-20). */
export type Level = { id: number; name: string; rating: number; skill: number; depth: number };

export const LEVELS: Level[] = [
  { id: 1, name: "Principiante", rating: 600, skill: 0, depth: 1 },
  { id: 2, name: "Novato", rating: 900, skill: 2, depth: 2 },
  { id: 3, name: "Aficionado", rating: 1200, skill: 5, depth: 4 },
  { id: 4, name: "Jugador de club", rating: 1500, skill: 8, depth: 6 },
  { id: 5, name: "Avanzado", rating: 1800, skill: 12, depth: 8 },
  { id: 6, name: "Experto", rating: 2000, skill: 15, depth: 10 },
  { id: 7, name: "Maestro", rating: 2300, skill: 18, depth: 12 },
  { id: 8, name: "Máximo", rating: 2800, skill: 20, depth: 14 },
];

export type TimeControl = { id: string; label: string; kind: string; base: number; inc: number };

/** base e inc en segundos; base 0 = sin reloj */
export const TIME_CONTROLS: TimeControl[] = [
  { id: "none", label: "Sin reloj", kind: "Libre", base: 0, inc: 0 },
  { id: "10+0", label: "10 min", kind: "Rápida", base: 600, inc: 0 },
  { id: "5+3", label: "5 + 3", kind: "Blitz", base: 300, inc: 3 },
  { id: "3+2", label: "3 + 2", kind: "Blitz", base: 180, inc: 2 },
  { id: "1+0", label: "1 min", kind: "Bala", base: 60, inc: 0 },
];

export const fmtClock = (ms: number) => {
  const s = Math.max(0, ms / 1000);
  if (s < 10) return `0:0${s.toFixed(1)}`;
  const t = Math.ceil(s);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

const VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const START: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };

/** Piezas capturadas por cada bando y ventaja material, a partir del FEN. */
export function material(fen: string) {
  const board = fen.split(" ")[0];
  const count = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 } as Record<string, number>, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } as Record<string, number> };
  for (const ch of board) {
    if (!/[pnbrq]/i.test(ch)) continue;
    const side = ch === ch.toUpperCase() ? "w" : "b";
    count[side][ch.toLowerCase()]++;
  }
  // captured.w = piezas negras que han capturado las blancas
  const captured = { w: [] as string[], b: [] as string[] };
  let score = 0;
  for (const t of ["q", "r", "b", "n", "p"]) {
    for (let i = count.b[t]; i < START[t]; i++) captured.w.push(t);
    for (let i = count.w[t]; i < START[t]; i++) captured.b.push(t);
    score += (count.w[t] - count.b[t]) * VALUES[t];
  }
  return { captured, score };
}
