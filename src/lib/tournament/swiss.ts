/**
 * Torneo suizo sencillo: N jugadores, R rondas, emparejamiento por puntos
 * sin repetir rival. Las partidas entre bots se simulan con la fórmula de Elo.
 */
export type Player = {
  id: string;
  name: string;
  title: string; // ciudad
  rating: number;
  isUser?: boolean;
  /** Nivel Stockfish 0-20 y profundidad con la que juega el bot */
  skill: number;
  depth: number;
};

export type Result = 1 | 0.5 | 0; // desde el punto de vista de blancas
export type Pairing = { white: string; black: string; result: Result | null; pgn?: string };
export type Round = { number: number; pairings: Pairing[] };

export type TournamentState = {
  id: string;
  players: Player[];
  rounds: Round[];
  totalRounds: number;
  finished: boolean;
};

export const SCHOOL: Omit<Player, "id">[] = [
  { name: "Javier Morales", title: "Madrid", rating: 1620, skill: 8, depth: 8 },
  { name: "Laura Gómez", title: "Sevilla", rating: 1560, skill: 6, depth: 6 },
  { name: "Andrés Castillo", title: "Valencia", rating: 1500, skill: 5, depth: 5 },
  { name: "Sofía Herrera", title: "Bilbao", rating: 1430, skill: 4, depth: 4 },
  { name: "Pablo Ortega", title: "Zaragoza", rating: 1370, skill: 3, depth: 3 },
  { name: "Elena Vidal", title: "Barcelona", rating: 1300, skill: 2, depth: 3 },
  { name: "Miguel Santos", title: "Málaga", rating: 1220, skill: 1, depth: 2 },
];

export function createTournament(userName: string, userRating: number, totalRounds = 5): TournamentState {
  const players: Player[] = [
    { id: "you", name: userName, title: "Tú", rating: userRating, isUser: true, skill: 20, depth: 0 },
    ...SCHOOL.map((p, i) => ({ ...p, id: `b${i}` })),
  ];
  const t: TournamentState = { id: `swiss-${Date.now()}`, players, rounds: [], totalRounds, finished: false };
  t.rounds.push(pairRound(t));
  return t;
}

export function score(t: TournamentState, id: string): number {
  let s = 0;
  for (const r of t.rounds)
    for (const p of r.pairings) {
      if (p.result === null) continue;
      if (p.white === id) s += p.result;
      if (p.black === id) s += 1 - p.result;
    }
  return s;
}

function opponents(t: TournamentState, id: string): string[] {
  return t.rounds.flatMap((r) => r.pairings.filter((p) => p.white === id || p.black === id).map((p) => (p.white === id ? p.black : p.white)));
}

function whiteCount(t: TournamentState, id: string) {
  return t.rounds.reduce((n, r) => n + r.pairings.filter((p) => p.white === id).length, 0);
}

/** Desempate Buchholz: suma de los puntos de los rivales. */
export function buchholz(t: TournamentState, id: string): number {
  return opponents(t, id).reduce((s, o) => s + score(t, o), 0);
}

export function standings(t: TournamentState) {
  return [...t.players]
    .map((p) => ({ player: p, points: score(t, p.id), buchholz: buchholz(t, p.id), games: opponents(t, p.id).length }))
    .sort((a, b) => b.points - a.points || b.buchholz - a.buchholz || b.player.rating - a.player.rating);
}

function pairRound(t: TournamentState): Round {
  const order = standings(t).map((s) => s.player.id);
  const used = new Set<string>();
  const pairings: Pairing[] = [];
  for (const id of order) {
    if (used.has(id)) continue;
    const played = new Set(opponents(t, id));
    const rival = order.find((o) => o !== id && !used.has(o) && !played.has(o)) ?? order.find((o) => o !== id && !used.has(o));
    if (!rival) break;
    used.add(id).add(rival);
    // Colores: quien ha llevado menos veces blancas, juega con blancas
    const idWhite = whiteCount(t, id) <= whiteCount(t, rival);
    pairings.push({ white: idWhite ? id : rival, black: idWhite ? rival : id, result: null });
  }
  return { number: t.rounds.length + 1, pairings };
}

/** Resultado aleatorio pero coherente con la diferencia de Elo. */
function simulate(white: Player, black: Player): Result {
  const expected = 1 / (1 + 10 ** ((black.rating - white.rating - 35) / 400));
  const drawChance = 0.22;
  const r = Math.random();
  if (r < drawChance) return 0.5;
  return Math.random() < expected ? 1 : 0;
}

export function currentRound(t: TournamentState): Round {
  return t.rounds[t.rounds.length - 1];
}

/** La partida del usuario en la ronda actual (si sigue pendiente). */
export function userPairing(t: TournamentState): Pairing | undefined {
  return currentRound(t).pairings.find((p) => (p.white === "you" || p.black === "you") && p.result === null);
}

/**
 * Registra el resultado del usuario, simula el resto de mesas
 * y abre la siguiente ronda (o cierra el torneo).
 */
export function finishUserGame(t: TournamentState, result: Result, pgn: string): TournamentState {
  const next: TournamentState = structuredClone(t);
  const round = currentRound(next);
  const byId = (id: string) => next.players.find((p) => p.id === id)!;
  for (const p of round.pairings) {
    if (p.white === "you" || p.black === "you") {
      p.result = result;
      p.pgn = pgn;
    } else if (p.result === null) {
      p.result = simulate(byId(p.white), byId(p.black));
    }
  }
  if (next.rounds.length >= next.totalRounds) next.finished = true;
  else next.rounds.push(pairRound(next));
  return next;
}

export const resultLabel = (r: Result | null) => (r === null ? "—" : r === 1 ? "1–0" : r === 0 ? "0–1" : "½–½");
export const pointsLabel = (n: number) => (Number.isInteger(n) ? String(n) : `${Math.floor(n) || ""}½`);
