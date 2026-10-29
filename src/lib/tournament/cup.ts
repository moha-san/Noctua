/**
 * Copa eliminatoria: 8 jugadores, cuartos, semifinal y final a una partida.
 * Si hay tablas, pasa quien jugó con negras (como en el «armagedón»).
 * Las partidas entre bots se simulan con la fórmula de Elo, siempre con ganador.
 */
import { SCHOOL, type Player, type Result } from "./swiss";

export type Match = { a: string; b: string; white: string; winner: string | null; result: Result | null; pgn?: string };
export type CupRound = { name: string; matches: Match[] };
export type CupState = { id: string; players: Player[]; rounds: CupRound[]; finished: boolean; champion: string | null };

const NAMES = ["Cuartos de final", "Semifinal", "Final"];

export function createCup(userName: string, userRating: number): CupState {
  const players: Player[] = [
    { id: "you", name: userName, title: "Tú", rating: userRating, isUser: true, skill: 20, depth: 0 },
    ...SCHOOL.map((p, i) => ({ ...p, id: `b${i}` })),
  ];
  // Cabezas de serie por Elo: 1-8, 4-5, 2-7, 3-6
  const seeds = [...players].sort((x, y) => y.rating - x.rating).map((p) => p.id);
  const pairs: [number, number][] = [[0, 7], [3, 4], [1, 6], [2, 5]];
  const matches = pairs.map(([i, j]) => makeMatch(seeds[i], seeds[j]));
  return { id: `cup-${Date.now()}`, players, rounds: [{ name: NAMES[0], matches }], finished: false, champion: null };
}

function makeMatch(a: string, b: string): Match {
  const white = Math.random() < 0.5 ? a : b;
  return { a, b, white, winner: null, result: null };
}

export const black = (m: Match) => (m.white === m.a ? m.b : m.a);

/** Ganador según el resultado (desde blancas). Tablas: pasan las negras. */
function winnerOf(m: Match, r: Result) {
  return r === 1 ? m.white : black(m);
}

function simulate(m: Match, byId: (id: string) => Player): Result {
  const w = byId(m.white), b = byId(black(m));
  const expected = 1 / (1 + 10 ** ((b.rating - w.rating - 35) / 400));
  return Math.random() < expected ? 1 : 0;
}

export function cupRound(c: CupState) {
  return c.rounds[c.rounds.length - 1];
}

/** El duelo del usuario en la ronda actual, si sigue en la copa. */
export function userMatch(c: CupState) {
  return cupRound(c).matches.find((m) => (m.a === "you" || m.b === "you") && m.winner === null);
}

export function eliminated(c: CupState) {
  return c.rounds.some((r) => r.matches.some((m) => (m.a === "you" || m.b === "you") && m.winner && m.winner !== "you"));
}

/** Cierra la ronda actual (con el resultado del usuario si juega) y abre la siguiente. */
function advance(c: CupState): CupState {
  const byId = (id: string) => c.players.find((p) => p.id === id)!;
  const round = cupRound(c);
  for (const m of round.matches)
    if (m.winner === null) {
      m.result = simulate(m, byId);
      m.winner = winnerOf(m, m.result);
    }
  const winners = round.matches.map((m) => m.winner!);
  if (winners.length === 1) {
    c.finished = true;
    c.champion = winners[0];
    return c;
  }
  const matches: Match[] = [];
  for (let i = 0; i < winners.length; i += 2) matches.push(makeMatch(winners[i], winners[i + 1]));
  c.rounds.push({ name: NAMES[c.rounds.length], matches });
  return c;
}

export function finishUserCupGame(c: CupState, result: Result, pgn: string): CupState {
  let next: CupState = structuredClone(c);
  const m = userMatch(next);
  if (m) {
    m.result = result;
    m.pgn = pgn;
    m.winner = winnerOf(m, result);
  }
  next = advance(next);
  // Eliminado: el resto de la copa se juega sola
  while (!next.finished && !userMatch(next)) next = advance(next);
  return next;
}
